// marketplaces.service.ts
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
  ) {}

  async getMarketplacesForUser(
    userSupabaseId: string,
  ): Promise<MarketplaceConfigWithOAuth[]> {
    try {
      const links = await this.userMarketplaceLinkRepo.find({
        where: { userSupabaseId },
      });

      const marketplaces = await Promise.all(
        this.marketplaceConfig.getAllMarketplaces().map(async (marketplace) => {
          const link = links.find((l) => l.marketplaceId === marketplace.id);
          const isLinked = Boolean(link?.isLinked);

          // Generate OAuth URL for supported and unlinked marketplaces
          let oauthUrl: string | undefined;
          if (marketplace.is_supported && !isLinked) {
            try {
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
    try {
      const existingLink = await this.userMarketplaceLinkRepo.findOne({
        where: { userSupabaseId, marketplaceId },
      });

      if (existingLink) {
        if (existingLink.isLinked === link) {
          throw new BadRequestException(
            `Marketplace is already ${link ? 'linked' : 'unlinked'}`,
          );
        }

        existingLink.isLinked = link;
        await this.userMarketplaceLinkRepo.save(existingLink);
      } else if (link) {
        // Only create new link if we're linking (not unlinking)
        const newLink = this.userMarketplaceLinkRepo.create({
          userSupabaseId,
          marketplaceId,
          isLinked: true,
        });
        await this.userMarketplaceLinkRepo.save(newLink);
      } else {
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
    const config = this.marketplaceConfig.getMarketplaceConfig(marketplace);
    if (!config) {
      throw new NotFoundException(`Marketplace ${marketplace} not found`);
    }
    const state = this.generateState(userSupabaseId);
    await this.storeOAuthState(state, userSupabaseId);

    if (marketplace === 'ebay') {
      const params = new URLSearchParams({
        client_id: config.oauth.client_id,
        response_type: 'code',
        redirect_uri: config.oauth.redirect_uri,
        scope: config.oauth.scope,
        state: state,
      });

      return `${config.oauth.oauth_url}?${params.toString()}`;
    }
    const standardParams: Record<string, string> = {
      client_id: config.oauth.client_id,
      redirect_uri: config.oauth.redirect_uri,
      scope: config.oauth.scope,
      response_type: 'code',
      state,
    };

    return `${config.oauth.oauth_url}?${new URLSearchParams(standardParams).toString()}`;
  }

  async handleOAuthCallback(
    marketplace: string,
    code: string,
    userSupabaseId: string,
  ): Promise<void> {
    const config = this.marketplaceConfig.getMarketplaceConfig(
      marketplace as MarketplaceSlug,
    );
    if (!config) {
      throw new NotFoundException(`Marketplace ${marketplace} not found`);
    }

    try {
      const tokenResponse = await this.exchangeCodeForToken(config, code);
      await this.userMarketplaceLinkRepo.save({
        userSupabaseId,
        marketplaceId: config.id,
        isLinked: true,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      });
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Failed to complete OAuth flow');
    }
  }

  async getUserIdFromState(state: string): Promise<string | null> {
    try {
      // Since the Redis implementation is commented out, let's use a temporary
      // solution to extract the user ID from the state parameter directly
      // In production, you should use Redis or another storage solution
      const stateKey = `oauth:state:${state}`;

      console.log(stateKey);

      // For debugging
      this.logger.debug(`Attempting to retrieve user ID for state: ${state}`);

      // TODO: Replace this with proper state storage/retrieval
      // For now, we'll assume the state is valid and extract the user ID
      // from the beginning of the hash (this is temporary and not secure)
      const userIdMatch = state.match(
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/,
      );
      if (userIdMatch) {
        return userIdMatch[0];
      }

      return null;
    } catch (error) {
      this.logger.error('Error retrieving user ID from state:', error);
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
    if (config.slug === 'ebay') {
      return this.exchangeEbayCodeForToken(config, code);
    }

    // Original OAuth flow for other marketplaces
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
      throw new Error(`Token exchange failed: ${error.error || error}`);
    }

    return response.json();
  }

  private generateState(userSupabaseId: string): string {
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
    try {
      const stateKey = `oauth:state:${state}`;
      const stateData = {
        userSupabaseId,
        createdAt: Date.now(),
      };
      console.log(stateData, stateKey);

      // await this.redis.set(
      //   stateKey,
      //   JSON.stringify(stateData),
      //   'EX',
      //   600, // 10 minutes
      // );
    } catch (error) {
      this.logger.error('Failed to store OAuth state', error);
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
        `Exchanging code for token with eBay URL: ${config.oauth.token_url}`,
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
