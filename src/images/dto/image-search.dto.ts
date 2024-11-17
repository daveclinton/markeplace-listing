import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class ImageSearchQueryDto {
  @ApiProperty({
    description: 'Search query for images',
    example: 'Macbook Pro',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    minimum: 1,
    maximum: 50,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Page number of pagination',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;
}
