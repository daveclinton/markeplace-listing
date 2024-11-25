import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeTables11732536124318 implements MigrationInterface {
    name = 'ChangeTables11732536124318'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_6a84b2803d26ad451d3553da5da"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c44ac33a05b144dd0d9ddcf932"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8d31efd037a7a90fc8a5616df7"`);
        await queryRunner.query(`CREATE TYPE "public"."product_marketplace_listing_marketplace_enum" AS ENUM('EBAY', 'FACEBOOK')`);
        await queryRunner.query(`CREATE TYPE "public"."product_marketplace_listing_status_enum" AS ENUM('DRAFT', 'PENDING', 'ACTIVE', 'PAUSED', 'ENDED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "product_marketplace_listing" ("id" SERIAL NOT NULL, "user_supabase_id" uuid NOT NULL, "marketplace" "public"."product_marketplace_listing_marketplace_enum" NOT NULL, "marketplace_listing_id" character varying, "status" "public"."product_marketplace_listing_status_enum" NOT NULL DEFAULT 'DRAFT', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "productId" integer, "userId" integer, CONSTRAINT "PK_45ada8edd1ad881d8fb85f30d14" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "category"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "condition"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "basePrice"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "priceHistory"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "pictures"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "specifics"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "shipping"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "returns"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "inventory"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."products_status_enum"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "marketplaceData"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "seoMetadata"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "variants"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "bundleInfo"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "sku"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "version"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "userSupabaseId"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "user_supabase_od" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "price" numeric(10,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "categories" text`);
        await queryRunner.query(`ALTER TABLE "products" ADD "userId" integer`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "title" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "product_marketplace_listing" ADD CONSTRAINT "FK_dcdbcb894f13bad9ffd73bcfe88" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_marketplace_listing" ADD CONSTRAINT "FK_ec36c41b623eb65b9532f2a4daf" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_99d90c2a483d79f3b627fb1d5e9" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_99d90c2a483d79f3b627fb1d5e9"`);
        await queryRunner.query(`ALTER TABLE "product_marketplace_listing" DROP CONSTRAINT "FK_ec36c41b623eb65b9532f2a4daf"`);
        await queryRunner.query(`ALTER TABLE "product_marketplace_listing" DROP CONSTRAINT "FK_dcdbcb894f13bad9ffd73bcfe88"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "title" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "categories"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "price"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "user_supabase_od"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "userSupabaseId" uuid`);
        await queryRunner.query(`ALTER TABLE "products" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "products" ADD "version" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "sku" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327" UNIQUE ("sku")`);
        await queryRunner.query(`ALTER TABLE "products" ADD "bundleInfo" jsonb`);
        await queryRunner.query(`ALTER TABLE "products" ADD "variants" jsonb`);
        await queryRunner.query(`ALTER TABLE "products" ADD "seoMetadata" jsonb`);
        await queryRunner.query(`ALTER TABLE "products" ADD "marketplaceData" jsonb`);
        await queryRunner.query(`CREATE TYPE "public"."products_status_enum" AS ENUM('draft', 'pending_review', 'listed', 'delisted', 'suspended')`);
        await queryRunner.query(`ALTER TABLE "products" ADD "status" "public"."products_status_enum" NOT NULL DEFAULT 'draft'`);
        await queryRunner.query(`ALTER TABLE "products" ADD "inventory" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "returns" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "shipping" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "specifics" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "pictures" text array NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "priceHistory" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "basePrice" numeric(10,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "condition" character varying(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "category" character varying(100) NOT NULL`);
        await queryRunner.query(`DROP TABLE "product_marketplace_listing"`);
        await queryRunner.query(`DROP TYPE "public"."product_marketplace_listing_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."product_marketplace_listing_marketplace_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_8d31efd037a7a90fc8a5616df7" ON "products" ("category", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c44ac33a05b144dd0d9ddcf932" ON "products" ("sku") `);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_6a84b2803d26ad451d3553da5da" FOREIGN KEY ("userSupabaseId") REFERENCES "users"("supabase_user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
