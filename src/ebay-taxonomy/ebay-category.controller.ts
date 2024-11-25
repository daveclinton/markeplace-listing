import { Controller, Get, Query } from '@nestjs/common';
import { EbayCategoryService } from './ebay.category.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('ebay')
@Controller('ebay-categories')
export class EbayCategoryController {
  constructor(private readonly ebayCategoryService: EbayCategoryService) {}

  @Get('tree')
  async getCategoryTree(
    @Query('userSupabaseId') userSupabaseId: string,
    @Query('marketplaceId') marketplaceId?: number,
  ) {
    return this.ebayCategoryService.getCategoryTree(
      userSupabaseId,
      marketplaceId,
    );
  }

  @Get('access-token')
  async getAccessToken(
    @Query('userSupabaseId') userSupabaseId: string,
    @Query('marketplaceId') marketplaceId: number,
  ) {
    return this.ebayCategoryService.getAccessTokenForMarketplace(
      userSupabaseId,
      marketplaceId,
    );
  }
}
