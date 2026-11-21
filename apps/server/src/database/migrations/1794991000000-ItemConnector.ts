import { MigrationInterface, QueryRunner } from "typeorm";

/** An agent's to-do about a hub connector: which one and which of its tools (matched by the hub). */
export class ItemConnector1794991000000 implements MigrationInterface {
    name = 'ItemConnector1794991000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "items" ADD "connector" text`);
        await queryRunner.query(`ALTER TABLE "items" ADD "connector_tools" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "items" DROP COLUMN "connector_tools"`);
        await queryRunner.query(`ALTER TABLE "items" DROP COLUMN "connector"`);
    }

}
