import {
  Controller,
  Logger,
  Get,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ImageSearchQueryDto } from './dto/image-search.dto';
import { ImagesService } from './images.service';
import { ProductSearchResponse } from './interfaces/image-search.interface';

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
}
