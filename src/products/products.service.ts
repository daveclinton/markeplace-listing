import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus, InventoryStatus } from './product.entity';
import { User } from '../users/user.entity';

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

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createProduct(
    createProductDto: CreateProductDto,
    userSupabaseId: string,
  ): Promise<Product> {
    const user = await this.userRepository.findOne({
      where: { supabase_user_id: userSupabaseId },
    });

    if (!user) {
      throw new NotFoundException(
        `User with supabase ID ${userSupabaseId} not found`,
      );
    }

    const existingProduct = await this.productRepository.findOne({
      where: {
        sku: createProductDto.inventory.sku,
        user: { supabase_user_id: userSupabaseId },
      },
    });

    if (existingProduct) {
      throw new ConflictException(
        `Product with SKU ${createProductDto.inventory.sku} already exists for this user`,
      );
    }

    try {
      const product = this.productRepository.create({
        ...createProductDto,
        status: ProductStatus.DRAFT,
        user,
        priceHistory: [
          {
            amount: createProductDto.basePrice,
            date: new Date(),
            reason: 'Initial price',
          },
        ],
        inventory: {
          ...createProductDto.inventory,
          status: this.determineInventoryStatus(
            createProductDto.inventory.quantity,
            createProductDto.inventory.lowStockThreshold,
          ),
        },
        marketplaceData: {},
      });

      if (!product.seoMetadata) {
        product.seoMetadata = {
          metaTitle: createProductDto.title,
          metaDescription: createProductDto.description.substring(0, 160),
          keywords: [createProductDto.category],
        };
      }

      if (product.bundleInfo?.isBundle) {
        await this.validateBundleProducts(
          product.bundleInfo.bundledProducts,
          userSupabaseId,
        );
      }

      if (product.variants?.length > 0) {
        this.validateVariants(product.variants);
      }

      const savedProduct = await this.productRepository.save(product);
      return savedProduct;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create product: ${error.message}`,
      );
    }
  }

  private determineInventoryStatus(
    quantity: number,
    lowStockThreshold: number,
  ): InventoryStatus {
    if (quantity === 0) {
      return InventoryStatus.OUT_OF_STOCK;
    }
    if (quantity <= lowStockThreshold) {
      return InventoryStatus.LOW_STOCK;
    }
    return InventoryStatus.IN_STOCK;
  }

  private async validateBundleProducts(
    bundledProducts: { productId: number; quantity: number }[],
    userSupabaseId: string,
  ): Promise<void> {
    if (!bundledProducts?.length) {
      throw new BadRequestException('Bundle must contain at least one product');
    }

    for (const bundledProduct of bundledProducts) {
      const product = await this.productRepository.findOne({
        where: {
          id: bundledProduct.productId,
          user: { supabase_user_id: userSupabaseId },
        },
      });

      if (!product) {
        throw new BadRequestException(
          `Product with ID ${bundledProduct.productId} not found or doesn't belong to user`,
        );
      }

      if (product.inventory.quantity < bundledProduct.quantity) {
        throw new BadRequestException(
          `Insufficient inventory for product ${product.title} in bundle`,
        );
      }
    }
  }

  private validateVariants(
    variants: {
      id: string;
      attributes: Record<string, string>;
      sku: string;
      price: number;
      quantity: number;
    }[],
  ): void {
    // Check for duplicate SKUs
    const skus = new Set<string>();
    variants.forEach((variant) => {
      if (skus.has(variant.sku)) {
        throw new BadRequestException(
          `Duplicate SKU found in variants: ${variant.sku}`,
        );
      }
      skus.add(variant.sku);
    });

    // Validate variant attributes
    variants.forEach((variant) => {
      if (!variant.attributes || Object.keys(variant.attributes).length === 0) {
        throw new BadRequestException(
          `Variant ${variant.id} must have at least one attribute`,
        );
      }
      if (variant.price <= 0) {
        throw new BadRequestException(
          `Variant ${variant.id} must have a positive price`,
        );
      }
      if (variant.quantity < 0) {
        throw new BadRequestException(
          `Variant ${variant.id} cannot have negative quantity`,
        );
      }
    });
  }

  async getUserProducts(userSupabaseId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { user: { supabase_user_id: userSupabaseId } },
      order: { created_at: 'DESC' },
    });
  }
}
