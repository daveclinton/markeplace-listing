import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductEntity } from './product.entity';
import {
  ListingStatus,
  MarketplaceEnum,
} from 'src/common/enums/marketplace-enum';
import { ApiProperty } from '@nestjs/swagger';

@Entity('product_marketplace_listing')
export class ProductMarketplaceListing {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => ProductEntity, (product) => product.marketplace_listings)
  product: ProductEntity;

  @ApiProperty({ example: 'uuid-123' })
  @Column({ type: 'uuid' })
  user_supabase_id: string;
  @ApiProperty({ enum: MarketplaceEnum })
  @Column({ type: 'enum', enum: MarketplaceEnum })
  marketplace: MarketplaceEnum;

  @ApiProperty({ example: '123456789' })
  @Column({ nullable: true })
  marketplace_listing_id: string;

  @ApiProperty({ enum: ListingStatus })
  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.DRAFT })
  status: ListingStatus;
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
