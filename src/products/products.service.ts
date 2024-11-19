import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Product,
  ProductStatus,
  MarketplaceType,
  InventoryStatus,
} from './entities/product.entity';
import {
  CreateProductDto,
  SearchProductDto,
  UpdateProductDto,
} from './dto/product.dto';
import { User } from 'src/users/user.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createProduct(
    createProductDto: CreateProductDto,
    userSupabaseId: string,
  ): Promise<Product> {
    const user = await this.userRepository.findOne({
      where: { supabase_user_id: userSupabaseId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!createProductDto.sku) {
      createProductDto.sku = this.generateUniqueSku(createProductDto);
    }

    this.validateInventory(createProductDto);

    const product = this.productRepository.create({
      ...createProductDto,
      user: user,
      status: ProductStatus.DRAFT,
      priceHistory: [
        {
          amount: createProductDto.basePrice,
          date: new Date(),
          reason: 'Initial Price',
        },
      ],
    });

    await this.validateProductSpecifics(product);

    await this.syncWithMarketplaces(product);

    return this.productRepository.save(product);
  }

  async searchProducts(
    searchDto: SearchProductDto,
  ): Promise<{ products: Product[]; total: number }> {
    const {
      category,
      minPrice,
      maxPrice,
      status,
      condition,
      inventoryStatus,
      page = 1,
      limit = 20,
    } = searchDto;

    const queryBuilder = this.productRepository.createQueryBuilder('product');

    if (category)
      queryBuilder.andWhere('product.category = :category', { category });
    if (status) queryBuilder.andWhere('product.status = :status', { status });
    if (condition)
      queryBuilder.andWhere('product.condition = :condition', { condition });

    if (minPrice && maxPrice) {
      queryBuilder.andWhere(
        'product.basePrice BETWEEN :minPrice AND :maxPrice',
        { minPrice, maxPrice },
      );
    }

    if (inventoryStatus) {
      queryBuilder.andWhere('product.inventory.status = :inventoryStatus', {
        inventoryStatus,
      });
    }

    const total = await queryBuilder.getCount();

    const products = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { products, total };
  }

  async updateProduct(
    id: number,
    updateProductDto: UpdateProductDto,
    userSupabaseId: string,
  ): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: {
        id,
        user: { supabase_user_id: userSupabaseId },
      },
      relations: ['user'],
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${id} not found or unauthorized`,
      );
    }
    if (
      updateProductDto.basePrice &&
      updateProductDto.basePrice !== product.basePrice
    ) {
      product.priceHistory.push({
        amount: updateProductDto.basePrice,
        date: new Date(),
        reason: updateProductDto.priceChangeReason || 'Unspecified',
      });
    }
    Object.assign(product, updateProductDto);

    this.validateInventory(product);
    await this.validateProductSpecifics(product);
    await this.syncWithMarketplaces(product);
    this.adjustProductStatus(product);
    return this.productRepository.save(product);
  }

  async getProductByIdForUser(
    id: number,
    userSupabaseId: string,
  ): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: {
        id,
        user: { supabase_user_id: userSupabaseId },
      },
      relations: ['user'],
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${id} not found or unauthorized`,
      );
    }

    return product;
  }

  private async syncWithMarketplaces(product: Product): Promise<void> {
    const marketplaces = [MarketplaceType.EBAY, MarketplaceType.FACEBOOK];

    for (const marketplace of marketplaces) {
      try {
        const marketplaceData = await this.simulateMarketplaceSync(
          product,
          marketplace,
        );
        product.marketplaceData[marketplace] = marketplaceData;
      } catch (error) {
        product.marketplaceData[marketplace] = {
          errors: [error.message],
        };
      }
    }
  }

  private generateUniqueSku(productData: CreateProductDto | Product): string {
    const prefix = productData.category.slice(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${timestamp}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }

  private validateInventory(product: CreateProductDto | Product): void {
    const inventory = product.inventory;

    if (inventory.quantity === 0) {
      inventory.status = InventoryStatus.OUT_OF_STOCK;
    } else if (inventory.quantity <= inventory.lowStockThreshold) {
      inventory.status = InventoryStatus.LOW_STOCK;
    } else {
      inventory.status = InventoryStatus.IN_STOCK;
    }
  }

  private async validateProductSpecifics(product: Product): Promise<void> {
    switch (product.category) {
      case 'Electronics':
        if (!product.specifics.brand || !product.specifics.model) {
          throw new BadRequestException('Electronics require brand and model');
        }
        break;
      case 'Clothing':
        if (!product.specifics.size || !product.specifics.color) {
          throw new BadRequestException('Clothing requires size and color');
        }
        break;
    }
  }

  private adjustProductStatus(product: Product): void {
    if (product.inventory.status === InventoryStatus.OUT_OF_STOCK) {
      product.status = ProductStatus.DELISTED;
    } else if (
      product.status === ProductStatus.DRAFT &&
      this.isProductComplete(product)
    ) {
      product.status = ProductStatus.PENDING_REVIEW;
    }
  }

  private isProductComplete(product: Product): boolean {
    return !!(
      product.title &&
      product.description &&
      product.pictures.length > 0 &&
      product.basePrice > 0
    );
  }

  private async simulateMarketplaceSync(
    product: Product,
    marketplace: MarketplaceType,
  ) {
    return {
      listingId: `${marketplace.toUpperCase()}-${product.sku}`,
      status: 'Active',
      url: `https://${marketplace}.com/listing/${product.sku}`,
      lastSyncDate: new Date(),
      price: product.basePrice,
      salesRank: Math.floor(Math.random() * 1000),
    };
  }
}
