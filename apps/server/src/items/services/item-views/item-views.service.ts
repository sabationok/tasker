import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CategoriesService } from '../../../categories/categories.service';
import { ChecklistService } from '../../../checklist/checklist.service';
import { ProjectEntity } from '../../../projects/entities/project.entity';
import { RemindersService } from '../../../reminders/reminders.service';
import { ItemEntity } from '../../entities/item.entity';
import type { CategoryRef, ItemView } from '../../types/item-view.types';
import { ItemThreadsService } from '../item-threads/item-threads.service';

/** Builds `ItemView`s in batches (no N+1). */
@Injectable()
export class ItemViewsService {
  constructor(
    @InjectRepository(ItemEntity) private readonly _items: Repository<ItemEntity>,
    @InjectRepository(ProjectEntity) private readonly _projects: Repository<ProjectEntity>,
    private readonly _categories: CategoriesService,
    private readonly _checklist: ChecklistService,
    private readonly _reminders: RemindersService,
    private readonly _threads: ItemThreadsService,
  ) {}

  async byIds(ids: string[]): Promise<ItemView[]> {
    const rows = await this._items.find({ where: { id: In(ids) }, relations: { tags: true } });
    const order = new Map(ids.map((id, i) => [id, i]));
    return this.toViews(rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
  }

  async one(id: string): Promise<ItemView> {
    return (await this.byIds([id]))[0];
  }

  async toViews(items: ItemEntity[]): Promise<ItemView[]> {
    if (!items.length) return [];
    const ids = items.map((i) => i.id);
    const [categories, projects, lines, reminders, threads, locked] = await Promise.all([
      this._categories.findByIds([...new Set(items.map((i) => i.categoryId).filter((x): x is string => Boolean(x)))]),
      this._projects.find({ where: { id: In([...new Set(items.map((i) => i.projectId).filter((x): x is string => Boolean(x)))]) }, withDeleted: true }),
      this._checklist.linesByItem(ids),
      this._reminders.viewsByOwner('itemId', ids),
      this._threads.counts(ids),
      this._threads.lockedIds(items),
    ]);
    const cat = new Map<string, CategoryRef>(categories.map((c) => [c.id, { id: c.id, name: c.name, icon: c.icon, color: c.color }]));
    const proj = new Map(projects.map((p) => [p.id, { id: p.id, name: p.name }]));
    return items.map((i) => ({
      id: i.id,
      shortId: i.shortId,
      type: i.type,
      title: i.title,
      body: i.body,
      status: i.status,
      assignee: i.assignee,
      createdBy: i.createdBy,
      connector: i.connector,
      connectorTools: i.connectorTools,
      priority: i.priority,
      date: i.date,
      dueAt: i.dueAt?.toISOString() ?? null,
      pending: i.pending,
      parentId: i.parentId,
      position: i.position,
      subtasksOrder: i.subtasksOrder,
      recurrence: i.recurrence,
      startsOn: i.startsOn,
      endsOn: i.endsOn,
      evaluation: i.evaluation,
      source: i.source,
      doneAt: i.doneAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
      category: (i.categoryId && cat.get(i.categoryId)) || null,
      project: (i.projectId && proj.get(i.projectId)) || null,
      tags: (i.tags ?? []).map((t) => ({ id: t.id, name: t.name })),
      checklist: (lines.get(i.id) ?? []).map((l) => ({ id: l.id, title: l.title, position: l.position, done: !i.recurrence && Boolean(l.doneAt) })),
      reminders: reminders.get(i.id) ?? [],
      threads: threads.get(i.id) ?? null,
      locked: locked.has(i.id),
    }));
  }
}
