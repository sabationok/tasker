import { MigrationInterface, QueryRunner } from "typeorm";

export class Items1794902231844 implements MigrationInterface {
    name = 'Items1794902231844'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "reminders" ("id" uuid NOT NULL, "item_id" uuid, "habit_id" uuid, "at" TIMESTAMP WITH TIME ZONE, "time_of_day" TIME, "offset_min" integer, "last_fired_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_38715fec7f634b72c6cf7ea4893" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_afd3765a518b652258661cf982" ON "reminders" ("item_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ffbcc01678a3a3abcf97c2383d" ON "reminders" ("habit_id") `);
        await queryRunner.query(`CREATE TABLE "items" ("id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "short_id" SERIAL NOT NULL, "type" text NOT NULL, "title" text NOT NULL, "body" text, "status" text NOT NULL DEFAULT 'todo', "owner" text NOT NULL DEFAULT 'me', "priority" smallint, "category_id" uuid, "project_id" uuid, "date" date, "due_at" TIMESTAMP WITH TIME ZONE, "pending" boolean NOT NULL DEFAULT false, "parent_id" uuid, "position" integer NOT NULL DEFAULT '0', "subtasks_order" text NOT NULL DEFAULT 'any', "recurrence" jsonb, "starts_on" date, "ends_on" date, "evaluation" text NOT NULL DEFAULT 'yes_no', "source" jsonb, "done_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_40d415bcc4d9fa8982c5cbd7ded" UNIQUE ("short_id"), CONSTRAINT "PK_ba5885359424c15ca6b9e79bcf6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0c4aa809ddf5b0c6ca45d8a8e8" ON "items" ("category_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_a32a0c7e63e79456657be47add" ON "items" ("project_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3e097484f73015031a1855546c" ON "items" ("date") `);
        await queryRunner.query(`CREATE INDEX "IDX_650c28e8c95a2c22dee31c5f07" ON "items" ("parent_id") `);
        await queryRunner.query(`CREATE TABLE "item_occurrences" ("id" uuid NOT NULL, "item_id" uuid NOT NULL, "date" date NOT NULL, "slot" smallint NOT NULL DEFAULT '0', "status" text, "checklist_done" uuid array NOT NULL DEFAULT '{}', "note" text, "moved_to" date, "done_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_212407c2bdce9628a93c76053c3" UNIQUE ("item_id", "date", "slot"), CONSTRAINT "PK_4cda8e89ba4fb44f74c3deb2a01" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_10f142d1b1440a3517523087fb" ON "item_occurrences" ("item_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_9f1879dd049aba639ddb1455eb" ON "item_occurrences" ("moved_to") `);
        await queryRunner.query(`CREATE TABLE "checklist_items" ("id" uuid NOT NULL, "item_id" uuid NOT NULL, "title" text NOT NULL, "position" integer NOT NULL DEFAULT '0', "done_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bae00945a1d4789bd648e583e29" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f87e9aaf5c035a05a4d5ef1c36" ON "checklist_items" ("item_id") `);
        await queryRunner.query(`CREATE TABLE "item_tags" ("item_id" uuid NOT NULL, "tag_id" uuid NOT NULL, CONSTRAINT "PK_c77c2056c78ecfeecd875046803" PRIMARY KEY ("item_id", "tag_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d1bba39d4371f56d3e5e4ee9b8" ON "item_tags" ("item_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_986c538d3231d4fc0c2bdfc15a" ON "item_tags" ("tag_id") `);
        await queryRunner.query(`ALTER TABLE "item_tags" ADD CONSTRAINT "FK_d1bba39d4371f56d3e5e4ee9b80" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "item_tags" ADD CONSTRAINT "FK_986c538d3231d4fc0c2bdfc15ae" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "item_tags" DROP CONSTRAINT "FK_986c538d3231d4fc0c2bdfc15ae"`);
        await queryRunner.query(`ALTER TABLE "item_tags" DROP CONSTRAINT "FK_d1bba39d4371f56d3e5e4ee9b80"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_986c538d3231d4fc0c2bdfc15a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d1bba39d4371f56d3e5e4ee9b8"`);
        await queryRunner.query(`DROP TABLE "item_tags"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f87e9aaf5c035a05a4d5ef1c36"`);
        await queryRunner.query(`DROP TABLE "checklist_items"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9f1879dd049aba639ddb1455eb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_10f142d1b1440a3517523087fb"`);
        await queryRunner.query(`DROP TABLE "item_occurrences"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_650c28e8c95a2c22dee31c5f07"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3e097484f73015031a1855546c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a32a0c7e63e79456657be47add"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0c4aa809ddf5b0c6ca45d8a8e8"`);
        await queryRunner.query(`DROP TABLE "items"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ffbcc01678a3a3abcf97c2383d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_afd3765a518b652258661cf982"`);
        await queryRunner.query(`DROP TABLE "reminders"`);
    }

}
