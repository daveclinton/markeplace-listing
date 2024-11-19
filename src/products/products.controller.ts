import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';

import {
  CreateProductDto,
  SearchProductDto,
  UpdateProductDto,
} from './dto/product.dto';
import { Product } from './entities/product.entity';
import { ProductService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createProduct(
    @Param('userId') userSupabaseId: string,
    @Body() createProductDto: CreateProductDto,
  ): Promise<Product> {
    return this.productService.createProduct(createProductDto, userSupabaseId);
  }

  @Get()
  @ApiOperation({ summary: 'Search products with advanced filtering' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async searchProducts(
    @Query() searchDto: SearchProductDto,
  ): Promise<{ products: Product[]; total: number }> {
    return this.productService.searchProducts(searchDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retrieve a specific product for the authenticated user',
    description: 'Fetches a product by ID, ensuring the user owns the product',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the product to retrieve',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    description: 'User Id of user to identify',
  })
  @ApiOkResponse({
    description: 'Product successfully retrieved',
    type: Product,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async getProductById(
    @Param('userId') userSupabaseId: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Product> {
    return this.productService.getProductByIdForUser(id, userSupabaseId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiParam({ name: 'id', type: 'number' })
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    userId: string,
  ): Promise<Product> {
    return this.productService.updateProduct(id, updateProductDto, userId);
  }
}
