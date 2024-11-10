import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import {
  createSupportedMarketplaces,
  MarketplaceConfig,
} from './marketplaces.config';
import { UserMarketplaceLink } from './user.marketplace-link.enity';

@Injectable()
export class MarketplacesService {
  private supportedMarketplaces: MarketplaceConfig[];

  constructor(
    @InjectRepository(UserMarketplaceLink)
    private userMarketplaceLinkRepository: Repository<UserMarketplaceLink>,
    private configService: ConfigService,
  ) {
    // Generate SUPPORTED_MARKETPLACES dynamically
    this.supportedMarketplaces = createSupportedMarketplaces(
      this.configService,
    );
  }

  async getMarketplacesForUser(
    userSupabaseId: string,
  ): Promise<MarketplaceConfig[]> {
    const userLinks = await this.userMarketplaceLinkRepository.find({
      where: { userSupabaseId },
    });

    return this.supportedMarketplaces.map((marketplace) => {
      const link = userLinks.find((ul) => ul.marketplaceId === marketplace.id);
      return {
        ...marketplace,
        is_linked: link ? link.isLinked : false,
      };
    });
  }

  async linkMarketplace(
    userSupabaseId: string,
    marketplaceId: number,
    link: boolean,
  ): Promise<void> {
    let userLink = await this.userMarketplaceLinkRepository.findOne({
      where: { userSupabaseId, marketplaceId },
    });

    if (userLink) {
      userLink.isLinked = link;
    } else {
      userLink = this.userMarketplaceLinkRepository.create({
        userSupabaseId,
        marketplaceId,
        isLinked: link,
      });
    }
    await this.userMarketplaceLinkRepository.save(userLink);
  }
}
