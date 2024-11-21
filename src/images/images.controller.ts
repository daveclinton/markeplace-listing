import {
  Controller,
  Get,
  HttpStatus,
  Query,
  BadRequestException,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpException,
  Inject,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ImagesService } from './images.service';
import {
  GoogleReverseImageSearchResponse,
  ImageSearchDto,
  ProductSearchResponse,
} from './interfaces/image-search.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ProductSearchQueryDto } from './dto/product-search.dto';

@ApiTags('Images')
@Controller('images')
export class ImagesController {
  constructor(
    private readonly imageSearchService: ImagesService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}
  @Get('search')
  @ApiOperation({ summary: 'Search for images based on text query' })
  @ApiQuery({
    name: 'query',
    required: true,
    description: 'Search text for finding images',
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results to return',
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Succesfully retrieved images',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters',
  })
  async searchImages(
    @Query() queryDto: ProductSearchQueryDto,
  ): Promise<ProductSearchResponse> {
    this.logger.info(
      `Searching images with query: ${JSON.stringify(queryDto)}`,
      {
        query: queryDto,
      },
    );
    try {
      const productSearchDto: ProductSearchQueryDto = {
        query: queryDto.query,
        limit: queryDto.limit,
        page: queryDto.page,
      };
      return await this.imageSearchService.searchProducts(productSearchDto);
    } catch (error) {
      this.logger.error('Image search error', {
        error: error.message,
        stack: error.stack,
        query: queryDto,
      });
      this.logger.error(`Error searching images: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  @Post('reverse-image-search')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Search for similar products using an image file or URL',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file to search with',
        },
        imageUrl: {
          type: 'string',
          description: 'URL of image to search with',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully performed reverse image search',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input parameters or file',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Image search service unavailable',
  })
  async searchByImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() searchDto: ImageSearchDto,
  ): Promise<GoogleReverseImageSearchResponse> {
    const startTime = Date.now();
    try {
      if (!file && !searchDto.imageUrl) {
        throw new BadRequestException(
          'Either an image file or image URL must be provided',
        );
      }
      if (file) {
        searchDto.imageFile = file;
      }
      const results = await this.imageSearchService.searchByImage(searchDto);

      const duration = Date.now() - startTime;
      this.logger.debug(`Reverse image search completed in ${duration}ms`);
      console.log(results);
      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Error in reverse image search after ${duration}ms: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to process reverse image search request',
      );
    }
  }
}
