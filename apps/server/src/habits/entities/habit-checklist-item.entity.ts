import { BeforeInsert, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { newId } from '../../common/entities/base.entity';

@Entity('habit_checklist_items')
export class HabitChecklistItemEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'habit_id', type: 'uuid' })
  habitId: string;

  @Column('text')
  title: string;

  @Column('int', { default: 0 })
  position: number;

  @BeforeInsert()
  protected assignId(): void {
    if (!this.id) this.id = newId();
  }
}
