import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as crypto from 'crypto';
import { UserMarketplaceLink } from './user.marketplace-link.enity';
import { MarketplaceConfigService } from './marketplaces.config';
import { MarketplaceConfig, MarketplaceSlug } from './marketplace.types';
import { CacheService } from 'src/cache/cache.service';

interface MarketplaceConfigWithOAuth extends MarketplaceConfig {
  oauth_url?: string;
}
interface StateData {
  userSupabaseId: string;
  timestamp: number;
  nonce: string;
}

@Injectable()
export class MarketplacesService {
  private readonly logger = new Logger(MarketplacesService.name);

  constructor(
    @InjectRepository(UserMarketplaceLink)
    private readonly userMarketplaceLinkRepo: Repository<UserMarketplaceLink>,
    private readonly marketplaceConfig: MarketplaceConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.logger.log('MarketplacesService initialized');
  }

  async getMarketplacesForUser(
    userSupabaseId: string,
  ): Promise<MarketplaceConfigWithOAuth[]> {
    this.logger.log(`Fetching marketplaces for user: ${userSupabaseId}`);
    try {
      const cacheKey = `marketplaces:${userSupabaseId}`;
      this.logger.debug(`Checking cache with key: ${cacheKey}`);
      const cachedMarketplaces = await this.cacheService.get(cacheKey);

      if (cachedMarketplaces) {
        this.logger.debug('Retrieved marketplaces from cache');
        return cachedMarketplaces;
      }

      this.logger.debug('Cache miss, fetching from database');
      const links = await this.userMarketplaceLinkRepo.find({
        where: { userSupabaseId },
      });
      this.logger.debug(`Found ${links.length} marketplace links for user`);

      const marketplaces = await Promise.all(
        this.marketplaceConfig.getAllMarketplaces().map(async (marketplace) => {
          this.logger.debug(`Processing marketplace: ${marketplace.slug}`);
          const link = links.find((l) => l.marketplaceId === marketplace.id);
          const isLinked = Boolean(link?.isLinked);
          this.logger.debug(
            `Marketplace ${marketplace.slug} linked status: ${isLinked}`,
          );

          let oauthUrl: string | undefined;
          if (marketplace.is_supported && !isLinked) {
            try {
              this.logger.debug(
                `Generating OAuth URL for marketplace: ${marketplace.slug}`,
              );
              oauthUrl = await this.generateOAuthUrl(
                marketplace.slug,
                userSupabaseId,
              );
            } catch (error) {
              this.logger.error(
                `Error generating OAuth URL for marketplace ${marketplace.slug}`,
                error,
              );
            }
          }

          return {
            ...marketplace,
            is_linked: isLinked,
            oauth_url: oauthUrl,
          };
        }),
      );

      this.logger.debug(`Caching marketplaces for key: ${cacheKey}`);
      await this.cacheService.set(cacheKey, marketplaces, 300);

      this.logger.log(
        `Successfully fetched ${marketplaces.length} marketplaces for user`,
      );
      return marketplaces;
    } catch (error) {
      this.logger.error(
        `Error fetching marketplaces for user ${userSupabaseId}`,
        error.stack,
      );
      throw new BadRequestException('Failed to fetch marketplaces');
    }
  }

  async linkMarketplace(
    userSupabaseId: string,
    marketplaceId: number,
    link: boolean,
  ): Promise<void> {
    this.logger.log(
      `${link ? 'Linking' : 'Unlinking'} marketplace ${marketplaceId} for user ${userSupabaseId}`,
    );
    try {
      this.logger.debug('Checking for existing marketplace link');
      const existingLink = await this.userMarketplaceLinkRepo.findOne({
        where: { userSupabaseId, marketplaceId },
      });

      if (existingLink) {
        this.logger.debug(
          `Found existing link with status: ${existingLink.isLinked}`,
        );
        if (existingLink.isLinked === link) {
          this.logger.warn(
            `Marketplace is already ${link ? 'linked' : 'unlinked'}`,
          );
          throw new BadRequestException(
            `Marketplace is already ${link ? 'linked' : 'unlinked'}`,
          );
        }

        existingLink.isLinked = link;
        await this.userMarketplaceLinkRepo.save(existingLink);
        this.logger.log('Successfully updated marketplace link');
      } else if (link) {
        this.logger.debug('Creating new marketplace link');
        const newLink = this.userMarketplaceLinkRepo.create({
          userSupabaseId,
          marketplaceId,
          isLinked: true,
        });
        await this.userMarketplaceLinkRepo.save(newLink);
        this.logger.log('Successfully created new marketplace link');
      } else {
        this.logger.warn('Attempted to unlink non-existent marketplace link');
        throw new NotFoundException('Marketplace link not found');
      }
    } catch (error) {
      this.logger.error(
        `Error ${link ? 'linking' : 'unlinking'} marketplace: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async generateOAuthUrl(
    marketplace: MarketplaceSlug,
    userSupabaseId: string,
  ): Promise<string> {
    this.logger.log(
      `Generating OAuth URL for marketplace ${marketplace} and user ${userSupabaseId}`,
    );
    const config = this.marketplaceConfig.getMarketplaceConfig(marketplace);
    if (!config) {
      this.logger.error(`Marketplace config not found for ${marketplace}`);
      throw new NotFoundException(`Marketplace ${marketplace} not found`);
    }

    const state = userSupabaseId;
    this.logger.debug(`Generated OAuth state: ${state}`);

    const params = new URLSearchParams({
      client_id: config.oauth.client_id,
      response_type: 'code',
      redirect_uri: `${config.oauth.redirect_uri}`,
      scope: config.oauth.scope,
      state: userSupabaseId,
    });

    if (config.oauth.additional_params) {
      for (const [key, value] of Object.entries(
        config.oauth.additional_params,
      )) {
        params.append(key, value);
      }
    }

    const url = `${config.oauth.oauth_url}?${params.toString()}`;
    this.logger.debug(`Generated OAuth URL: ${url}`);
    return url;
  }

  async handleOAuthCallback(
    marketplace: string,
    code: string,
    state: string,
  ): Promise<void> {
    this.logger.log(`Handling OAuth callback for marketplace: ${marketplace}`);
    this.logger.debug(`OAuth callback params - State: ${state}, Code: ${code}`);

    try {
      this.logger.debug(`Verifying marketplace ${marketplace} support`);
      if (
        !this.marketplaceConfig.isMarketplaceSupported(
          marketplace as MarketplaceSlug,
        )
      ) {
        this.logger.warn(`Unsupported marketplace in callback: ${marketplace}`);
        throw new NotFoundException(`Marketplace ${marketplace} not found`);
      }

      const urlParams = new URLSearchParams(this.getURLParams(marketplace));
      const userSupabaseId = urlParams.get('state');
      if (!userSupabaseId) {
        this.logger.warn(`No user ID found in the URL parameters`);
        throw new BadRequestException('Invalid or missing user ID');
      }

      this.logger.debug(
        `Processing OAuth callback for marketplace: ${marketplace}, user: ${userSupabaseId}`,
      );
      await this.processOAuthCallback(marketplace, code, userSupabaseId);
    } catch (error) {
      this.logger.error(
        `OAuth callback error for marketplace ${marketplace}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getUserIdFromState(state: string): Promise<string> {
    this.logger.log('Getting user ID from state');

    try {
      // First try to get from cache
      const stateKey = `oauth:state:${state}`;
      const cachedState = await this.cacheService.get(stateKey);

      if (cachedState?.userSupabaseId) {
        // Clear the used state from cache
        await this.cacheService.delete(stateKey);
        return cachedState.userSupabaseId;
      }

      // If not in cache, decrypt the state
      const [ivHex, encryptedData] = state.split(':');

      if (!ivHex || !encryptedData) {
        throw new BadRequestException('Invalid state format');
      }

      const key = Buffer.from(
        process.env.STATE_ENCRYPTION_KEY || crypto.randomBytes(32),
      );
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const stateData: StateData = JSON.parse(decrypted);

      // Verify timestamp is not too old (e.g., 10 minutes)
      const maxAge = 10 * 60 * 1000; // 10 minutes in milliseconds
      if (Date.now() - stateData.timestamp > maxAge) {
        throw new BadRequestException('State has expired');
      }

      return stateData.userSupabaseId;
    } catch (error) {
      this.logger.error('Error processing state:', error);
      throw new BadRequestException('Invalid or expired state parameter');
    }
  }

  private async exchangeCodeForToken(
    config: MarketplaceConfig,
    code: string,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    this.logger.log(`Exchanging code for token for marketplace ${config.slug}`);
    if (config.slug === 'ebay') {
      return this.exchangeEbayCodeForToken(config, code);
    }

    this.logger.debug('Using standard OAuth token exchange');
    const params = new URLSearchParams({
      code,
      redirect_uri: config.oauth.redirect_uri,
      grant_type: 'authorization_code',
    });
    if (config.oauth.scope) {
      params.append('scope', config.oauth.scope);
    }

    const authHeader = `Basic ${Buffer.from(
      `${config.oauth.client_id}:${config.oauth.client_secret}`,
    ).toString('base64')}`;

    this.logger.debug(`Making token request to: ${config.oauth.token_url}`);
    const response = await fetch(config.oauth.token_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: authHeader,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }));
      this.logger.error('Token exchange failed:', error);
      throw new Error(`Token exchange failed: ${error.error || error}`);
    }

    this.logger.debug('Successfully exchanged code for token');
    return response.json();
  }

  async exchangeEbayCodeForToken(
    config: MarketplaceConfig,
    code: string,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    this.logger.log('Exchanging eBay code for token');
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.oauth.redirect_uri,
      });

      const authHeader = `Basic ${Buffer.from(
        `${config.oauth.client_id}:${config.oauth.client_secret}`,
      ).toString('base64')}`;

      this.logger.debug(
        `Making eBay token request to: ${config.oauth.token_url}`,
      );
      this.logger.debug(
        `Auth header (partially masked): Basic ${authHeader.substring(6, 15)}...`,
      );

      const response = await fetch(config.oauth.token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: authHeader,
          Accept: 'application/json',
        },
        body: params.toString(),
      });

      const responseText = await response.text();
      this.logger.debug(`eBay token response status: ${response.status}`);
      this.logger.debug(`eBay token response: ${responseText}`);

      if (!response.ok) {
        throw new Error(`eBay token exchange failed: ${responseText}`);
      }

      const tokenData = JSON.parse(responseText);
      this.logger.debug('Successfully exchanged eBay code for token');
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: parseInt(tokenData.expires_in, 10),
      };
    } catch (error) {
      this.logger.error('Error exchanging eBay code for token:', error);
      throw new BadRequestException(
        `Failed to exchange eBay code for token: ${error.message}`,
      );
    }
  }

  private async processOAuthCallback(
    marketplace: string,
    code: string,
    userSupabaseId: string,
  ): Promise<void> {
    this.logger.log(
      `Processing OAuth callback for marketplace ${marketplace} and user ${userSupabaseId}`,
    );

    const config = this.marketplaceConfig.getMarketplaceConfig(
      marketplace as MarketplaceSlug,
    );
    if (!config) {
      this.logger.error(`Marketplace config not found for ${marketplace}`);
      throw new NotFoundException(`Marketplace ${marketplace} not found`);
    }

    try {
      this.logger.debug('Exchanging code for token');
      const tokenResponse = await this.exchangeCodeForToken(config, code);
      this.logger.debug('Successfully exchanged code for token');

      this.logger.debug('Saving marketplace link with token');
      await this.userMarketplaceLinkRepo.save({
        userSupabaseId,
        marketplaceId: config.id,
        isLinked: true,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      });
      this.logger.log('Successfully completed OAuth flow');
    } catch (error) {
      this.logger.error('Failed to complete OAuth flow:', error);
      throw new BadRequestException('Failed to complete OAuth flow');
    }
  }

  private getURLParams(marketplace: string): string {
    const config = this.marketplaceConfig.getMarketplaceConfig(
      marketplace as MarketplaceSlug,
    );
    if (!config) {
      throw new NotFoundException(`Marketplace ${marketplace} not found`);
    }

    const url = new URL(config.oauth.redirect_uri);
    return url.search;
  }
}
