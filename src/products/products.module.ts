import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from './entities/product.entity';
import { ProductMarketplaceListing } from './entities/product-marketplace-listing.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, ProductMarketplaceListing]),
  ],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class ProductsModule {}
