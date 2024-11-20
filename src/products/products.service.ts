import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus, InventoryStatus } from './product.entity';
import { User } from '../users/user.entity';
import { CreateProductDto } from './product.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, Min } from 'class-validator';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

class ProductVariantDto {
  @ApiPropertyOptional({ description: 'Variant attributes' })
  @IsObject()
  attributes: Record<string, string>;

  @ApiProperty({ description: 'Variant price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Variant quantity' })
  @IsNumber()
  @Min(0)
  quantity: number;
}

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.logger.info('ProductService initialized');
  }

  private generateSKU(
    category: string,
    title: string,
    variantAttributes?: Record<string, string>,
  ): string {
    if (!category?.trim() || !title?.trim()) {
      throw new BadRequestException(
        'Category and title are required for SKU generation',
      );
    }

    const sanitize = (input: string) =>
      input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 4);

    const categoryCode = sanitize(category);
    const titleCode = sanitize(title);
    const timestamp = Date.now().toString(36).slice(-4);
    const randomSuffix = Math.random().toString(36).slice(-3);

    let sku = `${categoryCode}-${titleCode}-${timestamp}-${randomSuffix}`;

    if (variantAttributes) {
      const variantCode = Object.values(variantAttributes)
        .map((val) => sanitize(val))
        .join('-');
      sku += `-${variantCode}`;
    }

    return sku.toUpperCase();
  }

  private async ensureUniqueSKU(
    sku: string,
    userSupabaseId: string,
    maxAttempts = 3,
  ): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const existingProduct = await this.productRepository.findOne({
        where: {
          sku,
          user: { supabase_user_id: userSupabaseId },
        },
      });

      if (!existingProduct) return sku;

      sku = `${sku}-${Math.random().toString(36).slice(-3)}`;
    }

    throw new ConflictException('Unable to generate unique SKU');
  }

  private generateSEOMetadata(
    title: string,
    description: string,
  ): {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  } {
    return {
      metaTitle: title.slice(0, 60),
      metaDescription: description.slice(0, 160),
      keywords: title.toLowerCase().split(' ').slice(0, 5),
    };
  }

  private validateProductVariants(variants: ProductVariantDto[]): void {
    const attributeSets = new Set();

    variants.forEach((variant) => {
      const attributeKey = JSON.stringify(
        Object.entries(variant.attributes)
          .sort()
          .map(([k, v]) => `${k}:${v}`),
      );

      if (attributeSets.has(attributeKey)) {
        throw new BadRequestException('Duplicate variant attributes');
      }
      attributeSets.add(attributeKey);

      // Validate variant properties
      if (variant.price <= 0) {
        throw new BadRequestException('Variant price must be positive');
      }
      if (variant.quantity < 0) {
        throw new BadRequestException('Variant quantity cannot be negative');
      }
    });
  }

  async createProduct(
    createProductDto: CreateProductDto,
    userSupabaseId: string,
  ): Promise<Product> {
    const queryRunner =
      this.productRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepository.findOne({
        where: { supabase_user_id: userSupabaseId },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${userSupabaseId} not found`);
      }

      if (createProductDto.variants?.length) {
        this.validateProductVariants(createProductDto.variants);
      }

      const baseSKU = await this.ensureUniqueSKU(
        this.generateSKU(createProductDto.category, createProductDto.title),
        userSupabaseId,
      );

      const productData = {
        ...createProductDto,
        sku: baseSKU,
        user,
        status: ProductStatus.DRAFT,
        priceHistory: [
          {
            amount: createProductDto.basePrice,
            date: new Date(),
            reason: 'Initial price',
          },
        ],
        seoMetadata:
          createProductDto.seoMetadata ||
          this.generateSEOMetadata(
            createProductDto.title,
            createProductDto.description,
          ),
        inventory: {
          ...createProductDto.inventory,
          sku: baseSKU,
          status: this.determineInventoryStatus(
            createProductDto.inventory.quantity,
            createProductDto.inventory.lowStockThreshold,
          ),
        },
      };

      // Process variants with unique SKUs
      if (productData.variants?.length) {
        productData.variants = await Promise.all(
          productData.variants.map(async (variant, index) => ({
            ...variant,
            sku: await this.ensureUniqueSKU(
              this.generateSKU(
                createProductDto.category,
                createProductDto.title,
                variant.attributes,
              ),
              userSupabaseId,
            ),
            id: `${baseSKU}-VAR-${index + 1}`,
          })),
        );
      }

      // Create and save product
      const product = this.productRepository.create(productData);
      const savedProduct = await this.productRepository.save(product);

      await queryRunner.commitTransaction();
      return savedProduct;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Product creation failed', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private determineInventoryStatus(
    quantity: number,
    lowStockThreshold: number,
  ): InventoryStatus {
    if (quantity <= 0) return InventoryStatus.OUT_OF_STOCK;
    if (quantity <= lowStockThreshold) return InventoryStatus.LOW_STOCK;
    return InventoryStatus.IN_STOCK;
  }
}
