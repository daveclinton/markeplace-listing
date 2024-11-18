import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserMarketplaceLink } from './user.marketplace-link.entity';
import { MarketplaceConfigService } from './marketplaces.config';
import {
  MarketplaceConfig,
  MarketplaceSlug,
  MarketplaceStatus,
} from './marketplace.types';
import { CacheService } from 'src/cache/cache.service';
import { MarketplaceConnectionStatusEnums } from './marketplace-connection-status.enum';
import { OAuthTokenRefreshService } from './oauth-token-refresh.service';

@Injectable()
export class MarketplacesService {
  private readonly logger = new Logger(MarketplacesService.name);

  constructor(
    @InjectRepository(UserMarketplaceLink)
    private readonly userMarketplaceLinkRepo: Repository<UserMarketplaceLink>,
    private readonly marketplaceConfig: MarketplaceConfigService,
    private readonly cacheService: CacheService,
    private readonly oauthTokenRefresh: OAuthTokenRefreshService,
  ) {
    this.logger.log('MarketplacesService initialized');
  }

  async getMarketplacesForUser(
    userSupabaseId: string,
  ): Promise<MarketplaceStatus[]> {
    this.logger.log(`Fetching marketplaces for user: ${userSupabaseId}`);
    try {
      const cacheKey = `marketplaces:${userSupabaseId}`;
      const cachedMarketplaces = await this.cacheService.get(cacheKey);

      if (cachedMarketplaces) {
        return cachedMarketplaces;
      }

      const links = await this.userMarketplaceLinkRepo.find({
        where: { userSupabaseId },
      });

      const marketplaces = await Promise.all(
        this.marketplaceConfig.getAllMarketplaces().map(async (marketplace) => {
          const link = links.find((l) => l.marketplaceId === marketplace.id);

          let connectionStatus = MarketplaceConnectionStatusEnums.DISCONNECTED;
          let oauthUrl: string | undefined;

          if (!marketplace.is_supported) {
            connectionStatus = MarketplaceConnectionStatusEnums.NOT_SUPPORTED;
          } else if (link) {
            connectionStatus = link.connectionStatus;
          } else if (marketplace.is_supported) {
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
            marketplace,
            connectionStatus,
            lastSyncAt: link?.lastSyncAt,
            errorMessage: link?.errorMessage,
            oauth_url: oauthUrl,
          };
        }),
      );

      await this.cacheService.set(cacheKey, marketplaces, 300);
      return marketplaces;
    } catch (error) {
      this.logger.error(
        `Error fetching marketplaces for user ${userSupabaseId}`,
        error.stack,
      );
      throw new BadRequestException('Failed to fetch marketplaces');
    }
  }

  async updateMarketplaceStatus(
    userSupabaseId: string,
    marketplaceId: number,
    status: MarketplaceConnectionStatusEnums,
    errorMessage?: string,
  ): Promise<void> {
    this.logger.log(
      `Updating marketplace ${marketplaceId} status to ${status} for user ${userSupabaseId}`,
    );

    try {
      // Validate marketplace exists in config
      const marketplace = this.marketplaceConfig
        .getAllMarketplaces()
        .find((m) => m.id === marketplaceId);

      if (!marketplace) {
        this.logger.error(
          `Marketplace with id ${marketplaceId} not found in config`,
        );
        throw new BadRequestException(
          `Marketplace with id ${marketplaceId} not found`,
        );
      }

      try {
        // Find existing record
        let link = await this.userMarketplaceLinkRepo.findOne({
          where: { userSupabaseId, marketplaceId },
        });

        // Prepare update data
        const updateData = {
          connectionStatus: status,
          errorMessage,
          ...(status === MarketplaceConnectionStatusEnums.ACTIVE && {
            lastSyncAt: new Date(),
          }),
        };

        if (!link) {
          this.logger.debug(
            `No existing link found. Creating new marketplace link for user ${userSupabaseId} and marketplace ${marketplaceId}`,
          );

          link = this.userMarketplaceLinkRepo.create({
            userSupabaseId,
            marketplaceId,
            ...updateData,
          });
        } else {
          this.logger.debug(
            `Updating existing marketplace link for user ${userSupabaseId} and marketplace ${marketplaceId}`,
          );

          Object.assign(link, updateData);
        }
        await this.userMarketplaceLinkRepo.save(link);
        await this.cacheService.delete(`marketplaces:${userSupabaseId}`);

        this.logger.debug(
          `Successfully updated status to ${status} for marketplace ${marketplaceId} and user ${userSupabaseId}`,
        );
      } catch (dbError) {
        this.logger.error(
          `Database error while updating marketplace link: ${dbError.message}`,
          dbError.stack,
        );

        if (dbError.code === '23503') {
          throw new BadRequestException(
            'Invalid user ID or marketplace ID. Please ensure both exist.',
          );
        }

        throw new BadRequestException(
          `Failed to update marketplace status: ${dbError.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error updating marketplace status: ${error.message}`,
        error.stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update marketplace status: ${error.message}`,
      );
    }
  }

  async generateOAuthUrl(
    marketplace: MarketplaceSlug,
    userSupabaseId: string,
  ): Promise<string> {
    const config = this.marketplaceConfig.getMarketplaceConfig(marketplace);
    const state = userSupabaseId;

    const params = new URLSearchParams({
      client_id: config.oauth.client_id,
      response_type: 'code',
      redirect_uri: `${config.oauth.redirect_uri}`,
      scope: config.oauth.scope,
      state: state,
    });

    if (config.oauth.additional_params) {
      for (const [key, value] of Object.entries(
        config.oauth.additional_params,
      )) {
        params.append(key, value);
      }
    }

    const url = `${config.oauth.oauth_url}?${params.toString()}`;
    return url;
  }

  async handleOAuthCallback(
    marketplace: string,
    code: string,
    redirect_state: string,
  ): Promise<void> {
    await this.processOAuthCallback(marketplace, code, redirect_state);
  }

  private async processOAuthCallback(
    marketplace: string,
    code: string,
    userSupabaseId: string,
  ): Promise<void> {
    const config = this.marketplaceConfig.getMarketplaceConfig(
      marketplace as MarketplaceSlug,
    );

    try {
      const tokenResponse = await this.exchangeCodeForToken(config, code);

      // First try to find an existing record
      const existingLink = await this.userMarketplaceLinkRepo.findOne({
        where: {
          userSupabaseId,
          marketplaceId: config.id,
        },
      });

      const tokenData = {
        connectionStatus: MarketplaceConnectionStatusEnums.ACTIVE,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        lastSyncAt: new Date(),
        errorMessage: null,
      };

      if (existingLink) {
        // Update existing record
        this.logger.debug(
          `Updating existing marketplace link for user ${userSupabaseId} and marketplace ${config.id}`,
        );

        await this.userMarketplaceLinkRepo.update(
          {
            userSupabaseId,
            marketplaceId: config.id,
          },
          tokenData,
        );
      } else {
        // Create new record
        this.logger.debug(
          `Creating new marketplace link for user ${userSupabaseId} and marketplace ${config.id}`,
        );

        await this.userMarketplaceLinkRepo.save({
          userSupabaseId,
          marketplaceId: config.id,
          ...tokenData,
        });
      }

      await this.cacheService.delete(`marketplaces:${userSupabaseId}`);
    } catch (error) {
      this.logger.error(
        `Error processing OAuth callback for marketplace ${marketplace}:`,
        error.stack,
      );

      await this.updateMarketplaceStatus(
        userSupabaseId,
        config.id,
        MarketplaceConnectionStatusEnums.DISCONNECTED,
        error.message,
      );
      throw error;
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

  async getActiveMarketplaceLink(
    userSupabaseId: string,
    marketplaceId: number,
  ): Promise<UserMarketplaceLink> {
    const link = await this.userMarketplaceLinkRepo.findOne({
      where: {
        userSupabaseId,
        marketplaceId,
        connectionStatus: MarketplaceConnectionStatusEnums.ACTIVE,
      },
    });

    if (!link) {
      throw new BadRequestException(
        'Marketplace connection not found or inactive',
      );
    }

    const marketplace = this.marketplaceConfig
      .getAllMarketplaces()
      .find((m) => m.id === marketplaceId);
    await this.oauthTokenRefresh.refreshTokenIfNeeded(
      userSupabaseId,
      marketplace.slug,
    );

    return link;
  }
}
