import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/user.entity';
import { UserMarketplaceLink } from '../marketplaces/user.marketplace-link.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { ProductMarketplaceListing } from '../products/entities/product-marketplace-listing.entity';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.SUPABASE_DB_HOST,
  port: parseInt(process.env.SUPABASE_DB_PORT || '6543'),
  username: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME,
  entities: [
    User,
    UserMarketplaceLink,
    ProductEntity,
    ProductMarketplaceListing,
  ],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  migrationsRun: true,
  ssl: process.env.SUPABASE_DB_SSL === 'true',
  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
  logging: process.env.NODE_ENV === 'development',
  synchronize: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
