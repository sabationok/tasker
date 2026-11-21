import { MigrationInterface, QueryRunner } from "typeorm";

export class DraftLabel1794915275748 implements MigrationInterface {
    name = 'DraftLabel1794915275748'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drafts" ADD "result_label" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drafts" DROP COLUMN "result_label"`);
    }

}
