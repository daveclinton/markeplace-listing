import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { MarketplaceSlug } from '../marketplace.types';

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