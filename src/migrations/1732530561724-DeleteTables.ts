import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteTables1732530445972 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the products table
    await queryRunner.query(`DROP TABLE IF EXISTS products`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No rollback action since the table should be deleted permanently
  }
}
