import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { CategoriesService } from '../../../categories/categories.service';
import type { RequestCtx } from '../../../common/context/request-context';
import { AppException } from '../../../common/http/app-exception';
import type { FieldError, LookupResult } from '../../../common/http/error-codes';
import { localDateOf } from '../../../common/helpers/local-date';
import { rankTextMatches } from '../../../common/helpers/rank-text-matches';
import { msg } from '../../../common/i18n/messages';
import type { CategoryRef } from '../../../items/types/item-view.types';
import { RemindersService } from '../../../reminders/reminders.service';
import type { CreateHabitInput, FindManyHabitsQuery, UpdateHabitInput } from '../../dto/habit.schemas';
import { HabitChecklistItemEntity } from '../../entities/habit-checklist-item.entity';
import { HabitEntity } from '../../entities/habit.entity';
import type { HabitView } from '../../types/habit-view.types';

type HabitShape = Pick<HabitEntity, 'evaluation' | 'targetValue' | 'targetCondition'> & { checklistCount: number; startsOn: string | null; endsOn: string | null };

@Injectable()
export class HabitsService {
  constructor(
    @InjectRepository(HabitEntity) private readonly _repo: Repository<HabitEntity>,
    @InjectRepository(HabitChecklistItemEntity) private readonly _lines: Repository<HabitChecklistItemEntity>,
    @InjectDataSource() private readonly _ds: DataSource,
    private readonly _categories: CategoriesService,
    private readonly _reminders: RemindersService,
  ) {}

  async checkCreate(input: CreateHabitInput, ctx: RequestCtx): Promise<FieldError[]> {
    return this._check(input, { evaluation: input.evaluation, targetValue: input.targetValue ?? null, targetCondition: input.targetCondition ?? null, checklistCount: input.checklist?.length ?? 0, startsOn: input.startsOn ?? null, endsOn: input.endsOn ?? null }, ctx);
  }

  async checkUpdate(input: UpdateHabitInput, ctx: RequestCtx): Promise<FieldError[]> {
    const current = await this._repo.findOneBy({ id: input.id });
    if (!current) return [{ path: 'id', code: 'not-found:habit', message: msg(ctx.locale, 'not-found:habit') }];
    const count = input.checklist ? input.checklist.length : await this._lines.count({ where: { habitId: current.id } });
    return this._check(input, {
      evaluation: input.evaluation ?? current.evaluation,
      targetValue: input.targetValue !== undefined ? input.targetValue : current.targetValue,
      targetCondition: input.targetCondition !== undefined ? input.targetCondition : current.targetCondition,
      checklistCount: count,
      startsOn: input.startsOn ?? current.startsOn,
      endsOn: input.endsOn !== undefined ? input.endsOn : current.endsOn,
    }, ctx);
  }

  async create(input: CreateHabitInput, ctx: RequestCtx): Promise<HabitView> {
    const errors = await this.checkCreate(input, ctx);
    if (errors.length) throw AppException.invalid(errors);
    const id = await this._ds.transaction(async (m) => {
      const { checklist, reminders, ...fields } = input;
      const row = await m.save(
        m.create(HabitEntity, {
          ...fields,
          categoryId: input.categoryId ?? (await this._categories.defaultId()),
          startsOn: input.startsOn ?? localDateOf(ctx.now, ctx.timeZone),
          goals: input.goals ?? {},
          targetCondition: input.targetCondition ?? (input.evaluation === 'numeric' ? 'at_least' : null),
          position: ((await m.maximum(HabitEntity, 'position')) ?? 0) + 1,
        }),
      );
      await this._writeChildren(m, row.id, checklist, reminders);
      return row.id;
    });
    return this.get(id);
  }

  async update(input: UpdateHabitInput, ctx: RequestCtx): Promise<HabitView> {
    const errors = await this.checkUpdate(input, ctx);
    if (errors.length) throw AppException.invalid(errors);
    await this._ds.transaction(async (m) => {
      const { id, checklist, reminders, ...fields } = input;
      if (Object.keys(fields).length) await m.update(HabitEntity, { id }, fields);
      await this._writeChildren(m, id, checklist, reminders);
    });
    return this.get(input.id);
  }

  async archive(id: string, archived: boolean): Promise<HabitView> {
    await this.getOrFail(id, true);
    await this._repo.update(id, { status: archived ? 'archived' : 'active', archivedAt: archived ? new Date() : null });
    return this.get(id);
  }

  async delete(id: string): Promise<void> {
    await this.getOrFail(id, true);
    await this._repo.softDelete(id);
  }

  async getOrFail(id: string, allowArchived = false): Promise<HabitEntity> {
    const row = await this._repo.findOneBy({ id });
    if (!row || (!allowArchived && row.status === 'archived')) throw AppException.notFound('not-found:habit', 'habitId');
    return row;
  }

  async get(id: string): Promise<HabitView> {
    return (await this.toViews([await this.getOrFail(id, true)]))[0];
  }

  async findMany(q: FindManyHabitsQuery): Promise<{ items: HabitView[] }> {
    let rows = await this._repo.find({ where: { status: q.status, ...(q.categoryId && { categoryId: q.categoryId }) }, order: { position: 'ASC' } });
    if (q.search) rows = rankTextMatches(rows, (h) => h.name, q.search, 50);
    return { items: await this.toViews(rows) };
  }

  /** Active habits (all, for Today and stats). */
  findActive(): Promise<HabitEntity[]> {
    return this._repo.find({ where: { status: 'active' }, order: { position: 'ASC' } });
  }

  /** All habits incl. archived (stats keep archived check-ins). */
  findAllForStats(): Promise<HabitEntity[]> {
    return this._repo.find({ order: { position: 'ASC' } });
  }

  async lookup(query: string, limit = 10): Promise<LookupResult[]> {
    return rankTextMatches(await this.findActive(), (h) => h.name, query, limit).map((h) => ({ id: h.id, label: h.name }));
  }

  async linesByHabit(ids: string[]): Promise<Map<string, HabitChecklistItemEntity[]>> {
    const out = new Map<string, HabitChecklistItemEntity[]>();
    if (!ids.length) return out;
    for (const l of await this._lines.find({ where: { habitId: In(ids) }, order: { position: 'ASC' } })) out.set(l.habitId, [...(out.get(l.habitId) ?? []), l]);
    return out;
  }

  async toViews(rows: HabitEntity[]): Promise<HabitView[]> {
    const ids = rows.map((r) => r.id);
    const [cats, lines, reminders] = await Promise.all([
      this._categories.findByIds([...new Set(rows.map((r) => r.categoryId).filter((x): x is string => Boolean(x)))]),
      this.linesByHabit(ids),
      this._reminders.viewsByOwner('habitId', ids),
    ]);
    const cat = new Map<string, CategoryRef>(cats.map((c) => [c.id, { id: c.id, name: c.name, icon: c.icon, color: c.color }]));
    return rows.map((h) => ({
      id: h.id,
      shortId: h.shortId,
      name: h.name,
      description: h.description,
      priority: h.priority,
      evaluation: h.evaluation,
      targetValue: h.targetValue,
      targetCondition: h.targetCondition,
      unit: h.unit,
      checklistMin: h.checklistMin,
      recurrence: h.recurrence,
      startsOn: h.startsOn,
      endsOn: h.endsOn,
      goals: h.goals,
      notesEnabled: h.notesEnabled,
      status: h.status,
      archivedAt: h.archivedAt?.toISOString() ?? null,
      category: (h.categoryId && cat.get(h.categoryId)) || null,
      checklist: (lines.get(h.id) ?? []).map((l) => ({ id: l.id, title: l.title, position: l.position })),
      reminders: reminders.get(h.id) ?? [],
    }));
  }

  private async _check(input: CreateHabitInput | UpdateHabitInput, s: HabitShape, ctx: RequestCtx): Promise<FieldError[]> {
    const errors: FieldError[] = [];
    const L = ctx.locale;
    const target = (path: string): FieldError => ({ path, code: 'invalid:habit:target', message: msg(L, 'invalid:habit:target') });
    if ((s.evaluation === 'numeric' || s.evaluation === 'timer') && (s.targetValue === null || s.targetValue === undefined)) errors.push(target('targetValue'));
    if (s.evaluation === 'checklist' && s.checklistCount === 0) errors.push(target('checklist'));
    if (input.checklistMin && input.checklistMin > s.checklistCount) errors.push({ path: 'checklistMin', code: 'invalid:habit:target', message: msg(L, 'invalid:habit:target'), expected: `≤ ${s.checklistCount}` });
    if (input.categoryId) await this._categories.getOrFail(input.categoryId).catch(() => errors.push({ path: 'categoryId', code: 'not-found:category', message: msg(L, 'not-found:category') }));
    if (s.startsOn && s.endsOn && s.endsOn < s.startsOn) errors.push({ path: 'endsOn', code: 'invalid:recurrence:range', message: msg(L, 'invalid:recurrence:range') });
    return errors;
  }

  private async _writeChildren(m: EntityManager, habitId: string, checklist: { id?: string; title: string }[] | undefined, reminders: { timeOfDay: string }[] | undefined): Promise<void> {
    if (checklist !== undefined) {
      const current = await m.find(HabitChecklistItemEntity, { where: { habitId } });
      const keep = new Set<string>();
      for (const [i, line] of checklist.entries()) {
        const existing = line.id ? current.find((c) => c.id === line.id) : undefined;
        if (existing) {
          keep.add(existing.id);
          await m.update(HabitChecklistItemEntity, { id: existing.id }, { title: line.title, position: i + 1 });
        } else await m.save(m.create(HabitChecklistItemEntity, { habitId, title: line.title, position: i + 1 }));
      }
      const gone = current.filter((c) => !keep.has(c.id)).map((c) => c.id);
      if (gone.length) await m.delete(HabitChecklistItemEntity, { id: In(gone) });
    }
    if (reminders !== undefined) await this._reminders.replaceForOwner(m, { habitId }, reminders);
  }
}
