import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsObject,
  IsOptional,
  ValidateNested,
  MinLength,
  MaxLength,
  IsUrl,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class InventoryDto {
  @ApiProperty({ description: 'Current quantity' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Low stock threshold' })
  @IsNumber()
  @Min(0)
  lowStockThreshold: number;

  @ApiPropertyOptional({ description: 'Storage location' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Auto-reorder flag' })
  @IsOptional()
  autoReorder?: boolean = false;

  @ApiPropertyOptional({ description: 'Reorder quantity' })
  @IsNumber()
  @IsOptional()
  reorderQuantity?: number;
}

class ShippingDetailsDto {
  @ApiProperty({ description: 'Shipping service' })
  @IsString()
  service: string;

  @ApiProperty({ description: 'Shipping cost' })
  @IsString()
  cost: string;

  @ApiProperty({ description: 'Dispatch days' })
  @IsNumber()
  dispatchDays: number;

  @ApiPropertyOptional({ description: 'Shipping dimensions' })
  @IsOptional()
  @IsObject()
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };

  @ApiPropertyOptional({ description: 'Shipping weight' })
  @IsOptional()
  @IsObject()
  weight?: {
    value: number;
    unit: string;
  };
}

class ReturnPolicyDto {
  @ApiProperty({ description: 'Returns accepted' })
  accepted: boolean;

  @ApiProperty({ description: 'Return period (days)' })
  @IsNumber()
  period: number;

  @ApiProperty({ description: 'Who pays for return shipping' })
  @IsString()
  shippingPaidBy: string;

  @ApiPropertyOptional({ description: 'Restocking fee' })
  @IsNumber()
  @IsOptional()
  restockingFee?: number;

  @ApiPropertyOptional({ description: 'Return conditions' })
  @IsArray()
  @IsOptional()
  conditions?: string[];
}

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

export class CreateProductDto {
  @ApiProperty({ description: 'Product title' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Product description' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @ApiProperty({ description: 'Product category' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Product condition' })
  @IsString()
  @IsNotEmpty()
  condition: string;

  @ApiProperty({ description: 'Base price' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ description: 'Product pictures' })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  pictures?: string[] = [];

  @ApiPropertyOptional({ description: 'Product specifics' })
  @IsObject()
  @IsOptional()
  specifics?: Record<string, string | number | boolean> = {};

  @ApiProperty({ description: 'Inventory details' })
  @ValidateNested()
  @Type(() => InventoryDto)
  inventory: InventoryDto;

  @ApiProperty({ description: 'Shipping details' })
  @ValidateNested()
  @Type(() => ShippingDetailsDto)
  shipping: ShippingDetailsDto;

  @ApiProperty({ description: 'Return policy' })
  @ValidateNested()
  @Type(() => ReturnPolicyDto)
  returns: ReturnPolicyDto;

  @ApiPropertyOptional({ description: 'Product variants' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  @IsOptional()
  variants?: ProductVariantDto[];

  @ApiPropertyOptional({ description: 'Bundle information' })
  @IsObject()
  @IsOptional()
  bundleInfo?: {
    isBundle: boolean;
    bundledProducts?: {
      productId: number;
      quantity: number;
    }[];
  };

  @ApiPropertyOptional({ description: 'SEO Metadata' })
  @IsObject()
  @IsOptional()
  seoMetadata?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
}
