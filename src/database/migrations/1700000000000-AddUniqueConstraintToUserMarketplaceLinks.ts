import {
  MigrationInterface,
  QueryRunner,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class AddUniqueConstraintToUserMarketplaceLinks1700000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add unique constraint
    await queryRunner.createUniqueConstraint(
      'user_marketplace_links',
      new TableUnique({
        name: 'UQ_user_marketplace',
        columnNames: ['userSupabaseId', 'marketplaceId'],
      }),
    );

    // Add individual indexes if they don't exist
    await queryRunner.createIndex(
      'user_marketplace_links',
      new TableIndex({
        name: 'IDX_user_marketplace_user',
        columnNames: ['userSupabaseId'],
      }),
    );

    await queryRunner.createIndex(
      'user_marketplace_links',
      new TableIndex({
        name: 'IDX_user_marketplace_marketplace',
        columnNames: ['marketplaceId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove unique constraint
    await queryRunner.dropUniqueConstraint(
      'user_marketplace_links',
      'UQ_user_marketplace',
    );

    // Remove indexes
    await queryRunner.dropIndex(
      'user_marketplace_links',
      'IDX_user_marketplace_user',
    );

    await queryRunner.dropIndex(
      'user_marketplace_links',
      'IDX_user_marketplace_marketplace',
    );
  }
}
