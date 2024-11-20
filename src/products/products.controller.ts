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
  @ApiOperation({
    summary: 'Create a new product',
    description:
      'Creates a new product with the provided details including inventory, shipping, and variant information.',
  })
  @ApiHeader({
    name: 'user-supabase-id',
    description: 'Supabase user ID',
    required: true,
    example: 'user123',
  })
  @ApiResponse({
    status: 201,
    description: 'Product has been successfully created.',
    type: Product,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Missing required fields or invalid data.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Category and title are required fields',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @Headers('user-supabase-id') userSupabaseId: string,
  ): Promise<Product> {
    try {
      if (!userSupabaseId) {
        this.logger.error('Missing user-supabase-id header');
        throw new BadRequestException('user-supabase-id header is required');
      }

      console.log(
        'Incoming Payload:',
        JSON.stringify(createProductDto, null, 2),
      );
      this.logger.log('Product Creation Request', {
        payload: createProductDto,
        userSupabaseId,
      });

      return await this.productService.createProduct(
        createProductDto,
        userSupabaseId,
      );
    } catch (error) {
      this.logger.error('Error creating product:', {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        payload: JSON.stringify({
          title: createProductDto?.title,
          category: createProductDto?.category,
          userId: userSupabaseId,
        }),
      });
      throw error;
    }
  }
}
