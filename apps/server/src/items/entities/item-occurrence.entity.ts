import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';
import { newId } from '../../common/entities/base.entity';
import type { OccurrenceStatus } from '../types/item.types';

/** Something that happened to one scheduled slot of a periodic task. `status` null = only ticked or moved. */
@Entity('item_occurrences')
@Unique(['itemId', 'date', 'slot'])
export class ItemOccurrenceEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column('date')
  date: string;

  @Column('smallint', { default: 0 })
  slot: number;

  @Column('text', { nullable: true })
  status: OccurrenceStatus | null;

  @Column({ name: 'checklist_done', type: 'uuid', array: true, default: () => "'{}'" })
  checklistDone: string[];

  @Column('text', { nullable: true })
  note: string | null;

  @Index()
  @Column({ name: 'moved_to', type: 'date', nullable: true })
  movedTo: string | null;

  @Column({ name: 'done_at', type: 'timestamptz', nullable: true })
  doneAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  protected assignId(): void {
    if (!this.id) this.id = newId();
  }
}
