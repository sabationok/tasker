# tasker server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local NestJS server for tasker: Postgres model for tasks (threads, checklists, reminders, pending), periodic tasks, habits, Today and stats; REST and an MCP server (streamable HTTP + stdio proxy) over one service layer, with API keys, dry run + drafts, lookups, structured errors and signed webhooks to agents.

**Architecture:** One Nest app `apps/server`. Every write is a **tool** (zod input + `check` + `preview` + `run`) in a registry; REST controllers and the MCP server both call tools / services, so dry run, drafts and errors are one code path. Recurrences are computed by a pure module; rows exist only for occurrences acted on. A minute sweep fires reminders; BullMQ delivers signed webhooks.

**Tech Stack:** Node 22, pnpm workspace, NestJS 10, TypeORM 0.3 + `pg` (Postgres 17, Homebrew), BullMQ + ioredis (Redis, Homebrew), `@nestjs/schedule`, `@modelcontextprotocol/sdk` ^1.32, zod ^3.25 + `zod-to-json-schema`, `uuid` (v7), `date-fns` + `date-fns-tz`.

**Spec:** `docs/superpowers/specs/2026-11-17-tasker-server-design.md` (read it first; section numbers below refer to it). Connector contract: `docs/superpowers/specs/2026-11-17-mia-connector-contract.md`. Reference MCP shapes: `~/projects/mia-assistant/apps/test-connector/src`.

## Global Constraints

- Follow the `nestjs` skill (`~/.claude/skills/nestjs`): module/entity/repository/service/controller layout, `AppResponse` + `AppException` with string `innerCode`, routes without path params (`GET /x?id=`, `POST /x/create`, `PUT /x/update`, `DELETE /x/delete?id=`, `POST /x/<action>`), `type` never `kind`, no `@mia/nest-kit`.
- **No automated tests** (nestjs skill: opt-in only). Each task ends with a verification against the running server (`curl` / the MCP check script in Task 12).
- **No commits** until the user says so. Steps say "stage" only.
- Renames / usage lookups go through WebStorm MCP (`rename_refactoring`, `search_symbol`) when the IDE has the project open.
- UUIDv7 ids; `timestamptz` UTC; owner-day values are `date` (local); soft delete `deleted_at`.
- Loopback bind (`BIND_HOST=127.0.0.1`) by default; port leased via dev-dashboard `allocate_port` (project `tasker`, service `server`), written to `apps/server/.env` as `PORT`.
- MCP args `snake_case`; REST bodies / queries `camelCase`; one zod schema per input written in camelCase (spec §11.2). Target fields are `item_id` / `habit_id` / `draft_id` in MCP, `itemId` / `habitId` / `draftId` in REST (an update DTO's own record stays `id` in REST, per the skill).
- Error codes exactly as spec §8.4 (+ §11: `invalid:item:thread-periodic`); messages uk (default) / en by locale.
- Webhook signature: `secret = HMAC-SHA256(key='webhook', msg=apiKey)`, `X-Tasker-Signature: hex(HMAC-SHA256(key=secret, msg=rawBody))`; webapp secret the same with `'webapp'`.
- Default time zone `Europe/Kyiv`; `_meta.timeZone` (MCP) / `X-Time-Zone` (REST) override per call (spec §11.6).
- No Telegram code of any kind.

## Review Focus

- **Month-end and DST days in recurrence:** `monthly` with `month_days: [31]` must fire on Feb 28/29 and Apr 30; an `hourly` rule across the DST switch (2026-03-29, 2026-10-25 in Kyiv) yields one slot per wall-clock hour, no duplicate or missing slot. → Task 4 verification.
- **Concurrent completion of the last thread:** two children completed together must close the parent exactly once (no lost `done_at`); completion runs in one transaction with the parent row locked (`FOR UPDATE`). → Task 5.
- **A reminder whose owner changed after it was scheduled:** completed / deleted / locked / archived owners never fire; a `time_of_day` reminder fires at most once per local day even across a restart. → Task 11.
- **Draft saved twice / after expiry:** second save → `conflict:draft:not-pending`; expired → same code; no duplicate item. → Task 9.
- **Unknown or revoked key on an existing MCP session:** revoking a key ends its sessions' access on the next request (guard runs per request, not per session). → Task 10.

---

### Task 1: Workspace, app skeleton, common layer

**Files:**
- Create: `pnpm-workspace.yaml` (`apps/*`), root `package.json` (scripts `dev`, `build`, `tasker` → server CLI), `apps/server/{package.json,tsconfig.json,nest-cli.json,.env.example}`, `.gitignore` additions (`apps/server/.env`, `dist`)
- Create: `apps/server/src/main.ts`, `app.module.ts`, `config/env.ts` (zod-parsed env: `DATABASE_URL`, `REDIS_URL`, `PORT`, `BIND_HOST`), `database/{data-source.ts,database.module.ts,migrations/}`
- Create: `apps/server/src/common/http/{app-response.ts,app-exception.ts,global-exception.filter.ts,error-codes.ts}`, `common/entities/base.entity.ts`, `common/repositories/base.repository.ts`, `common/services/base.service.ts`, `common/controllers/base-controller-of.ts`, `common/validation/zod-body.pipe.ts`, `common/context/request-context.ts`, `common/i18n/messages.ts`, `health/health.controller.ts`
- Modify: `README.md` (rewrite: what tasker is now, how to run, link the spec)

**Interfaces:**
- Produces:
  - `AppResponse.ok<T>(data, message?, meta?)`, `.created`, `.empty` (skill shape).
  - `class AppException extends Error { constructor(status: number, innerCode: ErrorCode, message: string, errors?: FieldError[]) }` with statics `.invalid(code, errors)`, `.notFound(code)`, `.conflict(code)`, `.unauthorized()`.
  - `type FieldError = { path: string; code: ErrorCode; message: string; expected?: unknown; options?: { id: string; label: string; path?: string }[] }`.
  - `type ErrorCode` = union of spec §8.4 codes + `invalid:item:thread-periodic` + `invalid:args`.
  - `interface RequestCtx { apiKeyId: string | null; timeZone: string; locale: 'uk' | 'en'; now: Date }`; `@Ctx()` param decorator building it from `req.apiKey`, `X-Time-Zone`, `Accept-Language`, `settings.timezone`.
  - `ZodBodyPipe(schema)` / `ZodQueryPipe(schema)` → 400 `AppException.invalid('invalid:args', fieldErrors)` with zod paths joined by `.`.
  - `msg(locale, code, params?) → string` (uk/en table keyed by `ErrorCode`).
  - `BaseEntity { id (uuid v7, generated in `@BeforeInsert`), createdAt, updatedAt, deletedAt }`.

- [ ] **Step 1:** Scaffold workspace and Nest app (Nest 10, deps from Tech Stack). `createdb tasker` locally; `.env` from `.env.example` with `DATABASE_URL=postgres://localhost/tasker`, `REDIS_URL=redis://127.0.0.1:6379`, leased `PORT`.
- [ ] **Step 2:** Common layer as in Interfaces. `GlobalExceptionFilter` maps `AppException` → `{ statusCode, message, innerCode, errors }`; anything else → 500 `INTERNAL`, logged.
- [ ] **Step 3:** TypeORM with `migrationsRun: true`, `synchronize: false`; scripts `migration:generate` / `migration:run` as in Mia's `apps/assistant/package.json`.
- [ ] **Step 4: Verify.** `pnpm --filter server start:dev`; `curl -s 127.0.0.1:$PORT/health` → `{"statusCode":200,"data":{"ok":true,"db":true,"redis":true}}`.
- [ ] **Step 5:** Stage.

### Task 2: Settings, API keys, auth guard, CLI

**Files:**
- Create: `src/settings/{settings.module.ts,settings.service.ts,settings.controller.ts,entities/setting.entity.ts,constants/default-settings.ts,dto/update-settings.schema.ts}`
- Create: `src/api-keys/{api-keys.module.ts,api-keys.service.ts,api-keys.controller.ts,entities/api-key.entity.ts,helpers/derive-key-secret.ts,guards/api-key.guard.ts,decorators/public.decorator.ts}`
- Create: `src/cli/main.ts` (`pnpm tasker api-key create <name> [--events-url <url>]`, `api-key list`, `api-key revoke <id>`; boots an application context, no HTTP)
- Create: migration for `settings`, `api_keys`

**Interfaces:**
- Produces:
  - `SettingsService.get(): Promise<Settings>`; `update(patch: Partial<Settings>): Promise<Settings>`; `type Settings = { timezone: string; locale: 'uk' | 'en'; failedMode: 'missed' | 'explicit'; weekStart: 1 | 7; toolsSchemaHash?: string }` (defaults: `Europe/Kyiv`, `uk`, `missed`, `1`).
  - `ApiKeysService.create(name, eventsUrl?) → { key: string; apiKey: ApiKeyEntity }` (key = `tsk_` + 32 random base62); `verify(bearer: string) → ApiKeyEntity | null` (sha256 lookup, not revoked, bumps `lastUsedAt` at most once a minute); `revoke(id)`; `listWithEvents(): ApiKeyEntity[]`.
  - `deriveKeySecret(purpose: 'webhook' | 'webapp', apiKey: string): string` (hex).
  - `ApiKeyGuard` global (APP_GUARD): every route except `@Public()` needs `Authorization: Bearer tsk_…`; sets `req.apiKey`; failure → 401 `unauthorized:api-key`.

- [ ] **Step 1:** Entities + migration per spec §6 (`settings`, `api_keys`).
- [ ] **Step 2:** Services, guard, controllers (`/settings`, `/settings/update`, `/api-keys/create|many|update|delete`), CLI.
- [ ] **Step 3: Verify.** `pnpm tasker api-key create dev` prints a key once. `curl /settings` without key → 401 `unauthorized:api-key`; with key → defaults. `PUT /settings/update {"failedMode":"explicit"}` → persisted. Revoke via CLI → 401 again.
- [ ] **Step 4:** Stage.

### Task 3: Categories, projects, tags + lookups

**Files:**
- Create: `src/categories/…`, `src/projects/…`, `src/tags/…` (module, entity, repository, service, controller, `dto/*.schema.ts`), migration with seeds (spec §6: Other default + 9 more, icon/colour strings)
- Create: `src/common/helpers/rank-text-matches.ts`

**Interfaces:**
- Produces:
  - Each service: `create`, `update`, `delete` (soft; deleting the `Other` category → 400 `invalid:args`, path `id`), `findMany`, `getOrFail(id, code)` (throws `not-found:project` / `not-found:category` / `not-found:tag`, also when deleted or archived).
  - `CategoriesService.reorder(ids: string[])`; `CategoriesService.defaultId(): Promise<string>`.
  - `lookup(query: string, limit = 10): Promise<LookupResult[]>` on each service; `type LookupResult = { id: string; label: string; path?: string }`.
  - `rankTextMatches<T>(rows: T[], text: (r: T) => string, query: string, limit: number): T[]` — empty query → first `limit` by name; otherwise words matched case-insensitively, rank by matched-word count then exact prefix.

- [ ] **Step 1:** Entities, migration, seeds.
- [ ] **Step 2:** Services, controllers, `POST /categories/reorder`.
- [ ] **Step 3: Verify.** `GET /categories/many` returns 10 seeded; create project «Mia»; `GET /projects/many?search=mi` finds it; deleting `Other` → 400.
- [ ] **Step 4:** Stage.

### Task 4: Recurrence (pure module)

**Files:**
- Create: `src/recurrence/{recurrence.module.ts,recurrence.schema.ts,helpers/scheduled-slots.ts,helpers/period-of.ts,helpers/describe-recurrence.ts,types/recurrence.types.ts}`

**Interfaces:**
- Produces:
  - `recurrenceSchema` — zod discriminated union on `freq` exactly as spec §6.2 (`hourly {everyHours 1–12, from, to}`, `daily`, `weekly {weekdays 1–7 min 1}`, `monthly {monthDays 1–31 min 1}`, `every_n_days {interval ≥ 2}`, `days_per_period {count ≥ 1, period: 'week'|'month'}`, `yearly_dates {dates: 'MM-DD'[] min 1}`); refinement errors use code `invalid:recurrence:<field>`.
  - `scheduledSlots(rule, startsOn: string, endsOn: string | null, from: string, to: string, tz: string): Slot[]`; `type Slot = { date: string; slot: number }` (`slot` = local hour for `hourly`, else 0). For `days_per_period` returns every day of each period in range (the "flexible" days; stats/today apply the count).
  - `periodOf(date, period: 'week'|'month', weekStart): { from, to }`.
  - `describeRecurrence(rule, locale): string` («щодня», «пн, ср, пт», «3 дні на тиждень», …) for previews.

- [ ] **Step 1:** Implement. `monthly` day > month length → last day of month (deduplicated). `hourly` iterates local wall-clock hours `from..to` step `everyHours` per date (no UTC arithmetic, so DST cannot duplicate).
- [ ] **Step 2: Verify** with a throwaway `tsx -e` call (not committed): weekly Mon/Wed/Fri over 2026-11-16..22 → 16, 18, 20; monthly [31] over 2027-02 → 2027-02-28; hourly every 2 h 08:00–12:00 on 2026-10-25 Kyiv → slots 8, 10, 12.
- [ ] **Step 3:** Stage.

### Task 5: Items — tasks, ideas, notes, checklist, reminders, threads, occurrences

**Files:**
- Create: `src/items/{items.module.ts,items.controller.ts,entities/item.entity.ts,repositories/items.repository.ts,services/items/items.service.ts,services/items/index.ts,services/item-threads/item-threads.service.ts,services/item-occurrences/item-occurrences.service.ts,entities/item-occurrence.entity.ts,dto/*.schema.ts,helpers/is-thread-locked.ts}`
- Create: `src/checklist/{checklist.module.ts,checklist.controller.ts,checklist.service.ts,entities/checklist-item.entity.ts}`
- Create: `src/reminders/{reminders.module.ts,reminders.controller.ts,reminders.service.ts,entities/reminder.entity.ts,reminders.schema.ts}`
- Create: migration: `items` (+ `items_short_id_seq`), `item_tags`, `checklist_items`, `item_occurrences`, `reminders` (with `habit_id` nullable FK added in Task 7's migration)

**Interfaces:**
- Consumes: Task 3 `getOrFail`, Task 4 `recurrenceSchema`, `scheduledSlots`.
- Produces (all take `ctx: RequestCtx` last; all writes in one transaction):
  - `createItemSchema` (camelCase): `type`, `title` (1–200), `body?`, `status?`, `owner?`, `priority? 1|2|3`, `categoryId?`, `projectId?`, `tagIds?`, `date?` (YYYY-MM-DD), `dueAt?` (date-time with offset), `remindAt?` (date-time → one `at` reminder), `pending?`, `parentId?`, `recurrence?`, `startsOn?`, `endsOn?`, `evaluation?: 'yes_no'|'checklist'`, `checklist?: {id?, title}[]`, `reminders?: ({at} | {timeOfDay: 'HH:mm'} | {offsetMin})[]`, `source?`. `updateItemSchema` = partial + `id`.
  - `ItemsService.checkCreate(input, ctx): Promise<FieldError[]>` and `checkUpdate(input, ctx)` — every semantic rule: references exist (Task 3), reminder `at` / `remindAt` > `ctx.now` (`invalid:item:remind-at-past`), idea/note with checklist/threads/recurrence (`invalid:item:type-unsupported`), recurrence on a child or children on a periodic parent (`invalid:item:thread-periodic`), parent of a parent (`invalid:args` path `parentId`), periodic without `startsOn` (`invalid:recurrence:startsOn`). If `date` absent and `dueAt` given → `date` = local date of `dueAt` in `ctx.timeZone`.
  - `ItemsService.create(input, ctx): Promise<ItemView>`, `update(input, ctx)`, `delete(id, ctx)` (soft, children too), `get(id)`, `findMany(query)` (filters: `type`, `status`, `categoryId`, `projectId`, `parentId`, `search`, `owner`, pagination), `lookup(query, limit)` (`#123` / bare number → short id; else `rankTextMatches` over open items; label `#<shortId> <title>`), `addNote(id, text)` (append `\n\n` + text), `nextTask(ctx)` (spec §8.2).
  - `ItemThreadsService.split(parentId, order: 'any'|'sequential', threads: CreateItemInput[], ctx)`, `reorder(parentId|null, ids)`, `isLocked(item): Promise<boolean>`, `afterChildChange(parentId)` (auto-done / re-open parent; parent row `FOR UPDATE`).
  - `ItemOccurrencesService.complete(itemId, ctx, date?, slot?)`, `uncomplete(...)`, `skip(itemId, date, slot?)`, `move(itemId, date, toDate)`; single task without `date` arg → item `status=done`, `doneAt`; parent with open children → cascade (spec §11.3); locked thread → `invalid:item:thread-locked`.
  - `ChecklistService.toggle(id, ctx, date?)` (periodic item → toggles id in the occurrence's `checklistDone`), `replaceForItem(itemId, list)`.
  - `type ItemView` = item fields + `category`, `project`, `tags`, `checklist: {id,title,position,done}[]`, `reminders`, `threads?: {done,total}`, `locked: boolean`.
  - REST routes as spec §7 (items, checklist, reminders).

- [ ] **Step 1:** Entities + migration (spec §6 columns; check constraints as SQL `CHECK`).
- [ ] **Step 2:** `ItemsService` check/create/update/delete/get/findMany/lookup/addNote/nextTask.
- [ ] **Step 3:** Threads, occurrences, checklist, reminders services; controllers.
- [ ] **Step 4: Verify** (curl with key): create a task with 3 checklist items and 2 future reminders → `ItemView` has both; `remindAt` in the past → 400 `invalid:item:remind-at-past`; toggle a checklist item → `checklist[0].done=true`; `POST /items/split` sequential with 2 threads → completing thread 2 first → 400 `invalid:item:thread-locked`; complete 1 then 2 → parent `status=done`; uncomplete 2 → parent re-opened; complete a parent with open threads → all done; `find`: `GET /items/many?search=%23<short>` returns it.
- [ ] **Step 5:** Stage.

### Task 6: Today and the day strip

**Files:**
- Create: `src/today/{today.module.ts,today.controller.ts,services/today/today.service.ts,services/today/index.ts,types/today.types.ts}`

**Interfaces:**
- Consumes: Items (Task 5), habits read API (Task 7 — wire habits into Today at the end of Task 7), `scheduledSlots`.
- Produces: `TodayService.get(date: string, ctx, categoryId?): Promise<TodayView>` exactly as spec §6.5; `strip(from, to, ctx): Promise<{date, done, total}[]>` (max 62 days, else `invalid:args`). Entry rules per spec §6.5 + §11.1 (`days_per_period` shown until `count` done in the period). `late` = single task with `date` < day (pending).

- [ ] **Step 1:** Implement with entries for single tasks, pending, actionable threads, periodic occurrences (incl. moved-in, excluding moved-out).
- [ ] **Step 2: Verify.** Weekly Mon/Wed/Fri periodic task from 2026-11-16: `GET /today/strip?from=2026-11-16&to=2026-11-22` → totals 1 on 16/18/20, 0 otherwise; complete 16, skip 18 → strip `done` 1 on 16; `GET /today?date=2026-11-18` → entry `status: 'skipped'`; pending task dated 2026-11-15 appears on 2026-11-17 with `late: true`.
- [ ] **Step 3:** Stage.

### Task 7: Habits and check-ins

**Files:**
- Create: `src/habits/{habits.module.ts,habits.controller.ts,entities/{habit.entity.ts,habit-checklist-item.entity.ts,habit-checkin.entity.ts},services/habits/habits.service.ts,services/habit-checkins/habit-checkins.service.ts,helpers/checkin-status.ts,dto/*.schema.ts}`, migration (+ `reminders.habit_id` FK)
- Modify: `src/today/services/today/today.service.ts` (habit entries)

**Interfaces:**
- Consumes: Task 3, Task 4, Task 5 `RemindersService`.
- Produces:
  - `createHabitSchema`: `name`, `description?`, `categoryId?`, `priority?`, `evaluation`, `targetValue?`, `targetCondition?`, `unit?`, `checklist?: {id?, title}[]`, `checklistMin?`, `recurrence`, `startsOn`, `endsOn?`, `goals?: {weekly?|monthly?|yearly?|allTime?: {value, metric: 'days'|'sum'}}`, `notesEnabled?`, `reminders?: {timeOfDay}[]`. Rules: `numeric` needs `targetValue` + `targetCondition` (`invalid:habit:target`); `timer` needs `targetValue`; `checklist` needs ≥ 1 item.
  - `HabitsService.check/create/update/archive/restore/get/findMany({status})/lookup`.
  - `HabitCheckinsService.checkIn({habitId, date, slot?, value?, checklistDone?, note?, status?}, ctx)`: upsert on `(habit_id,date,slot)`; `stopwatch` adds `value` to the day's sum; `status` explicit `skipped`/`failed` wins, else `checkinStatus(habit, checkin)`; `note` rejected when `notesEnabled=false`; date not scheduled or before `startsOn` → `invalid:args` path `date`; archived → `not-found:habit`.
  - `checkinStatus(habit, checkin): 'done' | 'partial'` (stored `status` column gets `done` or `null` for partial — **schema note:** allow `status` null in `habit_checkins`).
  - `HabitCheckinsService.findMany(habitId, from, to)`.

- [ ] **Step 1:** Entities + migration; services; controller (`/habits…`, `/habits/check-in`, `/habits/archive`, `/habits/restore`, `/habits/check-ins`).
- [ ] **Step 2:** Today: habit entries (`habit: {evaluation, value, target, unit}`, `done` from status).
- [ ] **Step 3: Verify.** Numeric habit «Вода» ≥ 8 склянок daily from 2026-11-16: check-ins 16 → 8 (done), 17 → 5 (partial); `GET /today?date=2026-11-17` shows `done:false, value:5`; archive → gone from Today, check-ins kept.
- [ ] **Step 4:** Stage.

### Task 8: Statistics

**Files:**
- Create: `src/stats/{stats.module.ts,stats.controller.ts,services/stats/stats.service.ts,services/stats/helpers/{count-habit-units.ts,count-task-units.ts,goal-progress.ts},types/stats.types.ts}`

**Interfaces:**
- Consumes: `scheduledSlots`, `periodOf`, habits / check-ins, items / occurrences, `SettingsService.get().failedMode`.
- Produces: `StatsService.get({period, anchor, scope}, ctx): Promise<StatsView>` exactly spec §6.6 with counting rules spec §11.1. Units are counted only for days `< today` (today counts if done or skipped). `byDay` covers every day of the range (≤ 366 entries; `year` / `all` aggregate by month when the range > 92 days — `byDay[].date` then `YYYY-MM`).

- [ ] **Step 1:** Implement unit counting per habit / periodic task / dated single task; goals per window.
- [ ] **Step 2: Verify.** With Task 7's habit and anchor 2026-11-18 (today 2026-11-18): `missed` → completed 1, failed 1 (17 partial), successRate 0.5; `PUT /settings/update {failedMode:"explicit"}` → failed 0, successRate 1; skip 17 explicitly → skipped 1.
- [ ] **Step 3:** Stage.

### Task 9: Tools registry, dry run, drafts

**Files:**
- Create: `src/tools/{tools.module.ts,tools.registry.ts,types/tool.types.ts,helpers/{case-keys.ts,zod-to-tool-schema.ts,zod-to-field-errors.ts}}`
- Create: `src/tools/definitions/{items.tools.ts,habits.tools.ts,catalog.tools.ts,read.tools.ts,lookup.tools.ts,settings.tools.ts}`
- Create: `src/drafts/{drafts.module.ts,drafts.controller.ts,drafts.service.ts,entities/draft.entity.ts,helpers/build-preview.ts}`, migration

**Interfaces:**
- Consumes: every service above.
- Produces:
  - ```ts
    interface ToolDef<I = unknown> {
      name: string; description: string; input: z.ZodType<I>;        // camelCase schema
      annotations: { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint?: boolean };
      meta: { actions: ('create'|'read'|'update'|'delete')[]; keywords: string[]; lookup?: Record<string, string>; lookupArg?: 'query'; schemaVersion: number };
      check?(input: I, ctx: RequestCtx): Promise<FieldError[]>;      // write tools
      preview?(input: I, ctx: RequestCtx): Promise<Preview>;          // write tools
      run(input: I, ctx: RequestCtx): Promise<Record<string, unknown>>;
    }
    type Preview = { refs: Record<string, LookupResult>; computed: Record<string, string>; warnings: string[] };
    ```
  - `ToolsRegistry.list(): ToolDef[]`, `get(name)`, `jsonSchema(def)` (snake_case JSON Schema, `additionalProperties:false`, descriptions required — startup throws if a field lacks `.describe()`), `schemaHash()`.
  - `ToolsRegistry.call(name, rawArgs (snake_case), ctx, { dryRun?, batchId?, draftId? }): Promise<ToolOutcome>`; `type ToolOutcome = { ok: true; structured: Record<string, unknown> } | { ok: false; errors: FieldError[] }`. Flow: snake→camel, zod parse (errors → `zodToFieldErrors` with snake_case paths), `check`; dry run → `DraftsService.store(...)` → `{ valid: true, draftId, batchId, errors: [], preview }`; `draftId` → `DraftsService.save(draftId, args?, ctx)`; else `run`.
  - `DraftsService.store(tool, input, preview, batchId|null, ctx) → DraftEntity`; `save(draftId, ctx, overrideInput?)` (status must be `draft` and not expired else `conflict:draft:not-pending`; re-`check`; `run`; `status=saved`, `resultId`; emits `draft.updated`); `discard(draftId)`; `saveBatch(batchId, ctx) → {draftId, status, errors?}[]`; `expireOld()`; `findByBatch(batchId)`.
  - Tool list = spec §8.2 table; `read.tools` include `get_today`, `get_item`, `list_items`, `get_habit`, `list_habits`, `get_stats`, `next_task`; `catalog.tools` `create_category`, `create_project`; lookups answer `{ results }`.
  - Preview builder: `refs` for each lookup field set (label via the lookup's label rule), `computed.due` / `computed.reminders` / `computed.recurrence` (`describeRecurrence`) / `computed.thread` («2 з 3 у потоці») in `ctx.locale` + `ctx.timeZone` («завтра, 10:00» relative within ±6 days, else `d MMMM, HH:mm`); `warnings`: open item with ≥ 2 matching title words («Є схожа задача #41»), a past `date`, a sequential parent.
  - REST: `GET /drafts/many?batchId=`, `POST /drafts/save {draftId}`, `POST /drafts/discard {draftId}`, `POST /drafts/save-batch {batchId}`. Item / habit REST write routes call `ToolsRegistry.call` (camelCase input path skips the key mapper) so validation is shared.

- [ ] **Step 1:** Registry + helpers + drafts entity/service/controller.
- [ ] **Step 2:** Tool definitions (all of spec §8.2), keywords uk + en per tool.
- [ ] **Step 3:** Switch Task 5/7 write controllers to `ToolsRegistry.call`.
- [ ] **Step 4: Verify** via REST: `POST /drafts/...` covered in Task 12; here: `GET /health` lists `tools: <count>`; startup fails loudly if a schema field lacks a description.
- [ ] **Step 5:** Stage.

### Task 10: MCP server (streamable HTTP) + stdio proxy

**Files:**
- Create: `src/mcp/{mcp.module.ts,mcp.controller.ts,services/mcp-sessions/mcp-sessions.service.ts,services/mcp-server-factory/mcp-server-factory.service.ts,helpers/{tool-result.ts,read-request-meta.ts},constants/context-text.ts}`
- Create: `src/mcp-stdio.ts` (separate entry, built to `dist/mcp-stdio.js`)

**Interfaces:**
- Consumes: `ToolsRegistry`, `ApiKeyGuard` (same guard on `/mcp`), `DraftsService.findByBatch`, `TodayService`.
- Produces:
  - `McpController` at `/mcp` (`POST`, `GET`, `DELETE`), using `@Req()`/`@Res()` and `StreamableHTTPServerTransport.handleRequest(req, res, body)`; sessions `Map<sessionId, { server, transport, apiKeyId }>` as in the reference `main.ts`; a request whose key differs from the session's key → 401.
  - Low-level `Server` (`name: 'tasker'`, `version` from package.json, capabilities `tools: {listChanged: true}`, `resources: {subscribe: true}`), handlers: `tools/list` (all tools, `inputSchema` from `jsonSchema`, `annotations`, `_meta`), `tools/call` (`readRequestMeta(req.params._meta)` → `{dryRun, batchId, draftId, locale, timeZone}` → `RequestCtx`; `toolResult(outcome, locale)` → `{content:[{type:'text',text}], structuredContent, isError?}` with errors as `{valid:false, errors}`), `resources/list` + `resources/read` for `tasker://context`, `tasker://today`, `tasker://drafts/<batchId>`.
  - `McpSessionsService.notifyResourceUpdated(apiKeyId, uri)`; `notifyToolsChanged()` (on boot when `schemaHash()` ≠ `settings.toolsSchemaHash`, then stores it).
  - `mcp-stdio.ts`: `Client` with `StreamableHTTPClientTransport(new URL('http://127.0.0.1:' + PORT + '/mcp'), { requestInit: { headers: { Authorization: 'Bearer ' + TASKER_API_KEY } } })` re-exposed through a stdio `Server` forwarding `tools/list`, `tools/call`, `resources/*`.

- [ ] **Step 1:** Controller, sessions, server factory, helpers, resources.
- [ ] **Step 2:** stdio proxy; add to README how to register it in Claude Code (`claude mcp add tasker -e TASKER_API_KEY=… -- node apps/server/dist/mcp-stdio.js`).
- [ ] **Step 3: Verify** with Task 12's script `mcp:list` (written there) or `npx @modelcontextprotocol/inspector --cli http://127.0.0.1:$PORT/mcp --header "Authorization: Bearer $KEY" --method tools/list` → tools listed with `_meta.lookup`; without header → HTTP 401.
- [ ] **Step 4:** Stage.

### Task 11: Events — webhooks, reminder sweep, draft expiry

**Files:**
- Create: `src/events/{events.module.ts,events.service.ts,queues/webhooks.queue.ts,queues/webhooks.processor.ts,types/connector-event.types.ts,helpers/sign-body.ts}`
- Create: `src/reminders/services/reminder-sweep/reminder-sweep.service.ts`, `src/drafts/services/draft-expiry/draft-expiry.service.ts` (both `@Cron`)

**Interfaces:**
- Consumes: `ApiKeysService.listWithEvents`, `deriveKeySecret`, `DraftsService`, `RemindersService`, `scheduledSlots`, items/habits state, `McpSessionsService`.
- Produces:
  - `type ConnectorEvent = { connector: 'tasker'; type: 'draft.updated'; draftId; batchId; status; itemId? } | { connector: 'tasker'; type: 'reminder.due'; reminderId; itemId?; habitId?; title; at; late: boolean }`.
  - `EventsService.emitToKey(apiKeyId, event)`, `emitToAll(event)` → BullMQ `webhooks` job per key (`attempts: 10`, exponential backoff from 5 s, removed after 24 h); processor POSTs JSON with `X-Connector: tasker`, `X-Tasker-Signature` (Global Constraints), 5 s timeout; non-2xx → retry.
  - Draft status change → `emitToKey(draft.apiKeyId, draft.updated)` + `McpSessionsService.notifyResourceUpdated(draft.apiKeyId, 'tasker://drafts/' + batchId)`.
  - `ReminderSweep` every minute: due `at` reminders with `lastFiredAt` null; `time_of_day` reminders whose local time today passed, the owner is scheduled today and not done/skipped, `lastFiredAt` < today's local midnight; skip done / deleted / locked / archived owners; set `lastFiredAt` before emitting; `late` = more than 5 min after due.
  - `DraftExpiry` hourly: `DraftsService.expireOld()` → `expired` + events.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify.** Start a throwaway receiver (`npx http-echo-server` or a 10-line `node -e` server printing headers + body) on another port; create a key with `--events-url` pointing at it; a reminder `at` 1 min ahead → receiver gets `reminder.due` within 2 min; recompute the signature with `deriveKeySecret` in `tsx -e` → equal. Restart the server mid-way → no second delivery.
- [ ] **Step 3:** Stage.

### Task 12: End-to-end verification and hand-over

**Files:**
- Create: `apps/server/scripts/mcp-check.ts` (`pnpm --filter server mcp:check`): connects with `TASKER_API_KEY`, runs the Done-when scenarios over MCP and prints PASS/FAIL per line; also tries without a key (expects 401) and with a revoked key.
- Modify: `README.md` (run, keys, MCP URL, events, stdio)
- Create: note in the shared notes folder `…/side-session-notes/local_9c1499a2-…/tasker-server-ready.md` for the Mia session

- [ ] **Step 1:** Script covering spec §10 items 1–7 (dry run of `create_item` with `project_id` from `find_projects`, `remind_at` tomorrow 10:00 → `preview.refs.project_id.label = "Mia"`, `preview.computed.due` contains «завтра»; past `remind_at` → `invalid:item:remind-at-past`; execute with `draft_id`… via `_meta.draftId` → saved + webhook received).
- [ ] **Step 2: Verify.** `pnpm --filter server mcp:check` → all PASS. Paste the output into the hand-over note.
- [ ] **Step 3:** Tell the Mia session (SendMessage to the session that started this one): MCP URL `http://127.0.0.1:<PORT>/mcp`, `pnpm tasker api-key create mia --events-url <hub>/connectors/events`, signature derivation, the new `reminder.due` event, `tasker://context` URI (the reference connector uses `context://tasker`; Mia should read `tasker://context`).
- [ ] **Step 4:** Stage; report to the user; commit only on their word.
