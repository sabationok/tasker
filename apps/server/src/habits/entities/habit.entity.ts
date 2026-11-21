import { Column, Entity, Generated } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { numericTransformer } from '../../common/entities/numeric.transformer';
import type { Recurrence } from '../../recurrence/recurrence.schema';
import type { HabitEvaluation, HabitGoals, HabitStatus, TargetCondition } from '../types/habit.types';

/** Something to repeat, evaluated per scheduled day by `evaluation` against an optional target. */
@Entity('habits')
export class HabitEntity extends BaseEntity {
  @Column({ name: 'short_id', type: 'int', unique: true })
  @Generated('increment')
  shortId: number;

  @Column('text')
  name: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column('smallint', { nullable: true })
  priority: number | null;

  @Column('text')
  evaluation: HabitEvaluation;

  @Column({ name: 'target_value', type: 'numeric', nullable: true, transformer: numericTransformer })
  targetValue: number | null;

  @Column({ name: 'target_condition', type: 'text', nullable: true })
  targetCondition: TargetCondition | null;

  @Column('text', { nullable: true })
  unit: string | null;

  @Column({ name: 'checklist_min', type: 'int', nullable: true })
  checklistMin: number | null;

  @Column('jsonb')
  recurrence: Recurrence;

  @Column({ name: 'starts_on', type: 'date' })
  startsOn: string;

  @Column({ name: 'ends_on', type: 'date', nullable: true })
  endsOn: string | null;

  @Column('jsonb', { default: () => "'{}'" })
  goals: HabitGoals;

  @Column({ name: 'notes_enabled', type: 'boolean', default: false })
  notesEnabled: boolean;

  @Column('text', { default: 'active' })
  status: HabitStatus;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @Column('int', { default: 0 })
  position: number;
}
