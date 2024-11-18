import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MarketplacesService } from './marketplaces.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMarketplaceLink } from './user.marketplace-link.entity';
import { MarketplaceConfigService } from './marketplaces.config';
import { MarketplacesController } from './marketplaces.controller';
import { CacheModuleLocal } from 'src/cache/cache.module';
import { OAuthTokenRefreshService } from './oauth-token-refresh.service';
import { TokenRefreshScheduler } from './token-refresh-scheduler';
// import { ScheduleModule } from '@nestjs/schedule';
import { MarketplaceTokenHelper } from './marketplace-token-helper';

@Module({
  imports: [
    ConfigModule,
    // ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([UserMarketplaceLink]),
    CacheModuleLocal,
  ],
  controllers: [MarketplacesController],
  providers: [
    MarketplaceConfigService,
    MarketplacesService,
    OAuthTokenRefreshService,
    TokenRefreshScheduler,
    MarketplaceTokenHelper,
  ],
  exports: [
    MarketplaceConfigService,
    MarketplacesService,
    OAuthTokenRefreshService,
    MarketplaceTokenHelper,
  ],
})
export class MarketplacesModule {}
