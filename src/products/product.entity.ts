import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  ManyToOne,
  DeleteDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.entity';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsArray,
  IsObject,
  IsOptional,
  MinLength,
  MaxLength,
  IsUrl,
  Min,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  LISTED = 'listed',
  DELISTED = 'delisted',
  SUSPENDED = 'suspended',
}

export enum MarketplaceType {
  EBAY = 'ebay',
  FACEBOOK = 'facebook',
}

export enum InventoryStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  BACKORDERED = 'backordered',
  DISCONTINUED = 'discontinued',
}

export enum ListingStatus {
  PENDING = 'pending',
  LISTED = 'listed',
  DELISTED = 'de_listed',
}

class InventoryTracking {
  @ApiProperty({ example: 100, description: 'Current quantity in stock' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 10, description: 'Low stock threshold' })
  @IsNumber()
  @Min(0)
  lowStockThreshold: number;

  @ApiProperty({ description: 'Current inventory status' })
  @IsEnum(InventoryStatus)
  status: InventoryStatus;

  @ApiProperty({ example: '123ABC', description: 'SKU identifier' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 'WAREHOUSE1', description: 'Storage location' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'Indicates if the product should reorder automatically',
  })
  @IsBoolean()
  autoReorder: boolean;

  @ApiProperty({ example: 50, description: 'Quantity to reorder when low' })
  @IsNumber()
  @IsOptional()
  reorderQuantity?: number;
}

class MarketplaceSpecificData {
  @ApiProperty({ example: 'ABC123', description: 'Marketplace listing ID' })
  @IsString()
  @IsOptional()
  listingId?: string;

  @ApiProperty({ description: 'Current status on the marketplace' })
  @IsString()
  @IsOptional()
  status?: ListingStatus;

  @ApiProperty({
    example: 'https://marketplace.com/product',
    description: 'Listing URL',
  })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiProperty({ description: 'Last sync timestamp with marketplace' })
  @IsOptional()
  lastSyncDate?: Date;

  @ApiProperty({ description: 'Any errors from the marketplace' })
  @IsArray()
  @IsOptional()
  errors?: string[];

  @ApiProperty({ description: 'Marketplace-specific categories' })
  @IsArray()
  @IsOptional()
  categories?: string[];

  @ApiProperty({ description: 'Marketplace-specific pricing' })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({ description: 'Sales rank in the marketplace' })
  @IsNumber()
  @IsOptional()
  salesRank?: number;

  @ApiProperty({ description: 'Marketplace-specific attributes' })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;
}

class PriceHistory {
  @ApiProperty({ description: 'Price amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Price change date' })
  date: Date;

  @ApiProperty({ description: 'Reason for price change' })
  @IsString()
  @IsOptional()
  reason?: string;
}

@Entity('products')
@Index(['category', 'status'])
@Index(['sku'], { unique: true })
export class Product {
  @ApiProperty({
    example: 1,
    description: 'Auto-generated product ID',
  })
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ApiProperty({
    example: 'A great product title',
    description: 'Title of the product',
  })
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'This is a detailed description of the product.',
    description: 'Description of the product',
  })
  @Column({ type: 'text' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @ApiProperty({
    example: 'Books',
    description: 'Category of the product',
  })
  @Column({ type: 'varchar', length: 100 })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    example: 'New',
    description: 'Condition of the product',
  })
  @Column({ type: 'varchar', length: 50 })
  @IsString()
  @IsNotEmpty()
  condition: string;

  @ApiProperty({
    example: '19.99',
    description: 'Base price of the product',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({
    description: 'Price history of the product',
  })
  @Column({ type: 'jsonb' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceHistory)
  priceHistory: PriceHistory[];

  @ApiProperty({
    example: ['image1.jpg', 'image2.jpg'],
    description: 'Array of picture URLs for the product',
  })
  @Column('text', { array: true })
  @IsArray()
  @IsUrl({}, { each: true })
  pictures: string[];

  @ApiProperty({
    description: 'Dynamic specifics of the product based on category',
  })
  @Column({ type: 'jsonb' })
  @IsObject()
  specifics: {
    [key: string]: string | number | boolean;
  };

  @ApiProperty({
    description: 'Shipping details for the product',
  })
  @Column({ type: 'jsonb' })
  @IsObject()
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

  @ApiProperty({
    description: 'Return policy for the product',
  })
  @Column({ type: 'jsonb' })
  @IsObject()
  returns: {
    accepted: boolean;
    period: number;
    shippingPaidBy: string;
    restockingFee?: number;
    conditions?: string[];
  };

  @ApiProperty({
    description: 'Inventory tracking information',
  })
  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => InventoryTracking)
  inventory: InventoryTracking;

  @ApiProperty({
    enum: ProductStatus,
    description: 'Current status of the product',
  })
  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  @IsEnum(ProductStatus)
  status: ProductStatus;

  @ApiProperty({
    description: 'Marketplace specific data',
  })
  @Column({ type: 'jsonb', nullable: true })
  @IsObject()
  @ValidateNested()
  @Type(() => MarketplaceSpecificData)
  marketplaceData: {
    [key in MarketplaceType]?: MarketplaceSpecificData;
  };

  @ApiProperty({
    description: 'SEO metadata for the product',
  })
  @Column({ type: 'jsonb', nullable: true })
  @IsObject()
  @IsOptional()
  seoMetadata?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  };

  @ApiProperty({
    description: 'Product variants information',
  })
  @Column({ type: 'jsonb', nullable: true })
  @IsArray()
  @IsOptional()
  variants?: {
    id: string;
    attributes: Record<string, string>;
    sku: string;
    price: number;
    quantity: number;
  }[];

  @ApiProperty({
    description: 'Product bundle information',
  })
  @Column({ type: 'jsonb', nullable: true })
  @IsObject()
  @IsOptional()
  bundleInfo?: {
    isBundle: boolean;
    bundledProducts?: {
      productId: number;
      quantity: number;
    }[];
  };

  @ApiProperty({ description: 'Unique SKU identifier' })
  @Column({ type: 'varchar', length: 100, unique: true })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({
    description: 'Version number, auto-incremented on each update',
  })
  @VersionColumn()
  version: number;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Product creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Soft delete timestamp',
  })
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'userSupabaseId',
    referencedColumnName: 'supabase_user_id',
  })
  user: User;
}
