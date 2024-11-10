// marketplaces.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplacesService } from './marketplaces.service';
import { MarketplacesController } from './marketplaces.controller';
import { UserMarketplaceLink } from './user.marketplace-link.enity';

@Module({
  imports: [TypeOrmModule.forFeature([UserMarketplaceLink])],
  providers: [MarketplacesService],
  controllers: [MarketplacesController],
})
export class MarketplacesModule {}
