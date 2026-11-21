import { BeforeInsert, CreateDateColumn, DeleteDateColumn, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

/** id (UUIDv7), timestamps and soft delete for every table that has them. */
export abstract class BaseEntity {
  @PrimaryColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @BeforeInsert()
  protected assignId(): void {
    if (!this.id) this.id = uuidv7();
  }
}

export const newId = (): string => uuidv7();
