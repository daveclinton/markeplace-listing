import { Module } from '@nestjs/common';
import { EbayTaxonomyService } from './ebay-taxonomy.service';
import { MarketplaceConfigService } from 'src/marketplaces/marketplaces.config';
import { OAuthTokenRefreshService } from 'src/marketplaces/oauth-token-refresh.service';
import { EbayTaxonomyController } from './ebay-taxonomy.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMarketplaceLink } from 'src/marketplaces/user.marketplace-link.entity';
import { EbayCategoryService } from './ebay.category.service';
import { EbayCategoryController } from './ebay-category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserMarketplaceLink])],
  controllers: [EbayTaxonomyController, EbayCategoryController],
  providers: [
    EbayTaxonomyService,
    MarketplaceConfigService,
    OAuthTokenRefreshService,
    EbayCategoryService,
  ],
  exports: [
    EbayTaxonomyService,
    MarketplaceConfigService,
    OAuthTokenRefreshService,
    EbayCategoryService,
  ],
})
export class EbayTaxonomyModule {}
