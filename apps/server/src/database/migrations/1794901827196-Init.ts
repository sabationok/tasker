import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1794901827196 implements MigrationInterface {
    name = 'Init1794901827196'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "settings" ("key" text NOT NULL, "value" jsonb NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c8639b7626fa94ba8265628f214" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "api_keys" ("id" uuid NOT NULL, "name" text NOT NULL, "prefix" text NOT NULL, "key_hash" text NOT NULL, "webapp_secret" text NOT NULL, "webhook_secret" text NOT NULL, "events_url" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_used_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_57384430aa1959f4578046c9b81" UNIQUE ("key_hash"), CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "api_keys"`);
        await queryRunner.query(`DROP TABLE "settings"`);
    }

}
