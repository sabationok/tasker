import { Column, Entity, Generated, Index, JoinTable, ManyToMany, type Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import type { Recurrence } from '../../recurrence/recurrence.schema';
import { TagEntity } from '../../tags/entities/tag.entity';
import type { ItemEvaluation, ItemSource, ItemStatus, ItemType, SubtasksOrder } from '../types/item.types';

/** A task, idea or note. A task with `recurrence` is periodic; one with `parentId` is a thread of its parent. */
@Entity('items')
export class ItemEntity extends BaseEntity {
  @Column({ name: 'short_id', type: 'int', unique: true })
  @Generated('increment')
  shortId: number;

  @Column('text')
  type: ItemType;

  @Column('text')
  title: string;

  @Column('text', { nullable: true })
  body: string | null;

  @Column('text', { default: 'todo' })
  status: ItemStatus;

  /** `me` = the user; otherwise the slug of the agent whose to-do it is. */
  @Index('IDX_items_assignee')
  @Column('text', { default: 'me' })
  assignee: string;

  /** The hub connector an agent's to-do is about (check fintrack, look for new tasks in gmail); the body says what to do. */
  @Column('text', { nullable: true })
  connector: string | null;

  /**
   * The connector's tools the to-do will use, matched by the hub against the connector's own tool list when it was
   * queued (a to-do the connector cannot do is refused there). Set together with `connector`.
   */
  @Column({ name: 'connector_tools', type: 'jsonb', nullable: true })
  connectorTools: string[] | null;

  /** Who made it: `me` or an agent's slug (from the caller's key, never from input). */
  @Index('IDX_items_created_by')
  @Column({ name: 'created_by', type: 'text', default: 'me' })
  createdBy: string;

  @Column('smallint', { nullable: true })
  priority: number | null;

  @Index()
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Index()
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Index()
  @Column('date', { nullable: true })
  date: string | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt: Date | null;

  @Column('boolean', { default: false })
  pending: boolean;

  @Index()
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column('int', { default: 0 })
  position: number;

  @Column({ name: 'subtasks_order', type: 'text', default: 'any' })
  subtasksOrder: SubtasksOrder;

  @Column('jsonb', { nullable: true })
  recurrence: Recurrence | null;

  @Column({ name: 'starts_on', type: 'date', nullable: true })
  startsOn: string | null;

  @Column({ name: 'ends_on', type: 'date', nullable: true })
  endsOn: string | null;

  @Column('text', { default: 'yes_no' })
  evaluation: ItemEvaluation;

  @Column('jsonb', { nullable: true })
  source: ItemSource | null;

  @Column({ name: 'done_at', type: 'timestamptz', nullable: true })
  doneAt: Date | null;

  @ManyToMany(() => TagEntity)
  @JoinTable({ name: 'item_tags', joinColumn: { name: 'item_id' }, inverseJoinColumn: { name: 'tag_id' } })
  tags: Relation<TagEntity[]>;
}
