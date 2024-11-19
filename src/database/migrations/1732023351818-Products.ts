import { MigrationInterface, QueryRunner } from "typeorm";

export class Products1732023351818 implements MigrationInterface {
    name = 'Products1732023351818'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."products_status_enum" AS ENUM('draft', 'pending_review', 'listed', 'delisted', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "products" ("id" SERIAL NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "category" character varying(100) NOT NULL, "condition" character varying(50) NOT NULL, "basePrice" numeric(10,2) NOT NULL, "priceHistory" jsonb NOT NULL, "pictures" text array NOT NULL, "specifics" jsonb NOT NULL, "shipping" jsonb NOT NULL, "returns" jsonb NOT NULL, "inventory" jsonb NOT NULL, "status" "public"."products_status_enum" NOT NULL DEFAULT 'draft', "marketplaceData" jsonb, "seoMetadata" jsonb, "variants" jsonb, "bundleInfo" jsonb, "sku" character varying(100) NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "userSupabaseId" uuid, CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327" UNIQUE ("sku"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c44ac33a05b144dd0d9ddcf932" ON "products" ("sku") `);
        await queryRunner.query(`CREATE INDEX "IDX_8d31efd037a7a90fc8a5616df7" ON "products" ("category", "status") `);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_6a84b2803d26ad451d3553da5da" FOREIGN KEY ("userSupabaseId") REFERENCES "users"("supabase_user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_6a84b2803d26ad451d3553da5da"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8d31efd037a7a90fc8a5616df7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c44ac33a05b144dd0d9ddcf932"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TYPE "public"."products_status_enum"`);
    }

}
