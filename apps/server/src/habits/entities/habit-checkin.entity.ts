import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';
import { newId } from '../../common/entities/base.entity';
import { numericTransformer } from '../../common/entities/numeric.transformer';
import type { CheckinStatus } from '../types/habit.types';

/** A habit's result on one day (and slot). `status` null = partial (below target). */
@Entity('habit_checkins')
@Unique(['habitId', 'date', 'slot'])
export class HabitCheckinEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'habit_id', type: 'uuid' })
  habitId: string;

  @Column('date')
  date: string;

  @Column('smallint', { default: 0 })
  slot: number;

  @Column('text', { nullable: true })
  status: CheckinStatus | null;

  @Column('numeric', { nullable: true, transformer: numericTransformer })
  value: number | null;

  @Column({ name: 'checklist_done', type: 'uuid', array: true, default: () => "'{}'" })
  checklistDone: string[];

  @Column('text', { nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  protected assignId(): void {
    if (!this.id) this.id = newId();
  }
}
