import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { MarketplaceConnectionStatusEnums } from './marketplace-connection-status.enum';

@Entity('user_marketplace_links')
export class UserMarketplaceLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userSupabaseId: string;

  @Column()
  marketplaceId: number;

  @Column({
    type: 'enum',
    enum: MarketplaceConnectionStatusEnums,
    default: MarketplaceConnectionStatusEnums.DISCONNECTED,
  })
  connectionStatus: MarketplaceConnectionStatusEnums;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'userSupabaseId',
    referencedColumnName: 'supabase_user_id',
  })
  user: User;

  @Column({ nullable: true })
  accessToken: string;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ nullable: true })
  tokenExpiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastSyncAt: Date;

  @Column({ nullable: true })
  errorMessage: string;
}
