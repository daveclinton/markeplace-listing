import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserMarketplaceLink } from '../marketplaces/user.marketplace-link.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { ProductMarketplaceListing } from '../products/entities/product-marketplace-listing.entity';

@Entity('users')
export class User {
  @ApiProperty({
    example: 1,
    description: 'Auto-generated user ID',
  })
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Supabase User ID',
  })
  @Column({ type: 'uuid', unique: true })
  supabase_user_id: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'User creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToMany(() => UserMarketplaceLink, (marketplace) => marketplace.user)
  marketplaces: UserMarketplaceLink[];

  @OneToMany(() => ProductEntity, (product) => product.user)
  products: ProductEntity[];

  @OneToMany(() => ProductMarketplaceListing, (listing) => listing.user)
  marketplace_listings: ProductMarketplaceListing[];
}
