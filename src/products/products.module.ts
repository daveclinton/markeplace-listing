import { Module } from '@nestjs/common';

import { ProductsController } from './products.controller';
import { ProductService } from './products.service';

@Module({
  providers: [ProductService],
  controllers: [ProductsController],
})
export class ProductsModule {}
