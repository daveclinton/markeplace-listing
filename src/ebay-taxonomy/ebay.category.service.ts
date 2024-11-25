import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { UserMarketplaceLink } from 'src/marketplaces/user.marketplace-link.entity';
import { MarketplaceConnectionStatusEnums } from 'src/marketplaces/marketplace-connection-status.enum';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class EbayCategoryService {
  constructor(
    @InjectRepository(UserMarketplaceLink)
    private readonly userMarketplaceLinkRepository: Repository<UserMarketplaceLink>,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async getCategoryTree(userSupabaseId: string, marketplaceId: number = 1) {
    const accessToken = await this.getAccessTokenForMarketplace(
      userSupabaseId,
      marketplaceId,
    );

    const treeIdResponse = await axios.get(
      `https://api.sandbox.ebay.com/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id=EBAY_US`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );

    const categoryTreeId = treeIdResponse.data.category_tree_id;

    const categoryTreeResponse = await axios.get(
      `https://api.sandbox.ebay.com/commerce/taxonomy/v1/category_tree/${categoryTreeId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );

    return this.processCategories(categoryTreeResponse.data);
  }

  async getAccessTokenForMarketplace(
    userSupabaseId: string,
    marketplaceId: number,
  ) {
    const marketplaceLink = await this.userMarketplaceLinkRepository.findOne({
      where: {
        userSupabaseId,
        marketplaceId,
        connectionStatus: MarketplaceConnectionStatusEnums.ACTIVE,
      },
    });

    if (!marketplaceLink) {
      throw new Error('No active marketplace connection found');
    }
    if (
      marketplaceLink.tokenExpiresAt &&
      marketplaceLink.tokenExpiresAt < new Date()
    ) {
      await this.refreshAccessToken(marketplaceLink);
    }

    return marketplaceLink.accessToken;
  }

  async refreshAccessToken(marketplaceLink: UserMarketplaceLink) {
    try {
      const tokenResponse = await axios.post(
        'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: marketplaceLink.refreshToken,
          scope: 'https://api.ebay.com/oauth/api_scope',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(
              `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`,
            ).toString('base64')}`,
          },
        },
      );

      marketplaceLink.accessToken = tokenResponse.data.access_token;
      marketplaceLink.tokenExpiresAt = new Date(
        Date.now() + tokenResponse.data.expires_in * 1000,
      );

      await this.userMarketplaceLinkRepository.save(marketplaceLink);
    } catch (error) {
      this.logger.error('Error', error);
      marketplaceLink.connectionStatus =
        MarketplaceConnectionStatusEnums.DISCONNECTED;
      await this.userMarketplaceLinkRepository.save(marketplaceLink);
      throw new Error('Failed to refresh access token');
    }
  }

  processCategories(categoryTree) {
    return categoryTree.categories
      .filter((category) => category.leaf)
      .map((category) => ({
        id: category.category_id,
        name: category.title,
        path: this.getCategoryPath(category, categoryTree.categories),
      }));
  }

  getCategoryPath(category, allCategories) {
    const path = [category.title];
    let parentId = category.parent_category_id;

    while (parentId) {
      const parentCategory = allCategories.find(
        (cat) => cat.category_id === parentId,
      );
      if (!parentCategory) break;

      path.unshift(parentCategory.title);
      parentId = parentCategory.parent_category_id;
    }

    return path.join(' > ');
  }
}
