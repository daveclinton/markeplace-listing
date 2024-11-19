import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus, InventoryStatus } from './product.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createProduct(
    supabaseUserId: string,
    productData: Partial<Product>,
  ): Promise<Product> {
    const user = await this.userRepository.findOne({
      where: { supabase_user_id: supabaseUserId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }
    this.validateProductData(productData);

    const newProduct = this.prepareProductForCreation(productData, user);
    this.validateInventory(newProduct);
    if (!newProduct.sku) {
      newProduct.sku = this.generateSku(newProduct);
    }
    await this.validateSkuUniqueness(newProduct.sku);

    try {
      const savedProduct = await this.productRepository.save(newProduct);
      return savedProduct;
    } catch (error) {
      throw new BadRequestException(
        `Product creation failed: ${error.message}`,
      );
    }
  }

  private validateProductData(productData: Partial<Product>): void {
    const requiredFields = [
      'title',
      'description',
      'category',
      'condition',
      'basePrice',
      'pictures',
      'inventory',
    ];

    requiredFields.forEach((field) => {
      if (!productData[field]) {
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    });
    if (productData.pictures && productData.pictures.length === 0) {
      throw new BadRequestException('At least one product picture is required');
    }

    if (productData.basePrice <= 0) {
      throw new BadRequestException('Base price must be greater than zero');
    }
  }

  private prepareProductForCreation(
    productData: Partial<Product>,
    user: User,
  ): Product {
    const defaultProduct = new Product();

    Object.assign(defaultProduct, productData);
    defaultProduct.status = ProductStatus.DRAFT;
    if (!defaultProduct.inventory?.status) {
      defaultProduct.inventory = {
        ...productData.inventory,
        status: InventoryStatus.IN_STOCK,
        autoReorder: false,
        quantity: productData.inventory?.quantity || 0,
        lowStockThreshold: productData.inventory?.lowStockThreshold || 10,
      };
    }
    defaultProduct.user = user;

    return defaultProduct;
  }

  private validateInventory(product: Product): void {
    const inventory = product.inventory;

    if (inventory.quantity < 0) {
      throw new BadRequestException('Inventory quantity cannot be negative');
    }

    if (inventory.quantity === 0) {
      inventory.status = InventoryStatus.OUT_OF_STOCK;
    } else if (inventory.quantity <= inventory.lowStockThreshold) {
      inventory.status = InventoryStatus.LOW_STOCK;
    }

    if (inventory.autoReorder && !inventory.reorderQuantity) {
      throw new BadRequestException('Auto-reorder requires a reorder quantity');
    }
  }

  private async validateSkuUniqueness(sku: string): Promise<void> {
    const existingSku = await this.productRepository.findOne({
      where: { sku },
    });

    if (existingSku) {
      throw new BadRequestException(`SKU ${sku} already exists`);
    }
  }

  private generateSku(product: Product): string {
    const timestamp = Date.now().toString(36);
    const category = product.category.slice(0, 3).toUpperCase();
    const randomString = Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase();

    return `${category}-${timestamp}-${randomString}`;
  }
}
