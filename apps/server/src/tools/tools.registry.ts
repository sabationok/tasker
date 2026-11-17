import { createHash } from 'node:crypto';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { ChecklistService } from '../checklist/checklist.service';
import type { RequestCtx } from '../common/context/request-context';
import { AppException } from '../common/http/app-exception';
import type { FieldError } from '../common/http/error-codes';
import { msg } from '../common/i18n/messages';
import { zodToFieldErrors } from '../common/validation/zod-to-field-errors';
import { DraftsService } from '../drafts/drafts.service';
import type { DraftEntity } from '../drafts/entities/draft.entity';
import { HabitCheckinsService } from '../habits/services/habit-checkins';
import { HabitsService } from '../habits/services/habits';
import { ItemOccurrencesService } from '../items/services/item-occurrences';
import { ItemThreadsService } from '../items/services/item-threads';
import { ItemsService } from '../items/services/items';
import { ProjectsService } from '../projects/projects.service';
import { SettingsService } from '../settings/settings.service';
import { StatsService } from '../stats/services/stats';
import { TagsService } from '../tags/tags.service';
import { TodayService } from '../today/services/today';
import { catalogTools } from './definitions/catalog.tools';
import { habitTools } from './definitions/habits.tools';
import { itemTools } from './definitions/items.tools';
import { lookupTools } from './definitions/lookup.tools';
import { readTools } from './definitions/read.tools';
import { mapKeys, snakePath, toCamel, toSnake } from './helpers/case-keys';
import { toolJsonSchema, undescribedFields } from './helpers/tool-json-schema';
import { PreviewService } from './services/preview/preview.service';
import type { CallMeta, ToolDef, ToolOutcome } from './types/tool.types';

export type ListedTool = { name: string; description: string; inputSchema: Record<string, unknown>; annotations: ToolDef['annotations']; _meta: Record<string, unknown> };

/** Every MCP tool, built over the same services as REST; runs dry runs, drafts and real calls. */
@Injectable()
export class ToolsRegistry implements OnModuleInit {
  private _tools: ToolDef[] = [];
  private _listed: ListedTool[] = [];

  constructor(
    private readonly _items: ItemsService,
    private readonly _occurrences: ItemOccurrencesService,
    private readonly _threads: ItemThreadsService,
    private readonly _checklist: ChecklistService,
    private readonly _habits: HabitsService,
    private readonly _checkins: HabitCheckinsService,
    private readonly _projects: ProjectsService,
    private readonly _categories: CategoriesService,
    private readonly _tags: TagsService,
    private readonly _today: TodayService,
    private readonly _stats: StatsService,
    private readonly _settings: SettingsService,
    private readonly _preview: PreviewService,
    private readonly _drafts: DraftsService,
  ) {}

  onModuleInit(): void {
    const deps = { items: this._items, occurrences: this._occurrences, threads: this._threads, checklist: this._checklist, habits: this._habits, checkins: this._checkins, projects: this._projects, categories: this._categories, tags: this._tags, today: this._today, stats: this._stats, settings: this._settings, preview: this._preview };
    this._tools = [...lookupTools(deps), ...readTools(deps), ...itemTools(deps), ...habitTools(deps), ...catalogTools(deps)];
    this._listed = this._tools.map((t) => {
      const inputSchema = toolJsonSchema(t.input);
      const missing = undescribedFields(inputSchema);
      if (missing.length) throw new Error(`Tool ${t.name}: fields without description: ${missing.join(', ')}`);
      return { name: t.name, description: t.description, inputSchema, annotations: t.annotations, _meta: { ...t.meta } };
    });
  }

  list(): ListedTool[] {
    return this._listed;
  }

  get(name: string): ToolDef | undefined {
    return this._tools.find((t) => t.name === name);
  }

  schemaHash(): string {
    return createHash('sha256').update(JSON.stringify(this._listed)).digest('hex').slice(0, 16);
  }

  /** One `tools/call` (MCP args in snake_case). Errors come back as field errors with snake_case paths. */
  async call(name: string, rawArgs: Record<string, unknown>, ctx: RequestCtx, meta: CallMeta = {}): Promise<ToolOutcome> {
    const def = this.get(name);
    if (!def) return { ok: false, errors: [{ path: '', code: 'not-found:tool', message: msg(ctx.locale, 'not-found:tool') }] };
    try {
      if (meta.draftId) return await this.saveDraft(meta.draftId, ctx, Object.keys(rawArgs).length ? rawArgs : undefined, name);
      const parsed = def.input.safeParse(mapKeys(rawArgs, toCamel));
      if (!parsed.success) return { ok: false, errors: zodToFieldErrors(parsed.error, ctx.locale, (p) => p.map((s) => toSnake(String(s))).join('.')) };
      const input = parsed.data as Record<string, unknown>;
      const errors = def.check ? await def.check(input, ctx) : [];
      if (errors.length) return { ok: false, errors: this._snake(errors) };
      if (meta.dryRun && def.check && !def.noDraft) {
        const preview = def.preview ? await def.preview(input, ctx) : { refs: {}, computed: {}, warnings: [] };
        const draft = await this._drafts.store(def.name, input, preview, meta.batchId, ctx.apiKeyId);
        return { ok: true, structured: { valid: true, draftId: draft.id, batchId: draft.batchId, errors: [], preview } };
      }
      if (meta.dryRun && !def.check) return { ok: true, structured: { valid: true, errors: [], preview: { refs: {}, computed: {}, warnings: [] } } };
      return { ok: true, structured: this._out(await def.run(input, ctx)) };
    } catch (e) {
      if (e instanceof AppException) return { ok: false, errors: this._snake(e.errors.length ? e.errors : [{ path: '', code: e.innerCode, message: e.message }]) };
      throw e;
    }
  }

  /** Re-validates a stored draft (or the given args), runs it and marks it saved. */
  async saveDraft(draftId: string, ctx: RequestCtx, overrideArgs?: Record<string, unknown>, expectedTool?: string): Promise<ToolOutcome> {
    const draft = await this._drafts.getPending(draftId);
    const def = this.get(draft.tool);
    if (!def || (expectedTool && expectedTool !== draft.tool)) return { ok: false, errors: [{ path: 'draft_id', code: 'invalid:args', message: `The draft belongs to ${draft.tool}` }] };
    let input: Record<string, unknown> = draft.dto;
    if (overrideArgs) {
      const parsed = def.input.safeParse(mapKeys(overrideArgs, toCamel));
      if (!parsed.success) return { ok: false, errors: zodToFieldErrors(parsed.error, ctx.locale, (p) => p.map((s) => toSnake(String(s))).join('.')) };
      input = parsed.data as Record<string, unknown>;
    }
    await this._drafts.claim(draft);
    let result: Record<string, unknown>;
    try {
      const errors = def.check ? await def.check(input, ctx) : [];
      if (errors.length) {
        await this._drafts.release(draft);
        return { ok: false, errors: this._snake(errors) };
      }
      result = this._out(await def.run(input, ctx));
    } catch (e) {
      await this._drafts.release(draft);
      throw e;
    }
    await this._drafts.setStatus(draft, 'saved', this._savedRef(result), 'saving');
    return { ok: true, structured: { ...result, draftId: draft.id, batchId: draft.batchId } };
  }

  async saveBatch(batchId: string, ctx: RequestCtx): Promise<{ draftId: string; status: 'saved' | 'invalid' | 'skipped'; errors?: FieldError[] }[]> {
    const drafts = await this._drafts.findByBatch(batchId);
    const out: { draftId: string; status: 'saved' | 'invalid' | 'skipped'; errors?: FieldError[] }[] = [];
    for (const d of drafts as DraftEntity[]) {
      if (d.status !== 'draft') {
        out.push({ draftId: d.id, status: 'skipped' });
        continue;
      }
      const res = await this.saveDraft(d.id, ctx).catch((e: unknown) => (e instanceof AppException ? ({ ok: false, errors: [{ path: 'draft_id', code: e.innerCode, message: e.message }] } as ToolOutcome) : Promise.reject(e)));
      out.push(res.ok ? { draftId: d.id, status: 'saved' } : { draftId: d.id, status: 'invalid', errors: res.errors });
    }
    return out;
  }

  private _snake(errors: FieldError[]): FieldError[] {
    return errors.map((e) => ({ ...e, path: snakePath(e.path) }));
  }

  /** Structured results go out in snake_case like the inputs. */
  private _out(result: Record<string, unknown>): Record<string, unknown> {
    return mapKeys(JSON.parse(JSON.stringify(result)), toSnake) as Record<string, unknown>;
  }

  /** The saved row's id and label (item `#<short_id> <title>`, otherwise its name / title). Result keys are snake_case. */
  private _savedRef(result: Record<string, unknown>): { id: string | null; label: string | null } {
    for (const key of ['item', 'habit', 'checkin', 'category', 'project']) {
      const v = result[key] as { id?: string; short_id?: number; title?: string; name?: string } | null | undefined;
      if (!v?.id) continue;
      const name = v.title ?? v.name ?? null;
      return { id: v.id, label: v.short_id != null ? `#${v.short_id} ${name ?? ''}`.trim() : name };
    }
    return { id: null, label: null };
  }
}
