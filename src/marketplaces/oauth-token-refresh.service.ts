import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UserMarketplaceLink } from './user.marketplace-link.entity';
import { MarketplaceConfigService } from './marketplaces.config';
import { MarketplaceConnectionStatusEnums } from './marketplace-connection-status.enum';
import { MarketplaceConfig, MarketplaceSlug } from './marketplace.types';

@Injectable()
export class OAuthTokenRefreshService {
  private readonly logger = new Logger(OAuthTokenRefreshService.name);

  constructor(
    @InjectRepository(UserMarketplaceLink)
    private readonly userMarketplaceLinkRepo: Repository<UserMarketplaceLink>,
    private readonly marketplaceConfig: MarketplaceConfigService,
  ) {}

  async refreshTokenIfNeeded(
    userSupabaseId: string,
    marketplaceSlug: MarketplaceSlug,
  ): Promise<void> {
    this.logger.debug(
      `Checking if token refresh needed for user ${userSupabaseId} and marketplace ${marketplaceSlug}`,
    );

    const config = this.marketplaceConfig.getMarketplaceConfig(marketplaceSlug);
    if (!config) {
      throw new BadRequestException(`Marketplace ${marketplaceSlug} not found`);
    }

    const link = await this.userMarketplaceLinkRepo.findOne({
      where: {
        userSupabaseId,
        marketplaceId: config.id,
      },
    });

    if (!link) {
      throw new BadRequestException('Marketplace connection not found');
    }

    // Check if token expires in the next 5 minutes
    const expiresInFiveMinutes = new Date(Date.now() + 5 * 60 * 1000);
    if (link.tokenExpiresAt && link.tokenExpiresAt < expiresInFiveMinutes) {
      await this.refreshToken(link, config);
    }
  }

  async refreshExpiredTokens(): Promise<void> {
    this.logger.debug('Starting batch refresh of expired tokens');

    try {
      const expiringLinks = await this.userMarketplaceLinkRepo.find({
        where: {
          tokenExpiresAt: LessThan(new Date(Date.now() + 5 * 60 * 1000)),
          connectionStatus: MarketplaceConnectionStatusEnums.ACTIVE,
        },
      });

      for (const link of expiringLinks) {
        const config = this.marketplaceConfig
          .getAllMarketplaces()
          .find((m) => m.id === link.marketplaceId);

        if (config) {
          try {
            await this.refreshToken(link, config);
          } catch (error) {
            this.logger.error(
              `Failed to refresh token for user ${link.userSupabaseId} and marketplace ${config.slug}`,
              error.stack,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Error during batch token refresh:', error.stack);
    }
  }

  private async refreshToken(
    link: UserMarketplaceLink,
    config: MarketplaceConfig,
  ): Promise<void> {
    this.logger.debug(
      `Refreshing token for user ${link.userSupabaseId} and marketplace ${config.slug}`,
    );

    try {
      if (!link.refreshToken) {
        throw new Error('No refresh token available');
      }

      const tokenResponse = await this.exchangeRefreshToken(
        config,
        link.refreshToken,
      );

      await this.userMarketplaceLinkRepo.update(
        {
          userSupabaseId: link.userSupabaseId,
          marketplaceId: config.id,
        },
        {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token || link.refreshToken,
          tokenExpiresAt: new Date(
            Date.now() + tokenResponse.expires_in * 1000,
          ),
          connectionStatus: MarketplaceConnectionStatusEnums.ACTIVE,
          errorMessage: null,
        },
      );

      this.logger.debug(
        `Successfully refreshed token for user ${link.userSupabaseId} and marketplace ${config.slug}`,
      );
    } catch (error) {
      this.logger.error(
        `Token refresh failed for user ${link.userSupabaseId} and marketplace ${config.slug}:`,
        error.stack,
      );

      await this.userMarketplaceLinkRepo.update(
        {
          userSupabaseId: link.userSupabaseId,
          marketplaceId: config.id,
        },
        {
          connectionStatus: MarketplaceConnectionStatusEnums.DISCONNECTED,
          errorMessage: `Token refresh failed: ${error.message}`,
        },
      );

      throw error;
    }
  }

  private async exchangeRefreshToken(
    config: MarketplaceConfig,
    refreshToken: string,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    const isEbay = config.slug === 'ebay';

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      ...(isEbay && {
        scope: config.oauth.scope,
      }),
    });

    const authHeader = `Basic ${Buffer.from(
      `${config.oauth.client_id}:${config.oauth.client_secret}`,
    ).toString('base64')}`;

    const response = await fetch(config.oauth.token_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: authHeader,
        ...(isEbay && { Accept: 'application/json' }),
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${errorText}`);
    }

    return response.json();
  }
}
