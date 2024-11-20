import {
  Controller,
  Post,
  Body,
  Headers,
  // Get,
  // Put,
  // Delete,
  // Param,
  // ParseIntPipe,
  // Query,
  BadRequestException,
  // NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { Product } from './product.entity';
import { ProductService } from './products.service';

interface CreateProductDto {
  title: string;
  description: string;
  category: string;
  condition: string;
  basePrice: number;
  pictures: string[];
  specifics: Record<string, any>;
  shipping: {
    service: string;
    cost: string;
    dispatchDays: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: string;
    };
    weight?: {
      value: number;
      unit: string;
    };
  };
  returns: {
    accepted: boolean;
    period: number;
    shippingPaidBy: string;
    restockingFee?: number;
    conditions?: string[];
  };
  inventory: {
    quantity: number;
    lowStockThreshold: number;
    sku: string;
    location?: string;
    autoReorder: boolean;
    reorderQuantity?: number;
  };
  seoMetadata?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  };
  variants?: {
    id: string;
    attributes: Record<string, string>;
    sku: string;
    price: number;
    quantity: number;
  }[];
  bundleInfo?: {
    isBundle: boolean;
    bundledProducts?: {
      productId: number;
      quantity: number;
    }[];
  };
}

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({
    status: 201,
    description: 'Product has been successfully created.',
    type: Product,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @Headers('user-supabase-id') userSupabaseId: string,
  ): Promise<Product> {
    if (!userSupabaseId) {
      throw new BadRequestException('user-supabase-id header is required');
    }
    return this.productService.createProduct(createProductDto, userSupabaseId);
  }

  // @Get()
  // @ApiOperation({ summary: 'Get all products for a user' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Returns all products for the user.',
  //   type: [Product],
  // })
  // async getUserProducts(
  //   @Headers('user-supabase-id') userSupabaseId: string,
  //   @Query('page') page: number = 1,
  //   @Query('limit') limit: number = 10,
  //   @Query('status') status?: string,
  //   @Query('category') category?: string,
  //   @Query('search') search?: string,
  // ) {
  //   if (!userSupabaseId) {
  //     throw new BadRequestException('user-supabase-id header is required');
  //   }

  //   return this.productService.getUserProducts(userSupabaseId, {
  //     page,
  //     limit,
  //     status,
  //     category,
  //     search,
  //   });
  // }

  // @Get(':id')
  // @ApiOperation({ summary: 'Get a product by ID' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Returns the product.',
  //   type: Product,
  // })
  // @ApiResponse({ status: 404, description: 'Product not found.' })
  // async getProduct(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Headers('user-supabase-id') userSupabaseId: string,
  // ): Promise<Product> {
  //   if (!userSupabaseId) {
  //     throw new BadRequestException('user-supabase-id header is required');
  //   }

  //   const product = await this.productService.getProductById(
  //     id,
  //     userSupabaseId,
  //   );
  //   if (!product) {
  //     throw new NotFoundException(`Product with ID ${id} not found`);
  //   }
  //   return product;
  // }

  // @Put(':id')
  // @ApiOperation({ summary: 'Update a product' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Product has been successfully updated.',
  //   type: Product,
  // })
  // @ApiResponse({ status: 404, description: 'Product not found.' })
  // async updateProduct(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() updateProductDto: Partial<CreateProductDto>,
  //   @Headers('user-supabase-id') userSupabaseId: string,
  // ): Promise<Product> {
  //   if (!userSupabaseId) {
  //     throw new BadRequestException('user-supabase-id header is required');
  //   }

  //   return this.productService.updateProduct(
  //     id,
  //     updateProductDto,
  //     userSupabaseId,
  //   );
  // }

  // @Delete(':id')
  // @ApiOperation({ summary: 'Delete a product' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Product has been successfully deleted.',
  // })
  // @ApiResponse({ status: 404, description: 'Product not found.' })
  // async deleteProduct(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Headers('user-supabase-id') userSupabaseId: string,
  // ): Promise<void> {
  //   if (!userSupabaseId) {
  //     throw new BadRequestException('user-supabase-id header is required');
  //   }

  //   await this.productService.deleteProduct(id, userSupabaseId);
  // }
}
