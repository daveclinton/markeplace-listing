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

    const state = this.generateState(userSupabaseId);
    this.logger.debug(`Generated OAuth state: ${state}`);
    await this.storeOAuthState(state, userSupabaseId);

    if (marketplace === 'ebay') {
      this.logger.debug('Generating eBay-specific OAuth URL');
      const params = new URLSearchParams({
        client_id: config.oauth.client_id,
        response_type: 'code',
        redirect_uri: config.oauth.redirect_uri,
        scope: config.oauth.scope,
        state: state,
      });

      const url = `${config.oauth.oauth_url}?${params.toString()}`;
      this.logger.debug(`Generated eBay OAuth URL: ${url}`);
      return url;
    }

    this.logger.debug('Generating standard OAuth URL');
    const standardParams: Record<string, string> = {
      client_id: config.oauth.client_id,
      redirect_uri: config.oauth.redirect_uri,
      scope: config.oauth.scope,
      response_type: 'code',
      state,
    };

    const url = `${config.oauth.oauth_url}?${new URLSearchParams(standardParams).toString()}`;
    this.logger.debug(`Generated standard OAuth URL: ${url}`);
    return url;
  }

  async handleOAuthCallback(
    marketplace: string,
    code: string,
    userSupabaseId: string,
    state: string,
  ): Promise<void> {
    this.logger.log(
      `Handling OAuth callback for marketplace ${marketplace} and user ${userSupabaseId}`,
    );
    this.logger.log(`Handling OAuth callback for marketplace ${marketplace}`);

    const retrievedUserId = await this.getUserIdFromState(state);
    if (!retrievedUserId || retrievedUserId !== userSupabaseId) {
      this.logger.error(
        `State parameter mismatch. Expected user ID: ${userSupabaseId}, retrieved: ${retrievedUserId}`,
      );
      throw new BadRequestException('Invalid or expired state parameter');
    }
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

  async getUserIdFromState(state: string): Promise<string | null> {
    this.logger.log(`Getting user ID from state: ${state}`);
    try {
      const stateKey = `oauth:state:${state}`;
      this.logger.debug(`Checking cache with key: ${stateKey}`);
      const stateData = await this.cacheService.get(stateKey);
      if (stateData && stateData.userSupabaseId) {
        this.logger.debug('Found user ID in cache');
        return stateData.userSupabaseId;
      }

      this.logger.debug('Cache miss, attempting to extract user ID from state');
      const userIdMatch = state.match(
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/,
      );
      const userId = userIdMatch ? userIdMatch[0] : null;
      this.logger.debug(`Extracted user ID from state: ${userId}`);
      return userId;
    } catch (error) {
      this.logger.error('Error retrieving user ID from state:', error);
      this.logger.error('State parameter:', state);
      this.logger.error(
        'Expected format: UUID (e.g. 12345678-abcd-1234-abcd-1234567890ab)',
      );
      return null;
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

  private generateState(userSupabaseId: string): string {
    this.logger.debug(`Generating state for user: ${userSupabaseId}`);
    return crypto
      .createHash('sha256')
      .update(
        `${userSupabaseId}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`,
      )
      .digest('hex');
  }

  private async storeOAuthState(
    state: string,
    userSupabaseId: string,
  ): Promise<void> {
    this.logger.debug(`Storing OAuth state for user: ${userSupabaseId}`);
    try {
      const stateKey = `oauth:state:${state}`;
      const stateData = {
        userSupabaseId,
        createdAt: Date.now(),
      };
      await this.cacheService.set(stateKey, stateData, 600);
      this.logger.debug('Successfully stored OAuth state');
    } catch (error) {
      this.logger.error('Failed to store OAuth state:', error);
      throw new BadRequestException('Unable to initiate OAuth flow');
    }
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
}
