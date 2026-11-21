import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, In, IsNull, Not, Repository } from 'typeorm';
import { AgentsService } from '../../../agents/agents.service';
import { CategoriesService } from '../../../categories/categories.service';
import { ChecklistService } from '../../../checklist/checklist.service';
import type { RequestCtx } from '../../../common/context/request-context';
import { AppException } from '../../../common/http/app-exception';
import type { FieldError, LookupResult } from '../../../common/http/error-codes';
import { localDateOf } from '../../../common/helpers/local-date';
import { rankTextMatches } from '../../../common/helpers/rank-text-matches';
import { msg } from '../../../common/i18n/messages';
import { ProjectsService } from '../../../projects/projects.service';
import type { ReminderInput } from '../../../reminders/dto/reminder-input.schema';
import { RemindersService } from '../../../reminders/reminders.service';
import { TagEntity } from '../../../tags/entities/tag.entity';
import { TagsService } from '../../../tags/tags.service';
import type { CreateItemInput, FindManyItemsQuery, UpdateItemInput } from '../../dto/item.schemas';
import { ItemEntity } from '../../entities/item.entity';
import type { ItemView } from '../../types/item-view.types';
import { ItemThreadsService } from '../item-threads/item-threads.service';
import { ItemViewsService } from '../item-views/item-views.service';

type ItemShape = Pick<ItemEntity, 'type' | 'recurrence' | 'parentId' | 'dueAt'> & { hasChildren: boolean };

/** Items: tasks (single, periodic, threads), ideas and notes. Validation lives here, so REST and MCP share it. */
@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(ItemEntity) private readonly _repo: Repository<ItemEntity>,
    @InjectDataSource() private readonly _ds: DataSource,
    private readonly _categories: CategoriesService,
    private readonly _projects: ProjectsService,
    private readonly _tags: TagsService,
    private readonly _checklist: ChecklistService,
    private readonly _reminders: RemindersService,
    private readonly _threads: ItemThreadsService,
    private readonly _views: ItemViewsService,
    private readonly _agents: AgentsService,
  ) {}

  async checkCreate(input: CreateItemInput, ctx: RequestCtx): Promise<FieldError[]> {
    return this._check(input, { type: input.type, recurrence: input.recurrence ?? null, parentId: input.parentId ?? null, dueAt: input.dueAt ? new Date(input.dueAt) : null, hasChildren: false }, ctx);
  }

  async checkUpdate(input: UpdateItemInput, ctx: RequestCtx): Promise<FieldError[]> {
    const current = await this._repo.findOneBy({ id: input.id });
    if (!current) return [{ path: 'id', code: 'not-found:item', message: msg(ctx.locale, 'not-found:item') }];
    const hasChildren = await this._repo.exists({ where: { parentId: current.id, deletedAt: IsNull() } });
    const shape: ItemShape = {
      type: input.type ?? current.type,
      recurrence: input.recurrence !== undefined ? input.recurrence : current.recurrence,
      parentId: input.parentId !== undefined ? input.parentId : current.parentId,
      dueAt: input.dueAt !== undefined ? (input.dueAt ? new Date(input.dueAt) : null) : current.dueAt,
      hasChildren,
    };
    const errors = await this._check(input, shape, ctx, current);
    if (input.parentId === current.id) errors.push({ path: 'parentId', code: 'invalid:args', message: 'An item cannot be its own parent' });
    return errors;
  }

  async create(input: CreateItemInput, ctx: RequestCtx): Promise<ItemView> {
    const errors = await this.checkCreate(input, ctx);
    if (errors.length) throw AppException.invalid(errors);
    const id = await this._ds.transaction(async (m) => {
      const row = m.create(ItemEntity, {
        ...this._columns(input, ctx),
        type: input.type,
        title: input.title,
        status: input.status ?? 'todo',
        assignee: input.assignee ?? 'me',
        createdBy: ctx.agentSlug ?? 'me',
        categoryId: input.categoryId ?? (await this._categories.defaultId()),
        doneAt: input.status === 'done' ? new Date() : null,
      });
      if (row.parentId) row.position = ((await m.maximum(ItemEntity, 'position', { parentId: row.parentId })) ?? 0) + 1;
      if (input.recurrence && !row.startsOn) row.startsOn = localDateOf(ctx.now, ctx.timeZone);
      if (input.tagIds?.length) row.tags = await m.findBy(TagEntity, { id: In(input.tagIds) });
      const saved = await m.save(row);
      await this._writeChildren(m, saved.id, input.checklist, this._remindersOf(input));
      if (saved.parentId) await this._threads.afterChildChange(m, saved.parentId);
      return saved.id;
    });
    return this._views.one(id);
  }

  async update(input: UpdateItemInput, ctx: RequestCtx): Promise<ItemView> {
    const errors = await this.checkUpdate(input, ctx);
    if (errors.length) throw AppException.invalid(errors);
    await this._ds.transaction(async (m) => {
      const row = await m.findOneOrFail(ItemEntity, { where: { id: input.id }, relations: { tags: true } });
      const oldParent = row.parentId;
      Object.assign(row, this._columns(input, ctx));
      for (const key of ['type', 'title', 'assignee', 'categoryId'] as const) if (input[key] !== undefined) Object.assign(row, { [key]: input[key] });
      const closing = input.status === 'done' && row.status !== 'done';
      const dueMoved = input.dueAt !== undefined && (row.dueAt?.toISOString() ?? null) !== (input.dueAt ? new Date(input.dueAt).toISOString() : null);
      if (input.status !== undefined && input.status !== row.status) {
        row.status = input.status;
        row.doneAt = input.status === 'done' ? new Date() : null;
      }
      if (row.recurrence && !row.startsOn) row.startsOn = localDateOf(ctx.now, ctx.timeZone);
      if (input.parentId !== undefined && input.parentId !== oldParent && input.parentId) row.position = ((await m.maximum(ItemEntity, 'position', { parentId: input.parentId })) ?? 0) + 1;
      if (input.tagIds !== undefined) row.tags = input.tagIds.length ? await m.findBy(TagEntity, { id: In(input.tagIds) }) : [];
      await m.save(row);
      // closing a parent directly closes its open threads too (spec §11.3), as complete_item does
      if (closing) await m.update(ItemEntity, { parentId: row.id, status: Not(In(['done', 'archived'])), deletedAt: IsNull() }, { status: 'done', doneAt: new Date() });
      if (dueMoved) await this._reminders.resetOffsetFirings(m, row.id);
      await this._writeChildren(m, row.id, input.checklist, input.reminders !== undefined ? this._remindersOf(input) : undefined);
      if (input.reminders === undefined && input.remindAt) await this._reminders.replaceForOwner(m, { itemId: row.id }, [...(await this._reminders.inputsOf(m, row.id)), { at: input.remindAt }]);
      for (const p of new Set([oldParent, row.parentId])) if (p) await this._threads.afterChildChange(m, p);
    });
    return this._views.one(input.id);
  }

  /** Soft-deletes an item with its threads. */
  async delete(id: string): Promise<{ deleted: string[] }> {
    const row = await this.getOrFail(id);
    const children = (await this._threads.childrenOf([id])).get(id) ?? [];
    const ids = [id, ...children.map((c) => c.id)];
    await this._ds.transaction(async (m) => {
      await m.softDelete(ItemEntity, { id: In(ids) });
      if (row.parentId) await this._threads.afterChildChange(m, row.parentId);
    });
    return { deleted: ids };
  }

  async getOrFail(id: string): Promise<ItemEntity> {
    const row = await this._repo.findOneBy({ id });
    if (!row) throw AppException.notFound('not-found:item', 'id');
    return row;
  }

  /** Rows by id (internal callers: the reminder sweep). */
  findByIds(ids: string[]): Promise<ItemEntity[]> {
    return ids.length ? this._repo.findBy({ id: In(ids) }) : Promise.resolve([]);
  }

  get(id: string): Promise<ItemView> {
    return this.getOrFail(id).then(() => this._views.one(id));
  }

  async findMany(q: FindManyItemsQuery): Promise<{ items: ItemView[]; count: number; pagination: { limit: number; offset: number } }> {
    const qb = this._repo.createQueryBuilder('i').leftJoinAndSelect('i.tags', 't').orderBy('i.createdAt', 'DESC').take(q.limit).skip(q.offset);
    if (q.type) qb.andWhere('i.type = :type', { type: q.type });
    if (q.status) qb.andWhere('i.status = :status', { status: q.status });
    if (q.open) qb.andWhere("i.status NOT IN ('done','archived')");
    if (q.categoryId) qb.andWhere('i.category_id = :c', { c: q.categoryId });
    if (q.projectId) qb.andWhere('i.project_id = :p', { p: q.projectId });
    if (q.parentId) qb.andWhere('i.parent_id = :pa', { pa: q.parentId }).orderBy('i.position', 'ASC');
    if (q.assignee) qb.andWhere('i.assignee = :as', { as: q.assignee });
    if (q.createdBy) qb.andWhere('i.created_by = :cb', { cb: q.createdBy });
    if (q.periodic !== undefined) qb.andWhere(q.periodic ? 'i.recurrence IS NOT NULL' : 'i.recurrence IS NULL');
    const short = q.search ? /^#?(\d+)$/.exec(q.search.trim())?.[1] : undefined;
    if (short) qb.andWhere('i.short_id = :s', { s: Number(short) });
    else if (q.search) {
      const words = q.search.split(/\s+/).filter(Boolean);
      qb.andWhere(new Brackets((w) => words.forEach((word, i) => w.andWhere(`i.title ILIKE :w${i}`, { [`w${i}`]: `%${word}%` }))));
    }
    const [rows, count] = await qb.getManyAndCount();
    return { items: await this._views.toViews(rows), count, pagination: { limit: q.limit, offset: q.offset } };
  }

  /** `#123` / a number → by short id; else title words over open items. Label `#<shortId> <title>`. */
  async lookup(query: string, limit = 10): Promise<LookupResult[]> {
    const short = /^#?(\d+)$/.exec(query.trim())?.[1];
    const label = (i: ItemEntity): LookupResult => ({ id: i.id, label: `#${i.shortId} ${i.title}` });
    if (short) return (await this._repo.findBy({ shortId: Number(short) })).map(label);
    const open = await this._repo.find({ where: { status: In(['inbox', 'todo', 'doing', 'blocked']) }, order: { updatedAt: 'DESC' }, take: 1000 });
    return rankTextMatches(open, (i) => i.title, query, limit).map(label);
  }

  async addNote(id: string, text: string): Promise<ItemView> {
    const row = await this.getOrFail(id);
    row.body = row.body ? `${row.body}\n\n${text}` : text;
    await this._repo.save(row);
    return this._views.one(id);
  }

  private async _check(input: CreateItemInput | UpdateItemInput, shape: ItemShape, ctx: RequestCtx, current?: ItemEntity): Promise<FieldError[]> {
    const errors: FieldError[] = [];
    const L = ctx.locale;
    if (shape.type !== 'task' && (shape.recurrence || shape.parentId || input.checklist?.length || input.subtasksOrder))
      errors.push({ path: shape.recurrence ? 'recurrence' : shape.parentId ? 'parentId' : 'checklist', code: 'invalid:item:type-unsupported', message: msg(L, 'invalid:item:type-unsupported') });
    if (input.categoryId) await this._categories.getOrFail(input.categoryId).catch(() => errors.push({ path: 'categoryId', code: 'not-found:category', message: msg(L, 'not-found:category') }));
    if (input.projectId) await this._projects.getOrFail(input.projectId).catch(() => errors.push({ path: 'projectId', code: 'not-found:project', message: msg(L, 'not-found:project') }));
    errors.push(...(await this._tags.checkIds(input.tagIds)));
    errors.push(...(await this._agents.checkAssignee(input.assignee, 'assignee', L)));
    const connector = input.connector !== undefined ? input.connector : (current?.connector ?? null);
    const tools = input.connectorTools !== undefined ? input.connectorTools : (current?.connectorTools ?? null);
    if (Boolean(connector) !== Boolean(tools?.length)) errors.push({ path: connector ? 'connectorTools' : 'connector', code: 'invalid:item:connector-tools', message: msg(L, 'invalid:item:connector-tools') });
    const assignee = input.assignee ?? current?.assignee ?? 'me';
    if (connector && assignee === 'me') errors.push({ path: 'assignee', code: 'invalid:item:connector-tools', message: msg(L, 'invalid:item:connector-tools') });
    if (input.parentId) {
      const parent = await this._repo.findOneBy({ id: input.parentId });
      if (!parent) errors.push({ path: 'parentId', code: 'not-found:item', message: msg(L, 'not-found:item') });
      else if (parent.recurrence) errors.push({ path: 'parentId', code: 'invalid:item:thread-periodic', message: msg(L, 'invalid:item:thread-periodic') });
      else if (parent.parentId || parent.type !== 'task') errors.push({ path: 'parentId', code: 'invalid:args', message: 'The parent must be a top-level task (one level of threads)' });
    }
    if (shape.recurrence && (shape.parentId || shape.hasChildren)) errors.push({ path: 'recurrence', code: 'invalid:item:thread-periodic', message: msg(L, 'invalid:item:thread-periodic') });
    const startsOn = input.startsOn ?? current?.startsOn ?? null;
    const endsOn = input.endsOn !== undefined ? input.endsOn : (current?.endsOn ?? null);
    if (startsOn && endsOn && endsOn < startsOn) errors.push({ path: 'endsOn', code: 'invalid:recurrence:range', message: msg(L, 'invalid:recurrence:range') });
    if (input.remindAt && new Date(input.remindAt).getTime() <= ctx.now.getTime()) errors.push({ path: 'remindAt', code: 'invalid:item:remind-at-past', message: msg(L, 'invalid:item:remind-at-past') });
    if (input.remindAt && shape.recurrence) errors.push({ path: 'remindAt', code: 'invalid:args', message: 'A periodic task takes reminders with timeOfDay' });
    const keptAts = current && input.reminders ? await this._reminders.existingAts(current.id) : undefined;
    errors.push(...this._reminders.check(input.reminders, { periodic: Boolean(shape.recurrence), hasDueAt: Boolean(shape.dueAt) }, ctx, 'reminders', keptAts));
    if (current && input.status === 'done' && current.status !== 'done' && (await this._threads.isLocked(current)))
      errors.push({ path: 'status', code: 'invalid:item:thread-locked', message: msg(L, 'invalid:item:thread-locked') });
    return errors;
  }

  /** Scalar columns from an input (only the given fields); `date` falls back to the local day of `dueAt`. */
  private _columns(input: Partial<CreateItemInput>, ctx: RequestCtx): Partial<ItemEntity> {
    const out: Partial<ItemEntity> = {};
    for (const key of ['body', 'connector', 'connectorTools', 'priority', 'projectId', 'pending', 'parentId', 'recurrence', 'startsOn', 'endsOn', 'evaluation', 'subtasksOrder', 'source', 'date'] as const)
      if (input[key] !== undefined) Object.assign(out, { [key]: input[key] });
    if (input.dueAt !== undefined) {
      out.dueAt = input.dueAt ? new Date(input.dueAt) : null;
      if (input.dueAt && input.date === undefined) out.date = localDateOf(new Date(input.dueAt), ctx.timeZone);
    }
    return out;
  }

  private _remindersOf(input: { reminders?: ReminderInput[]; remindAt?: string }): ReminderInput[] {
    return [...(input.reminders ?? []), ...(input.remindAt ? [{ at: input.remindAt }] : [])];
  }

  private async _writeChildren(m: EntityManager, id: string, checklist: { id?: string; title: string }[] | undefined, reminders: ReminderInput[] | undefined): Promise<void> {
    if (checklist !== undefined) await this._checklist.replaceForItem(m, id, checklist);
    if (reminders !== undefined) await this._reminders.replaceForOwner(m, { itemId: id }, reminders);
  }
}
