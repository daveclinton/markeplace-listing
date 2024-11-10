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
  ): Promise<MarketplaceConfig[]> {
    const links = await this.userMarketplaceLinkRepo.find({
      where: { userSupabaseId },
    });

    return this.marketplaceConfig.getAllMarketplaces().map((marketplace) => ({
      ...marketplace,
      is_linked: links.some((link) => link.marketplaceId === marketplace.id),
    }));
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

    // Generate state parameter for CSRF protection
    const state = crypto
      .createHash('sha256')
      .update(`${userSupabaseId}-${Date.now()}`)
      .digest('hex');

    // Store state temporarily (you might want to use Redis or similar for this)
    await this.storeOAuthState(state, userSupabaseId);

    const params = new URLSearchParams({
      client_id: config.oauth.client_id,
      redirect_uri: config.oauth.redirect_uri,
      scope: config.oauth.scope,
      response_type: 'code',
      state,
    });

    return `${config.oauth.oauth_url}?${params.toString()}`;
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

      // Save or update the marketplace link with the new tokens
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
      client_id: config.oauth.client_id,
      client_secret: config.oauth.client_secret,
      redirect_uri: config.oauth.redirect_uri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(config.oauth.token_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Token exchange failed: ${error.error}`);
    }

    return response.json();
  }

  private async storeOAuthState(
    state: string,
    userSupabaseId: string,
  ): Promise<void> {
    // TODO: Implement state storage (e.g., using Redis)
    // This is a placeholder for the state storage implementation
    this.logger.debug(
      `Storing OAuth state for user ${userSupabaseId}: ${state}`,
    );
  }
}
