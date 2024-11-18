import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import axios, { AxiosError } from 'axios';
import { ProductSearchResponse } from './dto/product-search.interface';
import { ProductSearchQueryDto } from './dto/product-search.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import {
  CloudinaryUploadResponse,
  ImageSearchDto,
} from './interfaces/image-search.interface';
import { v2 as cloudinary } from 'cloudinary';

interface GoogleShoppingProduct {
  product_id: string;
  product_title: string;
  product_description: string;
  product_photos: string[];
  product_attributes: {
    product_rating: number;
    product_page_url: string;
    product_offers_page_url: string;
    product_specs_page_url: string;
    product_reviews_page_url: string;
    product_num_reviews: number;
    product_num_offers: string;
  };
  typical_price_range: string[];
  offer: any;
}

interface GoogleShoppingResponse {
  status: string;
  request_id: string;
  data: {
    products: GoogleShoppingProduct[];
  };
}

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    private cacheService: CacheService,
    private httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('ImagesService initialized');
    this.initializeCloudinary();
    this.validateConfig();
  }
  private initializeCloudinary(): void {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  private validateConfig(): void {
    const requiredConfigs = [
      'RAPID_API_KEY',
      'GOOGLE_LENS_HOST',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
    ];

    const missingConfigs = requiredConfigs.filter(
      (config) => !this.configService.get<string>(config),
    );

    if (missingConfigs.length > 0) {
      throw new Error(
        `Missing required configuration: ${missingConfigs.join(', ')}`,
      );
    }
  }

  async searchProducts(
    queryDto: ProductSearchQueryDto,
  ): Promise<ProductSearchResponse> {
    const startTime = Date.now();
    this.logger.debug(
      `Starting product search with params: ${JSON.stringify(queryDto)}`,
    );

    const cacheKey = `product-search:${JSON.stringify(queryDto)}`;

    const rapidKey = this.configService.get<string>('RAPID_API_KEY');
    const realTimeHost = this.configService.get<string>(
      'REAL_TIME_PRODUCT_SEARCH',
    );

    try {
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        return cachedResult;
      }
      this.logger.debug(`Cache miss for key: ${cacheKey}`);

      const requestOptions = {
        method: 'GET',
        url: 'https://real-time-product-search.p.rapidapi.com/search',
        params: {
          q: queryDto.query,
          country: queryDto.country || 'us',
          language: queryDto.language || 'en',
          limit: queryDto.limit || 20,
          page: queryDto.page || 1,
        },
        headers: {
          'x-rapidapi-key': rapidKey,
          'x-rapidapi-host': realTimeHost,
        },
      };

      this.logger.debug(`Making API request to: ${requestOptions.url}`);

      const response = await firstValueFrom(
        this.httpService.request<GoogleShoppingResponse>(requestOptions),
      );

      if (
        !response.data ||
        response.data.status !== 'OK' ||
        !Array.isArray(response.data.data?.products)
      ) {
        this.logger.error('Invalid API response structure', {
          responseData: response.data,
        });
        throw new HttpException(
          'Invalid response from product search API',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const formattedResponse: ProductSearchResponse = {
        products: response.data.data.products
          .map((product) => ({
            id: product.product_id,
            title: product.product_title,
            description: product.product_description,
            images: product.product_photos || [],
            rating: product.product_attributes?.product_rating,
            numReviews: product.product_attributes?.product_num_reviews,
            numOffers: parseInt(
              product.product_attributes?.product_num_offers || '0',
            ),
            pageUrl: product.product_attributes?.product_page_url,
            priceRange: product.typical_price_range || [],
          }))
          .filter((product) => product.id && product.title),
        total: response.data.data.products.length,
        page: queryDto.page || 1,
        limit: queryDto.limit || 20,
      };

      if (formattedResponse.products.length === 0) {
        this.logger.warn(
          `No valid products found for query: ${queryDto.query}`,
        );
        return {
          products: [],
          total: 0,
          page: queryDto.page || 1,
          limit: queryDto.limit || 20,
        };
      }

      // Cache the response
      await this.cacheService.set(cacheKey, formattedResponse);
      this.logger.debug(`Cached response for key: ${cacheKey}`);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Product search completed successfully in ${duration}ms. Query: "${queryDto.query}", Results: ${formattedResponse.products.length}`,
      );

      return formattedResponse;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        this.logger.error(
          `API request failed after ${duration}ms: ${error.message}`,
          {
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: axiosError.response?.data,
            query: queryDto,
          },
        );

        if (axiosError.response?.status === 429) {
          throw new HttpException(
            'Rate limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        throw new HttpException(
          'Product search service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else {
        this.logger.error(
          `Unexpected error after ${duration}ms: ${error.message}`,
          error.stack,
        );

        throw new HttpException(
          'Internal server error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
  ): Promise<CloudinaryUploadResponse> {
    try {
      const base64File = file.buffer.toString('base64');
      const dataUri = `data:${file.mimetype};base64,${base64File}`;
      return await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          dataUri,
          {
            folder: 'product-search',
            resource_type: 'image',
            transformation: [
              { quality: 'auto:good' },
              { fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            if (error) {
              this.logger.error('Cloudinary upload failed:', error);
              reject(
                new HttpException(
                  'Image upload failed',
                  HttpStatus.INTERNAL_SERVER_ERROR,
                ),
              );
            } else {
              resolve(result as unknown as CloudinaryUploadResponse);
            }
          },
        );
      });
    } catch (error) {
      this.logger.error('Error uploading to Cloudinary:', error);
      throw new HttpException(
        'Image upload failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private validateImage(imageFile: Express.Multer.File) {
    const maxSize = 5 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      throw new HttpException(
        'Image file too large. Maximum size is 5MB',
        HttpStatus.BAD_REQUEST,
      );
    }
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(imageFile.mimetype)) {
      throw new HttpException(
        'Invalid file type. Allowed types: JPEG, PNG, WEBP',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async searchByImage(searchDto: ImageSearchDto): Promise<unknown> {
    const startTime = Date.now();
    let imageUrl: string;
    try {
      if (searchDto.imageFile) {
        this.validateImage(searchDto.imageFile);
        const uploadResult = await this.uploadToCloudinary(searchDto.imageFile);
        imageUrl = uploadResult.secure_url;

        this.logger.debug(`Image uploaded to Cloudinary: ${imageUrl}`);

        return imageUrl;
      } else if (searchDto.imageUrl) {
        imageUrl = searchDto.imageUrl;
      } else {
        throw new HttpException(
          'Either imageUrl or imageFile must be provided',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Unexpected error in image search after ${duration}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
