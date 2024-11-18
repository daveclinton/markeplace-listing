import {
  Controller,
  Logger,
  Get,
  HttpStatus,
  Query,
  BadRequestException,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ImageSearchQueryDto } from './dto/image-search.dto';
import { ImagesService } from './images.service';
import { ProductSearchResponse } from './interfaces/image-search.interface';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Images')
@Controller('images')
export class ImagesController {
  private readonly logger = new Logger(ImagesController.name);
  constructor(private readonly imageSearchService: ImagesService) {}
  @Get('search')
  @ApiOperation({ summary: 'Search for images based on text query' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Succesfully retrieved images',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters',
  })
  async searchImages(
    @Query() queryDto: ImageSearchQueryDto,
  ): Promise<ProductSearchResponse> {
    try {
      this.logger.log(`Searching images with query: ${queryDto.query}`);
      return await this.imageSearchService.searchProducts(queryDto);
    } catch (error) {
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
    @UploadedFile() file?: Express.Multer.File,
    @Body('imageUrl') imageUrl?: string,
    @Body('maxResults') maxResults: number = 10,
  ) {
    const startTime = Date.now();
    try {
      this.logger.debug('Processing reverse image search request', {
        hasFile: !!file,
        hasUrl: !!imageUrl,
        maxResults,
      });

      const results = await this.imageSearchService.searchByImage({
        imageFile: file,
        imageUrl,
      });

      const duration = Date.now() - startTime;
      this.logger.debug(`Reverse image search completed in ${duration}ms`);

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
