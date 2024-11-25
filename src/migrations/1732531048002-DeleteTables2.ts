import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteTables21732531048002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS products`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
