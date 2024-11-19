import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { AppService } from './app.service';
import { MarketplacesModule } from './marketplaces/marketplaces.module';
import { CacheModuleLocal } from './cache/cache.module';
import { ImagesModule } from './images/images.module';
import { ProductsModule } from './products/products.module';
import { EbayTaxonomyController } from './ebay-taxonomy/ebay-taxonomy.controller';
import { EbayTaxonomyModule } from './ebay-taxonomy/ebay-taxonomy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('SUPABASE_DB_HOST'),
        port: configService.get<number>('SUPABASE_DB_PORT'),
        username: configService.get<string>('SUPABASE_DB_USER'),
        password: configService.get<string>('SUPABASE_DB_PASSWORD'),
        database: configService.get<string>('SUPABASE_DB_NAME'),
        // ssl: {
        //   rejectUnauthorized: true,
        // },
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    MarketplacesModule,
    CacheModuleLocal,
    ImagesModule,
    ProductsModule,
    EbayTaxonomyModule,
  ],
  controllers: [AppController, EbayTaxonomyController],
  providers: [AppService, Logger],
})
export class AppModule {}
