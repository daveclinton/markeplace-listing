import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductMarketplaceListing } from './product-marketplace-listing.entity';
import { User } from '../../users/user.entity';

@Entity('products')
export class ProductEntity {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => User, (user) => user.products)
  @ApiProperty({ type: () => User })
  user: User;

  @ApiProperty({ example: 'uuid_123' })
  @Column({ type: 'uuid' })
  user_supabase_od: string;

  @ApiProperty({ example: 'DJI Mini 2 Drone' })
  @Column()
  title: string;

  @ApiProperty({ example: 'Brnad new Iphone well' })
  @Column('text')
  description: string;
  @ApiProperty({ example: '499.99' })
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @ApiProperty({ example: ['electronics', 'drones'] })
  @Column('simple-array', { nullable: true })
  categories: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => ProductMarketplaceListing, (listing) => listing.product)
  marketplace_listings: ProductMarketplaceListing[];
}
