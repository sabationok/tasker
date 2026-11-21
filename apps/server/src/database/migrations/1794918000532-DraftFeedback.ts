import { MigrationInterface, QueryRunner } from "typeorm";

export class DraftFeedback1794918000532 implements MigrationInterface {
    name = 'DraftFeedback1794918000532'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drafts" ADD "outcome" text`);
        await queryRunner.query(`ALTER TABLE "drafts" ADD "changes" jsonb`);
        await queryRunner.query(`ALTER TABLE "drafts" ADD "reason" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drafts" DROP COLUMN "reason"`);
        await queryRunner.query(`ALTER TABLE "drafts" DROP COLUMN "changes"`);
        await queryRunner.query(`ALTER TABLE "drafts" DROP COLUMN "outcome"`);
    }

}
