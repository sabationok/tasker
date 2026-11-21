import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { newId } from '../../common/entities/base.entity';
import type { DismissReason, DraftFieldChange, DraftOutcome, DraftStatus } from '../types/draft.types';

/** A validated, not yet executed tool call (dry run); saved, discarded or expired later. */
@Entity('drafts')
export class DraftEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'batch_id', type: 'uuid' })
  batchId: string;

  @Column('text')
  tool: string;

  @Column('jsonb')
  dto: Record<string, unknown>;

  @Column('jsonb')
  preview: Record<string, unknown>;

  @Column('text', { default: 'draft' })
  status: DraftStatus;

  @Column({ name: 'result_id', type: 'uuid', nullable: true })
  resultId: string | null;

  /** What was saved, for the hub's confirmation (`#12 Купити хліб`). */
  @Column({ name: 'result_label', type: 'text', nullable: true })
  resultLabel: string | null;

  @Column({ name: 'api_key_id', type: 'uuid', nullable: true })
  apiKeyId: string | null;

  /** accepted as is / edited / dismissed: the training signal (null while pending or when expired). */
  @Column('text', { nullable: true })
  outcome: DraftOutcome | null;

  /** Fields the user changed before saving (snake_case names). */
  @Column('jsonb', { nullable: true })
  changes: DraftFieldChange[] | null;

  /** Why the user dismissed it. */
  @Column('text', { nullable: true })
  reason: DismissReason | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Index()
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @BeforeInsert()
  protected assignId(): void {
    if (!this.id) this.id = newId();
  }
}
