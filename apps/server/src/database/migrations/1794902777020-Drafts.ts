import { MigrationInterface, QueryRunner } from "typeorm";

export class Drafts1794902777020 implements MigrationInterface {
    name = 'Drafts1794902777020'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "drafts" ("id" uuid NOT NULL, "batch_id" uuid NOT NULL, "tool" text NOT NULL, "dto" jsonb NOT NULL, "preview" jsonb NOT NULL, "status" text NOT NULL DEFAULT 'draft', "result_id" uuid, "api_key_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_0598e229012c6cbd4ccbba97328" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_364f8407d3c8ae1416ac5911cd" ON "drafts" ("batch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c2d546a208946a6186de35386e" ON "drafts" ("expires_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_c2d546a208946a6186de35386e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_364f8407d3c8ae1416ac5911cd"`);
        await queryRunner.query(`DROP TABLE "drafts"`);
    }

}
