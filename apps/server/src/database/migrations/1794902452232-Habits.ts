import { MigrationInterface, QueryRunner } from "typeorm";

export class Habits1794902452232 implements MigrationInterface {
    name = 'Habits1794902452232'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "habits" ("id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "short_id" SERIAL NOT NULL, "name" text NOT NULL, "description" text, "category_id" uuid, "priority" smallint, "evaluation" text NOT NULL, "target_value" numeric, "target_condition" text, "unit" text, "checklist_min" integer, "recurrence" jsonb NOT NULL, "starts_on" date NOT NULL, "ends_on" date, "goals" jsonb NOT NULL DEFAULT '{}', "notes_enabled" boolean NOT NULL DEFAULT false, "status" text NOT NULL DEFAULT 'active', "archived_at" TIMESTAMP WITH TIME ZONE, "position" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_fafe00094a8b92a9826b2bf2e73" UNIQUE ("short_id"), CONSTRAINT "PK_b3ec33c2d7af69d09fcf4af7e39" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "habit_checklist_items" ("id" uuid NOT NULL, "habit_id" uuid NOT NULL, "title" text NOT NULL, "position" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_decb15548a4e1161e2a704263cf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_19474e38da00407ef64fc35bb3" ON "habit_checklist_items" ("habit_id") `);
        await queryRunner.query(`CREATE TABLE "habit_checkins" ("id" uuid NOT NULL, "habit_id" uuid NOT NULL, "date" date NOT NULL, "slot" smallint NOT NULL DEFAULT '0', "status" text, "value" numeric, "checklist_done" uuid array NOT NULL DEFAULT '{}', "note" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_d078d5db33fa70562e3891859c2" UNIQUE ("habit_id", "date", "slot"), CONSTRAINT "PK_b323498410020c3418f375021f2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6e32a066c7b831482f69bd32c3" ON "habit_checkins" ("habit_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_6e32a066c7b831482f69bd32c3"`);
        await queryRunner.query(`DROP TABLE "habit_checkins"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_19474e38da00407ef64fc35bb3"`);
        await queryRunner.query(`DROP TABLE "habit_checklist_items"`);
        await queryRunner.query(`DROP TABLE "habits"`);
    }

}
