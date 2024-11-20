import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
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
import {
  ProductStatus,
  MarketplaceType,
  InventoryStatus,
} from '../product.entity';

class InventoryTrackingDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  lowStockThreshold: number;

  @ApiProperty()
  @IsEnum(InventoryStatus)
  status: InventoryStatus;

  @ApiProperty({ example: '123ABC' })
  @IsString()
  sku: string;

  @ApiPropertyOptional({ example: 'WAREHOUSE1' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty()
  @IsBoolean()
  autoReorder: boolean;

  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @IsOptional()
  reorderQuantity?: number;
}

class MarketplaceSpecificDataDto {
  @ApiPropertyOptional({ example: 'ABC123' })
  @IsString()
  @IsOptional()
  listingId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 'https://marketplace.com/product' })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  lastSyncDate?: Date;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  errors?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  categories?: string[];

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  salesRank?: number;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;
}

export class CreateProductDto {
  @ApiProperty({ example: 'A great product title' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'This is a detailed description of the product.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @ApiProperty({ example: 'Books' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'New' })
  @IsString()
  @IsNotEmpty()
  condition: string;

  @ApiProperty({ example: 19.99 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ example: ['image1.jpg', 'image2.jpg'] })
  @IsArray()
  @IsUrl({}, { each: true })
  pictures: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  specifics?: { [key: string]: string | number | boolean };

  @ApiProperty()
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

  @ApiProperty()
  @IsObject()
  returns: {
    accepted: boolean;
    period: number;
    shippingPaidBy: string;
    restockingFee?: number;
    conditions?: string[];
  };

  @ApiProperty()
  @ValidateNested()
  @Type(() => InventoryTrackingDto)
  inventory: InventoryTrackingDto;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.DRAFT })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus = ProductStatus.DRAFT;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  marketplaceData?: {
    [key in MarketplaceType]?: MarketplaceSpecificDataDto;
  };

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  seoMetadata?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  };

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  variants?: {
    id: string;
    attributes: Record<string, string>;
    sku: string;
    price: number;
    quantity: number;
  }[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  bundleInfo?: {
    isBundle: boolean;
    bundledProducts?: {
      productId: number;
      quantity: number;
    }[];
  };

  @ApiProperty({ example: 'PROD-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;
}

export class UpdateProductDto extends CreateProductDto {}
