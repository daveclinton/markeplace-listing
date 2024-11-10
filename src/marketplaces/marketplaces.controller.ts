import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MarketplacesService } from './marketplaces.service';

@Controller('marketplaces')
export class MarketplacesController {
  constructor(private readonly marketplacesService: MarketplacesService) {}

  // Get available marketplaces for a user by Supabase ID
  @Get(':userSupabaseId')
  async getMarketplacesForUser(
    @Param('userSupabaseId') userSupabaseId: string,
  ) {
    return this.marketplacesService.getMarketplacesForUser(userSupabaseId);
  }

  // Link or unlink a marketplace by Supabase ID
  @Post(':userSupabaseId/link')
  async linkMarketplace(
    @Param('userSupabaseId') userSupabaseId: string,
    @Body('marketplaceId') marketplaceId: number,
    @Body('link') link: boolean,
  ) {
    await this.marketplacesService.linkMarketplace(
      userSupabaseId,
      marketplaceId,
      link,
    );
    return { message: link ? 'Marketplace linked' : 'Marketplace unlinked' };
  }
}
