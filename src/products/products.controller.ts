import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import { Product } from './product.entity';
import { ProductService } from './products.service';
import { CreateProductDto } from './dto/product.dto';

@ApiTags('products')
@Controller('products')
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(private readonly productService: ProductService) {
    this.logger.log('ProductController initialized');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiParam({
    name: 'supabaseUserId',
    description: 'Supabase User ID',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Product successfully created',
    type: Product,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request: Invalid product data',
  })
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @Param('supabaseUserId') supabaseUserId: string,
  ): Promise<Product> {
    this.logger.log(
      `Received product creation request for user: ${supabaseUserId}`,
    );

    try {
      const product = await this.productService.createProduct(
        createProductDto,
        supabaseUserId,
      );

      this.logger.log(
        `Product created successfully. Product ID: ${product.id}`,
      );
      return product;
    } catch (error) {
      this.logger.error(
        `Product creation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
