import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { ProductSearchResponse } from './dto/product-search.interface';
import { ProductSearchQueryDto } from './dto/product-search.dto';
import { ConfigService } from '@nestjs/config';
import {
  CloudinaryUploadResponse,
  GoogleReverseImageSearchResponse,
  ImageSearchDto,
} from './interfaces/image-search.interface';
import { v2 as cloudinary } from 'cloudinary';
import { getJson } from 'serpapi';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class ImagesService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
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
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'SERPI_API_KEY',
      'SERPI_API_BASE_URL',
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
    this.logger.info(
      `Starting product search with params: ${JSON.stringify(queryDto)}`,
    );

    const rapidKey = this.configService.get<string>('RAPID_API_KEY');
    const realTimeHost = this.configService.get<string>(
      'REAL_TIME_PRODUCT_SEARCH',
    );

    try {
      const requestOptions = {
        method: 'GET',
        url: 'https://real-time-product-search.p.rapidapi.com/search',
        params: {
          q: queryDto.query,
          country: 'us',
          language: 'en',
          limit: queryDto.limit || 20,
          page: queryDto.page || 1,
        },
        headers: {
          'x-rapidapi-key': rapidKey,
          'x-rapidapi-host': realTimeHost,
        },
      };

      this.logger.info(`Making API request to: ${requestOptions.url}`);

      const response = await axios.request(requestOptions);

      this.logger.info('Raw API Response:', {
        status: response.status,
        statusText: response.statusText,
        dataType: typeof response.data,
        dataKeys: Object.keys(response.data),
      });

      if (
        !response.data ||
        !response.data.data ||
        !response.data.data.products
      ) {
        this.logger.error('Unexpected API response structure', {
          fullResponse: response.data,
        });
        throw new HttpException(
          'Unexpected response from product search API',
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

      const duration = Date.now() - startTime;
      this.logger.info(
        `Product search completed successfully in ${duration}ms. Query: "${queryDto.query}", Results: ${formattedResponse.products.length}`,
      );

      return formattedResponse;
    } catch (error) {
      this.logger.error('Product Search Error', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        axiosError: axios.isAxiosError(error)
          ? {
              status: error.response?.status,
              data: error.response?.data,
            }
          : null,
      });
      throw error;
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

  private async performGoogleReverseImageSearch(
    imageUrl: string,
  ): Promise<GoogleReverseImageSearchResponse> {
    // const serpApiKey = this.configService.get<string>('SERPI_API_KEY');

    try {
      this.logger.debug('Initiating reverse image search for URL:', imageUrl);
      this.logger.debug('Initiating reverse image search for URL:', imageUrl);
      console.log('Full imageUrl details:', {
        url: imageUrl,
        type: typeof imageUrl,
        length: imageUrl?.length,
        isValid: /^https?:\/\//.test(imageUrl),
      });

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(
            new HttpException(
              'Image search request timed out',
              HttpStatus.REQUEST_TIMEOUT,
            ),
          );
        }, 60000);
        getJson(
          {
            api_key:
              '9e6aecc058a37f55d45f3d2bd63cee9bafeed9373b83ffddff833ed3cb71b85b',
            engine: 'google_reverse_image',
            google_domain: 'google.com',
            image_url: imageUrl,
            safe: 'active',
            hl: 'en',
          },
          (json) => {
            clearTimeout(timeoutId);
            // Handle API errors
            if (json.error) {
              this.logger.error('Google Reverse Image Search API error:', {
                errorMessage: json.error,
                url: imageUrl,
              });
              return reject(
                new HttpException(
                  `Reverse image search API error: ${json.error}`,
                  HttpStatus.BAD_GATEWAY,
                ),
              );
            }

            // Explicit check for no results
            if (!json.image_results || json.image_results.length === 0) {
              this.logger.warn('No image results found for search', {
                searchId: json.search_metadata?.id,
                imageUrl,
              });
              return reject(
                new HttpException(
                  "Google Reverse Image hasn't returned any results for this query",
                  HttpStatus.NOT_FOUND,
                ),
              );
            }

            // Log successful response metadata
            this.logger.debug('Search completed successfully', {
              searchId: json.search_metadata?.id,
              totalResults: json.search_information?.total_results,
              processingTime: json.search_metadata?.total_time_taken,
              resultCount: json.image_results.length,
            });

            resolve({
              search_metadata: json.search_metadata,
              search_parameters: json.search_parameters,
              search_information: json.search_information,
              image_sizes: json.image_sizes,
              image_results: json.image_results.map((result) => ({
                position: result.position,
                title: result.title,
                link: result.link,
                redirect_link: result.redirect_link,
                displayed_link: result.displayed_link,
                favicon: result.favicon,
                snippet: result.snippet,
                snippet_highlighted_words: result.snippet_highlighted_words,
                source: result.source,
                thumbnail: result.thumbnail,
                date: result.date,
              })),
            });
          },
        );
      });
    } catch (error) {
      this.logger.error('Unexpected error in reverse image search:', {
        errorMessage: error.message,
        url: imageUrl,
        errorStack: error.stack,
      });

      throw new HttpException(
        'Reverse image search failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchByImage(
    searchDto: ImageSearchDto,
  ): Promise<GoogleReverseImageSearchResponse> {
    const startTime = Date.now();
    let imageUrl: string;

    try {
      // Validate and upload image first if an image file is provided
      if (searchDto.imageFile) {
        this.validateImage(searchDto.imageFile);

        // Await Cloudinary upload before continuing
        const uploadResult = await this.uploadToCloudinary(searchDto.imageFile);

        // Only proceed if upload is successful
        if (!uploadResult || !uploadResult.secure_url) {
          throw new HttpException(
            'Image upload to Cloudinary failed',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        imageUrl = uploadResult.secure_url;
        this.logger.debug(`Image uploaded to Cloudinary: ${imageUrl}`);
      } else if (searchDto.imageUrl) {
        imageUrl = searchDto.imageUrl;
      } else {
        throw new HttpException(
          'Either imageUrl or imageFile must be provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const searchResults =
        await this.performGoogleReverseImageSearch(imageUrl);

      const duration = Date.now() - startTime;
      this.logger.debug(`Image search completed in ${duration}ms`);

      return searchResults;
    } catch (error) {
      const duration = Date.now() - startTime;
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Unexpected error in image search after ${duration}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        'Image search failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
