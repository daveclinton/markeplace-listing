import { Injectable, BadRequestException } from '@nestjs/common';
import { MarketplacesService } from './marketplaces.service';

@Injectable()
export class MarketplaceTokenHelper {
  constructor(private readonly marketplacesService: MarketplacesService) {}

  async getAccessToken(
    userSupabaseId: string,
    marketplaceId: number,
  ): Promise<string> {
    const link = await this.marketplacesService.getActiveMarketplaceLink(
      userSupabaseId,
      marketplaceId,
    );

    if (!link.accessToken) {
      throw new BadRequestException('No access token available');
    }

    return link.accessToken;
  }
}

// // Example usage in a service
// @Injectable()
// export class SomeMarketplaceService {
//   constructor(private readonly marketplaceTokenHelper: MarketplaceTokenHelper) {}

//   async someMarketplaceOperation(userSupabaseId: string, marketplaceId: number) {
//     const accessToken = await this.marketplaceTokenHelper.getAccessToken(
//       userSupabaseId,
//       marketplaceId,
//     );

//     // Use the access token for API calls
//     // The token will be automatically refreshed if needed
//   }
// }
