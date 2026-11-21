import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { CategoriesService } from '../../../categories/categories.service';
import type { RequestCtx } from '../../../common/context/request-context';
import type { LookupResult } from '../../../common/http/error-codes';
import { localDateOf } from '../../../common/helpers/local-date';
import { HabitEntity } from '../../../habits/entities/habit.entity';
import { ItemEntity } from '../../../items/entities/item.entity';
import { ProjectsService } from '../../../projects/projects.service';
import { describeRecurrence } from '../../../recurrence/helpers/describe-recurrence';
import type { Recurrence } from '../../../recurrence/recurrence.schema';
import { TagsService } from '../../../tags/tags.service';
import { relativeDayLabel, relativeMomentLabel } from '../../helpers/relative-day-label';
import type { Preview } from '../../types/tool.types';

type RefFields = { projectId?: string | null; categoryId?: string; tagIds?: string[]; parentId?: string | null; itemId?: string; habitId?: string };
type WhenFields = { date?: string | null; dueAt?: string | null; remindAt?: string; reminders?: ({ at: string } | { timeOfDay: string } | { offsetMin: number })[]; recurrence?: Recurrence | null };

/** What a draft card shows: resolved references (labels, snake_case keys), human dates, warnings. */
@Injectable()
export class PreviewService {
  constructor(
    @InjectRepository(ItemEntity) private readonly _items: Repository<ItemEntity>,
    @InjectRepository(HabitEntity) private readonly _habits: Repository<HabitEntity>,
    private readonly _projects: ProjectsService,
    private readonly _categories: CategoriesService,
    private readonly _tags: TagsService,
  ) {}

  async build(input: RefFields & WhenFields & { title?: string; type?: string }, ctx: RequestCtx, opts: { similarTo?: string; excludeId?: string } = {}): Promise<Preview> {
    const refs: Preview['refs'] = {};
    const computed: Record<string, string> = {};
    const warnings: string[] = [];
    const uk = ctx.locale === 'uk';
    const today = localDateOf(ctx.now, ctx.timeZone);
    if (input.projectId) {
      const p = await this._projects.getOrFail(input.projectId, true).catch(() => null);
      if (p) refs.project_id = { id: p.id, label: p.name, path: `Проєкти / ${p.name}` };
    }
    if (input.categoryId) {
      const c = await this._categories.getOrFail(input.categoryId, true).catch(() => null);
      if (c) refs.category_id = { id: c.id, label: c.name, path: `Категорії / ${c.name}` };
    }
    if (input.tagIds?.length) refs.tag_ids = (await this._tags.findByIds(input.tagIds)).map((t): LookupResult => ({ id: t.id, label: t.name }));
    for (const [field, id] of [['parent_id', input.parentId], ['item_id', input.itemId]] as const) {
      if (!id) continue;
      const it = await this._items.findOneBy({ id });
      if (!it) continue;
      refs[field] = { id: it.id, label: `#${it.shortId} ${it.title}` };
      if (field === 'parent_id') {
        const siblings = await this._items.count({ where: { parentId: it.id } });
        computed.thread = uk ? `${siblings + 1} у потоці «${it.title}»` : `${siblings + 1} in «${it.title}»`;
        if (it.subtasksOrder === 'sequential') warnings.push(uk ? 'Потік послідовний: крок відкриється після попередніх' : 'Sequential thread: it opens after the previous ones');
      }
    }
    if (input.habitId) {
      const h = await this._habits.findOneBy({ id: input.habitId });
      if (h) refs.habit_id = { id: h.id, label: h.name };
    }
    if (input.dueAt) computed.due = relativeMomentLabel(new Date(input.dueAt), today, ctx.timeZone, ctx.locale);
    else if (input.date) computed.due = relativeDayLabel(input.date, today, ctx.locale);
    const ats = [...(input.reminders ?? []).flatMap((r) => ('at' in r ? [r.at] : [])), ...(input.remindAt ? [input.remindAt] : [])];
    const times = (input.reminders ?? []).flatMap((r) => ('timeOfDay' in r ? [r.timeOfDay] : []));
    if (ats.length || times.length) computed.remind = [...ats.map((a) => relativeMomentLabel(new Date(a), today, ctx.timeZone, ctx.locale)), ...times].join('; ');
    if (!computed.due && ats.length) computed.due = relativeMomentLabel(new Date(ats[0]), today, ctx.timeZone, ctx.locale);
    if (input.recurrence) computed.recurrence = describeRecurrence(input.recurrence, ctx.locale);
    if (input.date && input.date < today && !input.recurrence) warnings.push(uk ? 'Дата вже минула' : 'The date is in the past');
    if (opts.similarTo) {
      const similar = await this._similar(opts.similarTo, opts.excludeId);
      if (similar) warnings.push(uk ? `Є схожа задача #${similar.shortId}` : `A similar item exists: #${similar.shortId}`);
    }
    return { refs, computed, warnings };
  }

  /** An open item whose title shares ≥ 2 words (or the whole title) with the given one — plain text, no embeddings. */
  private async _similar(title: string, excludeId?: string): Promise<ItemEntity | null> {
    const words = title.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
    if (!words.length) return null;
    const open = await this._items.find({ where: { status: In(['inbox', 'todo', 'doing', 'blocked']), ...(excludeId && { id: Not(excludeId) }) }, order: { updatedAt: 'DESC' }, take: 500 });
    const need = Math.min(2, words.length);
    return open.find((i) => words.filter((w) => i.title.toLowerCase().includes(w)).length >= need) ?? null;
  }
}
