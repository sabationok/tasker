import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { newId } from '../../common/entities/base.entity';

/** An ordered checklist line of an item. For a periodic task it is the template; done state lives on the occurrence. */
@Entity('checklist_items')
export class ChecklistItemEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column('text')
  title: string;

  @Column('int', { default: 0 })
  position: number;

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
