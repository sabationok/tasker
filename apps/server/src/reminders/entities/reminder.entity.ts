import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { newId } from '../../common/entities/base.entity';

/** A reminder of an item or a habit: an absolute `at`, a daily `timeOfDay`, or `offsetMin` before the item's `dueAt`. */
@Entity('reminders')
export class ReminderEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'item_id', type: 'uuid', nullable: true })
  itemId: string | null;

  @Index()
  @Column({ name: 'habit_id', type: 'uuid', nullable: true })
  habitId: string | null;

  @Column('timestamptz', { nullable: true })
  at: Date | null;

  @Column({ name: 'time_of_day', type: 'time', nullable: true })
  timeOfDay: string | null;

  @Column({ name: 'offset_min', type: 'int', nullable: true })
  offsetMin: number | null;

  @Column({ name: 'last_fired_at', type: 'timestamptz', nullable: true })
  lastFiredAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @BeforeInsert()
  protected assignId(): void {
    if (!this.id) this.id = newId();
  }
}
