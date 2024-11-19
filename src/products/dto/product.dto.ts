import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsUrl,
  IsArray,
  ValidateNested,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus, InventoryStatus } from '../product.entity';

class InventoryTrackingDto {
  @ApiProperty({
    example: 100,
    description: 'Current quantity in stock',
  })
  @IsNumber()
  quantity: number;

  @ApiProperty({
    example: 10,
    description: 'Low stock threshold before reordering',
  })
  @IsNumber()
  lowStockThreshold: number;

  @ApiProperty({
    enum: InventoryStatus,
    description: 'Current inventory status',
  })
  @IsEnum(InventoryStatus)
  status: InventoryStatus;

  @ApiProperty({
    example: 'PROD-123',
    description: 'Unique SKU identifier for the product',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional({
    example: 'WAREHOUSE1',
    description: 'Storage location',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    example: true,
    description: 'Enable automatic reordering',
  })
  @IsBoolean()
  autoReorder: boolean;

  @ApiPropertyOptional({
    example: 50,
    description: 'Quantity to reorder when stock is low',
  })
  @IsNumber()
  @IsOptional()
  reorderQuantity?: number;
}

class ShippingDetailsDto {
  @ApiProperty({
    example: 'Standard Shipping',
    description: 'Shipping service name',
  })
  @IsString()
  service: string;

  @ApiProperty({
    example: '5.99',
    description: 'Shipping cost',
  })
  @IsString()
  cost: string;

  @ApiProperty({
    example: 3,
    description: 'Number of days to dispatch',
  })
  @IsNumber()
  dispatchDays: number;
}

class ProductCreationDto {
  @ApiProperty({
    example: 'Vintage Leather Jacket',
    description: 'Product title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'A beautifully crafted vintage leather jacket...',
    description: 'Detailed product description',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 'Clothing',
    description: 'Product category',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    example: 'New',
    description: 'Product condition',
  })
  @IsString()
  @IsNotEmpty()
  condition: string;

  @ApiProperty({
    example: 199.99,
    description: 'Base price of the product',
  })
  @IsNumber()
  basePrice: number;

  @ApiProperty({
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    description: 'Array of product image URLs',
  })
  @IsArray()
  @IsUrl({}, { each: true })
  pictures: string[];

  @ApiProperty({
    type: InventoryTrackingDto,
    description: 'Inventory tracking details',
  })
  @ValidateNested()
  @Type(() => InventoryTrackingDto)
  inventory: InventoryTrackingDto;

  @ApiProperty({
    type: ShippingDetailsDto,
    description: 'Shipping information',
  })
  @ValidateNested()
  @Type(() => ShippingDetailsDto)
  shipping: ShippingDetailsDto;

  @ApiPropertyOptional({
    example: { color: 'Black', size: 'Large' },
    description: 'Dynamic product specifics',
  })
  @IsOptional()
  specifics?: Record<string, string | number | boolean>;

  @ApiPropertyOptional({
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
    description: 'Initial product status',
  })
  @IsOptional()
  status?: ProductStatus;
}

export { ProductCreationDto };
