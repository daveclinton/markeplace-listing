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
    marketplace: MarketplaceSlug,
    code: string,
    userSupabaseId: string,
  ): Promise<void> {
    const config = this.marketplaceConfig.getMarketplaceConfig(marketplace);
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
      this.logger.error(
        `Error handling OAuth callback for ${marketplace}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to complete OAuth flow');
    }
  }

  async getMarketplaceStatus(
    marketplace: MarketplaceSlug,
    userSupabaseId: string,
  ): Promise<{
    isLinked: boolean;
    tokenStatus: 'valid' | 'expired' | 'none';
    expiresAt?: Date;
  }> {
    const config = this.marketplaceConfig.getMarketplaceConfig(marketplace);
    if (!config) {
      throw new NotFoundException(`Marketplace ${marketplace} not found`);
    }

    const link = await this.userMarketplaceLinkRepo.findOne({
      where: {
        userSupabaseId,
        marketplaceId: config.id,
      },
    });

    if (!link) {
      return {
        isLinked: false,
        tokenStatus: 'none',
      };
    }

    const now = new Date();
    const tokenStatus = !link.tokenExpiresAt
      ? 'none'
      : link.tokenExpiresAt > now
        ? 'valid'
        : 'expired';

    return {
      isLinked: link.isLinked,
      tokenStatus,
      expiresAt: link.tokenExpiresAt,
    };
  }

  private async exchangeCodeForToken(
    config: MarketplaceConfig,
    code: string,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
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
}
