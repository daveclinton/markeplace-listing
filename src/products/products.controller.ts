import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Product } from './product.entity';
import { ProductService } from './products.service';
import { CreateProductDto } from './product.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.logger.info('ProductController initialized');
  }

  @Post()
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @Headers('user-supabase-id') userSupabaseId: string,
  ): Promise<CreateProductDto> {
    try {
      // Explicit validation before processing
      if (!createProductDto.title || !createProductDto.category) {
        this.logger.warn('Missing required product fields', {
          dto: createProductDto,
          userSupabaseId,
        });
        throw new BadRequestException('Category and title are required fields');
      }

      if (!userSupabaseId) {
        this.logger.error('Missing user-supabase-id header');
        throw new BadRequestException('user-supabase-id header is required');
      }

      this.logger.info('Product Creation Request', {
        payload: createProductDto,
        userSupabaseId,
      });

      return await this.productService.createProduct(
        createProductDto,
        userSupabaseId,
      );
    } catch (error) {
      // Log the full error details
      this.logger.error('Error creating product', {
        error: error.message,
        stack: error.stack,
        payload: createProductDto,
        userSupabaseId,
      });

      // Rethrow or throw a specific error
      throw error;
    }
  }
}
