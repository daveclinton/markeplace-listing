import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { MarketplaceSlug } from '../marketplace.types';
import { MarketplaceConnectionStatusEnums } from '../marketplace-connection-status.enum';

export class LinkMarketplaceDto {
  @ApiProperty({
    enum: ['ebay', 'facebook'],
    description: 'Marketplace identifier',
  })
  @IsEnum(['ebay', 'facebook'])
  marketplace: MarketplaceSlug;

  @ApiProperty({
    description: 'Whether to link or unlink the marketplace',
  })
  @IsBoolean()
  link: boolean;
}

export class OAuthCallbackDto {
  @ApiProperty({
    description: 'Authorization code from OAuth provider',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'User Supabase ID',
  })
  @IsUUID()
  userSupabaseId: string;

  @ApiProperty({
    enum: ['ebay', 'facebook'],
    description: 'Marketplace identifier',
  })
  @IsEnum(['ebay', 'facebook'])
  marketplace: MarketplaceSlug;

  @ApiProperty({
    description: 'OAuth state parameter for security validation',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  expires_in?: string;
}

export class GenerateOAuthUrlDto {
  @ApiProperty({
    enum: ['ebay', 'facebook'],
    description: 'Marketplace identifier',
  })
  @IsEnum(['ebay', 'facebook'])
  marketplace: MarketplaceSlug;

  @ApiProperty({
    description: 'User Supabase ID',
  })
  @IsUUID()
  userSupabaseId: string;
}

export class UpdateMarketplaceStatusDto {
  @ApiProperty({
    enum: MarketplaceConnectionStatusEnums,
    description: 'The new status for the marketplace connection',
  })
  @IsEnum(MarketplaceConnectionStatusEnums)
  status: MarketplaceConnectionStatusEnums;

  @ApiProperty({ required: false, description: 'Error message if any' })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
