import {
  Controller,
  Post,
  Body,
  Headers,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

import { Product } from './product.entity';
import { ProductsService } from './products.service';
import { ProductCreationDto } from './dto/product.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiHeader({
    name: 'x-supabase-user-id',
    description: 'Supabase User ID',
    required: true,
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createProduct(
    @Headers('x-supabase-user-id') supabaseUserId: string,
    @Body() productData: ProductCreationDto,
  ): Promise<Product> {
    if (!supabaseUserId) {
      throw new BadRequestException('Supabase User ID is required');
    }
    return this.productService.createProduct(supabaseUserId, productData);
  }
}
