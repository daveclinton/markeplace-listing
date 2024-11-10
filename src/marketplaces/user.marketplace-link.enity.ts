import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('user_marketplace_links')
export class UserMarketplaceLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userSupabaseId: string;

  @Column()
  marketplaceId: number;

  @Column({ default: false })
  isLinked: boolean;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'userSupabaseId',
    referencedColumnName: 'supabase_user_id',
  })
  user: User;
}
