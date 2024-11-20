import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from './product.entity';

import { User } from '../users/user.entity';
import { CreateProductDto } from './dto/product.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.logger.log('Product Services initialized');
  }

  async createProduct(
    createProductDto: CreateProductDto,
    supabaseUserId: string,
  ): Promise<Product> {
    this.logger.log(`Attempting to create product for user: ${supabaseUserId}`);

    try {
      const user = await this.userRepository.findOne({
        where: { supabase_user_id: supabaseUserId },
      });

      if (!user) {
        this.logger.warn(`User not found for ID: ${supabaseUserId}`);
        throw new NotFoundException('User not found');
      }

      const sku = this.generateUniqueSku(createProductDto);
      this.logger.log(`Generated SKU: ${sku} for product`);

      const product = this.productRepository.create({
        ...createProductDto,
        user: user,
        status: ProductStatus.DRAFT,
        sku: sku,
      });

      const savedProduct = await this.productRepository.save(product);

      this.logger.log(
        `Product created successfully. ID: ${savedProduct.id}, SKU: ${savedProduct.sku}`,
      );
      return savedProduct;
    } catch (error) {
      this.logger.error(
        `Error creating product: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private generateUniqueSku(productDto: CreateProductDto): string {
    try {
      const timestamp = Date.now().toString(36);
      const categoryCode = productDto.category.substring(0, 3).toUpperCase();
      const randomString = Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase();

      const sku = `${categoryCode}-${timestamp}-${randomString}`;

      return sku;
    } catch (error) {
      this.logger.error(`Error generating SKU: ${error.message}`, error.stack);
      throw new Error('Failed to generate unique SKU');
    }
  }
}
