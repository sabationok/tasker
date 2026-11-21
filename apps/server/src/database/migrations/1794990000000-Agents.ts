import { MigrationInterface, QueryRunner } from "typeorm";

/** Agents; items.owner → items.assignee ('me' | agent slug) + items.created_by. Seeds mia and claude. */
export class Agents1794990000000 implements MigrationInterface {
    name = 'Agents1794990000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "agents" ("id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "slug" text NOT NULL, "name" text NOT NULL, "icon" text, "color" text, "description" text, "api_key_id" uuid, CONSTRAINT "UQ_agents_slug" UNIQUE ("slug"), CONSTRAINT "UQ_agents_api_key_id" UNIQUE ("api_key_id"), CONSTRAINT "PK_agents" PRIMARY KEY ("id"))`);
        await queryRunner.query(`INSERT INTO "agents" ("id", "slug", "name", "icon", "color", "description") VALUES
            ('019a9b00-0000-7000-8000-000000000001', 'mia', 'Mia', '✦', '#7C5CFF', 'Асистентка: бере свої задачі й просить тебе про твої'),
            ('019a9b00-0000-7000-8000-000000000002', 'claude', 'Claude', '◆', '#D97757', 'Агент для задач розробки')`);
        await queryRunner.query(`ALTER TABLE "items" RENAME COLUMN "owner" TO "assignee"`);
        await queryRunner.query(`ALTER TABLE "items" ADD "created_by" text NOT NULL DEFAULT 'me'`);
        await queryRunner.query(`UPDATE "items" SET "created_by" = "source"->>'client' WHERE "source"->>'client' IN (SELECT "slug" FROM "agents")`);
        await queryRunner.query(`CREATE INDEX "IDX_items_assignee" ON "items" ("assignee") `);
        await queryRunner.query(`CREATE INDEX "IDX_items_created_by" ON "items" ("created_by") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_items_created_by"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_items_assignee"`);
        await queryRunner.query(`ALTER TABLE "items" DROP COLUMN "created_by"`);
        await queryRunner.query(`UPDATE "items" SET "assignee" = 'me' WHERE "assignee" NOT IN ('me', 'claude')`);
        await queryRunner.query(`ALTER TABLE "items" RENAME COLUMN "assignee" TO "owner"`);
        await queryRunner.query(`DROP TABLE "agents"`);
    }

}
