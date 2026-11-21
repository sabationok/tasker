import { MigrationInterface, QueryRunner } from "typeorm";
import { v7 as uuidv7 } from "uuid";
import { SEED_CATEGORIES } from "../../categories/constants/seed-categories";

export class Catalog1794901907602 implements MigrationInterface {
    name = 'Catalog1794901907602'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tags" ("id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" text NOT NULL, CONSTRAINT "UQ_d90243459a697eadb8ad56e9092" UNIQUE ("name"), CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" text NOT NULL, "slug" text NOT NULL, "archived_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_96e045ab8b0271e5f5a91eae1ee" UNIQUE ("slug"), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" text NOT NULL, "icon" text NOT NULL, "color" text NOT NULL, "position" integer NOT NULL DEFAULT '0', "is_default" boolean NOT NULL DEFAULT false, "archived_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
            for (const [i, c] of SEED_CATEGORIES.entries()) {
            await queryRunner.query(`INSERT INTO "categories" ("id", "name", "icon", "color", "position", "is_default") VALUES ($1, $2, $3, $4, $5, $6)`, [uuidv7(), c.name, c.icon, c.color, i + 1, "isDefault" in c ? c.isDefault : false]);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP TABLE "tags"`);
    }

}
