import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { ChecklistService } from '../../../checklist/checklist.service';
import type { RequestCtx } from '../../../common/context/request-context';
import { AppException } from '../../../common/http/app-exception';
import type { FieldError } from '../../../common/http/error-codes';
import { msg } from '../../../common/i18n/messages';
import type { SplitTaskInput } from '../../dto/item.schemas';
import { ItemEntity } from '../../entities/item.entity';
import { lockedChildIds } from '../../helpers/is-thread-locked';

/** Threads: children of a task, in any order or sequential; the parent closes with its last child. */
@Injectable()
export class ItemThreadsService {
  constructor(
    @InjectRepository(ItemEntity) private readonly _items: Repository<ItemEntity>,
    @InjectDataSource() private readonly _ds: DataSource,
    private readonly _checklist: ChecklistService,
  ) {}

  async childrenOf(parentIds: string[], m: EntityManager = this._ds.manager): Promise<Map<string, ItemEntity[]>> {
    const out = new Map<string, ItemEntity[]>();
    if (!parentIds.length) return out;
    const rows = await m.find(ItemEntity, { where: { parentId: In(parentIds), deletedAt: IsNull() }, order: { position: 'ASC', createdAt: 'ASC' } });
    for (const r of rows) out.set(r.parentId as string, [...(out.get(r.parentId as string) ?? []), r]);
    return out;
  }

  /** Ids of the given children that are locked by a sequential parent. */
  async lockedIds(items: ItemEntity[]): Promise<Set<string>> {
    const parentIds = [...new Set(items.map((i) => i.parentId).filter((p): p is string => Boolean(p)))];
    if (!parentIds.length) return new Set();
    const parents = await this._items.findBy({ id: In(parentIds) });
    const children = await this.childrenOf(parentIds);
    const out = new Set<string>();
    for (const p of parents) for (const id of lockedChildIds(p, children.get(p.id) ?? [])) out.add(id);
    return out;
  }

  async isLocked(item: ItemEntity): Promise<boolean> {
    return item.parentId ? (await this.lockedIds([item])).has(item.id) : false;
  }

  /** Field errors for splitting a task. */
  async checkSplit(input: SplitTaskInput, ctx: RequestCtx): Promise<FieldError[]> {
    const parent = await this._items.findOneBy({ id: input.id });
    if (!parent) return [{ path: 'id', code: 'not-found:item', message: msg(ctx.locale, 'not-found:item') }];
    if (parent.type !== 'task') return [{ path: 'id', code: 'invalid:item:type-unsupported', message: msg(ctx.locale, 'invalid:item:type-unsupported') }];
    if (parent.recurrence) return [{ path: 'id', code: 'invalid:item:thread-periodic', message: msg(ctx.locale, 'invalid:item:thread-periodic') }];
    if (parent.parentId) return [{ path: 'id', code: 'invalid:args', message: 'A thread cannot have threads (one level only)' }];
    return [];
  }

  /** Adds threads to a task (after existing ones) and sets its order; the parent re-opens if it was done. */
  async split(input: SplitTaskInput, ctx: RequestCtx): Promise<string[]> {
    const errors = await this.checkSplit(input, ctx);
    if (errors.length) throw AppException.invalid(errors);
    return this._ds.transaction(async (m) => {
      const parent = await m.findOneOrFail(ItemEntity, { where: { id: input.id }, lock: { mode: 'pessimistic_write' } });
      const start = ((await m.maximum(ItemEntity, 'position', { parentId: parent.id })) ?? 0) + 1;
      const ids: string[] = [];
      for (const [i, t] of input.threads.entries()) {
        const child = await m.save(
          m.create(ItemEntity, { type: 'task', title: t.title, date: t.date ?? parent.date, categoryId: parent.categoryId, projectId: parent.projectId, owner: parent.owner, parentId: parent.id, position: start + i, status: 'todo' }),
        );
        if (t.checklist?.length) await this._checklist.replaceForItem(m, child.id, t.checklist);
        ids.push(child.id);
      }
      parent.subtasksOrder = input.order;
      await m.save(parent);
      await this.afterChildChange(m, parent.id);
      return ids;
    });
  }

  async reorder(parentId: string | null, ids: string[]): Promise<void> {
    await this._ds.transaction(async (m) => {
      for (const [i, id] of ids.entries()) await m.update(ItemEntity, { id, parentId: parentId ?? IsNull() }, { position: i + 1 });
    });
  }

  /** Closes the parent when every child is done, re-opens it when one is not. Locks the parent row. */
  async afterChildChange(m: EntityManager, parentId: string): Promise<void> {
    const parent = await m.findOne(ItemEntity, { where: { id: parentId }, lock: { mode: 'pessimistic_write' } });
    if (!parent) return;
    const children = (await this.childrenOf([parentId], m)).get(parentId) ?? [];
    if (!children.length) return;
    const allDone = children.every((c) => c.status === 'done' || c.status === 'archived');
    if (allDone && parent.status !== 'done') await m.update(ItemEntity, { id: parentId }, { status: 'done', doneAt: new Date() });
    if (!allDone && parent.status === 'done') await m.update(ItemEntity, { id: parentId }, { status: 'todo', doneAt: null });
  }

  /** Thread counts per parent. */
  async counts(parentIds: string[]): Promise<Map<string, { done: number; total: number }>> {
    const children = await this.childrenOf(parentIds);
    return new Map([...children].map(([id, list]) => [id, { done: list.filter((c) => c.status === 'done').length, total: list.length }]));
  }
}
