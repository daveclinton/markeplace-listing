import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsArray,
  IsUrl,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryStatus, ProductStatus } from '../entities/product.entity';

class InventoryTrackingDto {
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  lowStockThreshold: number;

  @IsEnum(InventoryStatus)
  status: InventoryStatus;

  @IsString()
  sku: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  condition: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsArray()
  @IsUrl({}, { each: true })
  pictures: string[];

  @IsObject()
  specifics: Record<string, string | number | boolean>;

  @IsObject()
  shipping: {
    service: string;
    cost: string;
    dispatchDays: number;
  };

  @IsObject()
  returns: {
    accepted: boolean;
    period: number;
    shippingPaidBy: string;
  };

  @ValidateNested()
  @Type(() => InventoryTrackingDto)
  inventory: InventoryTrackingDto;

  @IsString()
  @IsOptional()
  sku?: string;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  priceChangeReason?: string;

  @ValidateNested()
  @Type(() => InventoryTrackingDto)
  @IsOptional()
  inventory?: InventoryTrackingDto;
}

export class SearchProductDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxPrice?: number;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  condition?: string;

  @IsEnum(InventoryStatus)
  @IsOptional()
  inventoryStatus?: InventoryStatus;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}
