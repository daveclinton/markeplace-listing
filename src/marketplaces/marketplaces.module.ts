import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MarketplacesService } from './marketplaces.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMarketplaceLink } from './user.marketplace-link.enity';
import { MarketplaceConfigService } from './marketplaces.config';
import { MarketplacesController } from './marketplaces.controller';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([UserMarketplaceLink])],
  controllers: [MarketplacesController],
  providers: [MarketplaceConfigService, MarketplacesService],
  exports: [MarketplaceConfigService, MarketplacesService],
})
export class MarketplacesModule {}