# tasker server — API + MCP for tasks, periodic tasks, habits and stats

> Status: draft for review · Date: 2026-11-17 · Author: vitalii + Claude
> Extends `2026-11-15-assistant-hub-design.md` §5.5 / §6 (tasker service, Postgres) and implements
> `2026-11-17-mia-connector-contract.md` (tasker as a Mia connector). The UI reference is
> `docs/ScreenRecording_11-17-2026 07-50-00_1.mp4` (a mobile task + habit tracker).
> `2026-11-15-personal-tasker-design.md` (SQLite daemon) is history for this server.

## 1. Intent and why

tasker is the first connector of Mia (the user's hub assistant, `~/projects/mia-assistant`). Mia recognizes text or
voice and calls tasker's MCP tools; Claude Code uses the same MCP. Later a mini app (tasker's only UI, opened by Mia in
a WebView) will be built on the same API. This task builds the **server**: the data model,
one service layer, REST and MCP over it, so that everything the reference app shows (Today, tasks with checklists and
reminders, periodic tasks, habits, statistics) can be managed through the API and MCP before any UI exists.

## 2. Goals, non-goals, anti-goals

**Goals**
- Model and API for: categories, projects, tags; tasks (single, with threads), checklists, reminders, the pending flag;
  periodic tasks with occurrences; habits with five evaluation types, extra goals and check-ins; Today; statistics.
- `idea` / `note` items keep working (they are items with another `type`).
- MCP over streamable HTTP with API keys, per the connector contract: tool metadata, lookups, dry run + drafts,
  structured errors, `_meta.locale` / `timeZone`, events to Mia. The stdio entry for Claude Code stays.
- One service layer: REST controllers and MCP tools call the same services with the same validation.

**Non-goals (this task)**
- The mini app, `initData` sessions and the host bridge (contract §5) — next task; the API must already cover it.
- Anything Telegram now (user, 2026-11-17: «не треба тут тг зараз»): no bot, no Telegram initData. Capture is Mia's.
  Later, the one mini app serves every host (Mia's agent, Telegram) through the host adapter (user). Webhooks stay:
  they are how tasker exchanges events with agents (user).
- Embeddings / semantic search, brainstorms, LLM calls of any kind in tasker (recognition is Mia's).
- Deployment to Railway (local Mac first), WebSocket gateway, tests (nestjs skill: opt-in only).

**Anti-goals**
- Two code paths for one write (an MCP tool that writes differently from the REST route).
- An id that came from nowhere: every reference is checked to exist and not be deleted, on dry run and on execute.
- Silent schema breaks for Mia: a breaking input change is a new tool name or a `_meta.schemaVersion` bump.
- Losing a reminder because the Mac slept: a missed reminder fires late, marked late, never dropped.

## 3. Constraints

- Local Mac: Postgres 17 (Homebrew, running), Redis (Homebrew, running), Node 22, pnpm.
- Stack as Mia's hub: NestJS 10, TypeORM 0.3, `pg`, BullMQ, `@modelcontextprotocol/sdk` ^1.32, class-validator.
  Plain NestJS following the `nestjs` skill (no `@mia/nest-kit`: it is private to `mia-erp-server` and Mia does not
  use it). Base classes (`BaseEntity`, `BaseRepository`, `BaseService`, `BaseControllerOf`, `AppResponse`,
  `AppException`, `GlobalExceptionFilter`) are written in the app's `src/common` in the skill's shapes.
- Single user (the owner). Loopback bind by default; LAN bind is a config flag.
- Port leased via dev-dashboard (`allocate_port`), not picked by hand.
- Reference shapes for MCP output: `~/projects/mia-assistant/apps/test-connector/src` (what Mia's hub already reads).

## 4. Approaches considered

| | Approach | Trade-off | Verdict |
|---|---|---|---|
| **A** | One Nest app; MCP served in-process at `/mcp` calling the services; stdio entry is a thin HTTP proxy. Recurrences computed from the rule; rows only for occurrences acted on. Reminders by a once-a-minute sweep. | Rule edits apply to the future at once, hourly frequency costs no rows; stats compute occurrences in code (cheap for one user) | **chosen** (user) |
| B | As A, but a cron materializes occurrences 90 days ahead | Plain SQL for stats; every rule edit regenerates rows, hourly = thousands of rows, window-edge bugs | rejected |
| C | Separate MCP process proxying REST (2026-11-15 shape) | Isolation; but dry run, drafts and tool schemas duplicated in REST, no gain for one user | rejected |

## 5. Decided (as decided in conversation)

- **Postgres locally**, own database `tasker` (user).
- **Categories and projects both, separately** (user): a category is a life area (icon + colour, the Today filter
  chips); a project is a work context (Mia, Claude Code, `find_projects`). An item may have both. Tags stay.
- **Threads** (user): a task splits into child tasks, done in any order or sequentially; a child is a full task and
  may have its own checklist (user: «дочірня може бути чеклістом»).
- **Stats «failed» is a user setting** (user): `stats.failed_mode` = `missed` (a scheduled day that passed without a
  check-in counts as failed; default) or `explicit` (failed only when marked).
- **No Telegram in tasker** for now (user). Reminders are events to Mia.
- **All five habit evaluation types** now (Claude's proposal, not objected): `yes_no`, `numeric`, `checklist`,
  `timer`, `stopwatch`.
- Approach A (user).

## 6. Data model (Postgres, TypeORM migrations)

Conventions: UUIDv7 ids, `timestamptz` in UTC, **local dates** (`date`) for anything that belongs to a day of the
owner (occurrences, check-ins, the Today day), the owner's time zone from `settings.timezone` (default
`Europe/Kyiv`; Mia's `_meta.timeZone` overrides per call for parsing input only). Soft delete via `deleted_at`.
`type` never `kind`. Multi-row writes in one transaction, no I/O inside it.

```sql
settings(key text pk, value jsonb, updated_at)          -- timezone, locale, stats.failed_mode, week_start (1 = Mon)

api_keys(id, name, prefix text,                          -- 'tsk_ab12' shown in lists
         key_hash text unique,                           -- sha256(plain key); the plain key is shown once
         webapp_secret text, webhook_secret text,        -- HMAC('webapp', key), HMAC('webhook', key), computed at creation
         events_url text null,                           -- Mia's POST /connectors/events; null = no events
         created_at, last_used_at, revoked_at)

projects(id, name, slug unique, archived_at, created_at, updated_at, deleted_at)
categories(id, name, icon text, color text, position int, archived_at, created_at, updated_at, deleted_at)
  -- seeded: Other (default, cannot be deleted), Health, Study, Work, Finance, Art, Gym, Outdoor, Beauty, Care
tags(id, name unique)  item_tags(item_id, tag_id, pk)

items(id, short_id int unique (sequence, never reused),  -- #123
      type text check (task|idea|note),
      title text not null, body text,
      status text check (inbox|todo|doing|blocked|done|archived),
      owner text check (me|claude) default 'me',
      priority smallint null check (1..3),               -- null = «Default» in the reference
      category_id → categories (default Other), project_id → projects null,
      date date null,                                    -- the day the task belongs to (the reference's «Date»)
      due_at timestamptz null,                           -- when a time is given
      pending bool default false,                        -- shown every day from `date` until done
      parent_id → items null,                            -- a thread's parent (one level only)
      position int,                                      -- order among siblings
      subtasks_order text check (any|sequential) default 'any',
      recurrence jsonb null,                             -- non-null = periodic task (§6.2)
      starts_on date null, ends_on date null,            -- periodic tasks
      evaluation text check (yes_no|checklist) default 'yes_no',  -- periodic tasks (reference: yes/no or checklist)
      source jsonb null,                                 -- {client, chatId?, messageId?} from Mia
      created_at, updated_at, done_at, deleted_at)

checklist_items(id, item_id → items, title, position, done_at null)   -- for a periodic task: the template; done state lives on the occurrence

item_occurrences(id, item_id → items, date date, slot smallint default 0,   -- slot = hour for hourly
                 status text check (done|skipped|failed),
                 checklist_done uuid[] default '{}', note text,
                 moved_to date null, done_at, created_at, unique(item_id, date, slot))

reminders(id, item_id → items null, habit_id → habits null,            -- exactly one owner
          at timestamptz null,                           -- single task: an absolute moment
          time_of_day time null,                         -- periodic task / habit: each scheduled day at this local time
          offset_min int null,                           -- optional: «N min before due_at»
          last_fired_at timestamptz null, created_at)

habits(id, short_id int unique, name not null, description,
       category_id → categories, priority smallint null,
       evaluation text check (yes_no|numeric|checklist|timer|stopwatch),
       target_value numeric null, target_condition text check (at_least|at_most|exactly) null, unit text null,
       checklist_min int null,                           -- checklist: how many sub-items make the day done (null = all)
       recurrence jsonb not null, starts_on date not null, ends_on date null,
       goals jsonb default '{}',                         -- {weekly?, monthly?, yearly?, all_time?: {value, metric: 'days'|'sum'}}
       notes_enabled bool default false,
       status text check (active|archived) default 'active', archived_at,
       position int, created_at, updated_at, deleted_at)
habit_checklist_items(id, habit_id, title, position)
habit_checkins(id, habit_id, date date, slot smallint default 0,
               status text check (done|skipped|failed),  -- done is derived from value vs target, stored for queries
               value numeric null,                       -- numeric value, or seconds for timer / stopwatch
               checklist_done uuid[] default '{}', note text null,
               created_at, updated_at, unique(habit_id, date, slot))

drafts(id, batch_id uuid, tool text, dto jsonb, preview jsonb,
       status text check (draft|saved|discarded|expired),
       result_id uuid null,                              -- the item / habit / … the save produced
       api_key_id → api_keys, created_at, expires_at)    -- TTL 24 h
```

### 6.1 Tasks, threads, checklist, pending

- A **single task** is an item `type='task'` with `recurrence is null`. «Date» → `date`; a time → `due_at` too.
- **Pending** (`pending=true`): the task appears on Today for every day from `date` until it is done.
- **Checklist**: ordered `checklist_items`; the Today row shows `done/total`. Completing a task does not tick its items.
- **Threads**: children are items with `parent_id`, one level deep (a child cannot have children). The parent's
  `subtasks_order`:
  - `any` — every child is actionable.
  - `sequential` — only the first undone child (by `position`) is actionable; the others are **locked**: not on Today,
    not returned by `next_task`, completing one fails with `invalid:item:thread-locked`.
  - The parent shows `threads: {done, total}`; when the last child is done, the parent is done automatically
    (re-opening a child re-opens the parent).
- `idea` / `note` items use the same table; checklist, threads and recurrence are rejected for them
  (`invalid:item:type-unsupported`).

### 6.2 Recurrence (periodic tasks and habits)

`recurrence` is one JSON object, validated by a DTO per `freq`:

| `freq` | fields | scheduled days |
|---|---|---|
| `hourly` | `every_hours` (1–12), `from` / `to` (`HH:mm`) | every day, slots at each hour in range |
| `daily` | — | every day |
| `weekly` | `weekdays` (1–7, Mon = 1) | those weekdays |
| `monthly` | `month_days` (1–31; 31 = last day when shorter) | those days of month |
| `every_n_days` | `interval` (≥ 2) | `starts_on + k·interval` |
| `days_per_period` | `count`, `period` (`week` / `month`) | not fixed: the item is due every day of the period until `count` days are done |
| `yearly_dates` | `dates` (`MM-DD`) | those dates each year |

Scheduled days are computed between `starts_on` and `ends_on` (or the query's end). An occurrence row exists only once
something happened on it (done, skipped, failed-explicit, moved, checklist ticked). A **moved** occurrence keeps its row
on the old day with `moved_to`, and appears on the new day.

### 6.3 Habits

- Day result by `evaluation`: `yes_no` — done / not; `numeric` — `value` against `target_value` with
  `target_condition`; `checklist` — `checklist_done` count ≥ `checklist_min` (or all); `timer` — `value` seconds
  ≥ target; `stopwatch` — the day's seconds summed over sessions (each `check_in` adds), done when ≥ target if a target
  is set, else when > 0. A check-in below target is stored with `status` not done (partial), counted as not done.
- `skipped` is always explicit. `failed`: with `stats.failed_mode = missed` a scheduled day before today without a
  done / skipped check-in counts as failed (computed, not stored); with `explicit` only stored `failed` rows count.
- **Extra goals** (`goals`): per window (week / month / year / all time), `metric: 'days'` (done days) or `'sum'`
  (sum of `value`); stats report progress toward each.
- `notes_enabled` allows `note` on check-ins. Archived habits keep their check-ins, leave Today and the active list.

### 6.4 Reminders

- A single task takes 0..n `at` reminders (the reference's «Add reminder», several); contract's `remind_at` on
  `create_item` maps to one `at` reminder. Periodic tasks and habits take `time_of_day` reminders.
- A minute sweep (`@nestjs/schedule`) finds due reminders (`at <= now` and not fired; `time_of_day` passed today on a
  scheduled, not-done day and not fired today), sets `last_fired_at`, and enqueues an event to Mia. Fired late (> 5
  min) → `late: true`. Reminders of done / deleted / locked items are skipped.

### 6.5 Today

`GET /today?date=YYYY-MM-DD&category_id=` (and MCP `get_today`) returns:

```ts
{ date, progress: { done, total, percent },
  categories: [{ id, name, icon, color, count }],          // the chips, with the day's counts; «Completed N» = done count
  entries: [{ source: 'task' | 'occurrence' | 'habit', id, itemId?, habitId?, date, slot?,
              title, type, category: { id, icon, color }, priority,
              checklist?: { done, total }, threads?: { done, total },
              habit?: { evaluation, value?, target?, unit? },
              done: boolean, status?: 'done' | 'skipped' | 'failed', late?: boolean }] }
```

Entries: single tasks with `date` = day, pending tasks with `date` ≤ day and not done, actionable threads, occurrences
of periodic tasks scheduled (or moved) to the day, active habits scheduled on the day. Ideas and notes are not on Today.
`GET /today/strip?from=&to=` gives per-day `{date, done, total}` for the day strip.

### 6.6 Statistics

`GET /stats?period=week|month|year|all&anchor=YYYY-MM-DD&scope=habits|tasks|all` (default `habits`) and MCP
`get_stats`:

```ts
{ period: { from, to },
  summary: { successRate: number | null, completed, skipped, failed },   // successRate = completed / (completed + failed); null when 0/0
  habits: [{ id, name, score, goals: [{ window, value, target }] }],      // «Habit Progress Summary»
  distribution: { completed, failed, skipped },                           // percents
  byDay: [{ date, completed, failed, skipped }],                          // «Habit Status by Day»
  overTime: [{ date, rate }] }                                            // «Habit Progress Over Time»
```

`all` starts at the earliest `starts_on`. Future days are excluded. `scope=tasks` counts periodic-task occurrences and
dated single tasks (done on / after their day vs not).

## 7. REST API (nestjs skill route convention: no path params)

Every response is `AppResponse`; errors are `AppException` with `innerCode` (the same codes as MCP, §8.4). Auth: every
route needs `Authorization: Bearer tsk_…` (the mini app will add a cookie session next task), except `GET /health`.

| Resource | Routes |
|---|---|
| api-keys | `POST /api-keys/create {name, eventsUrl?}` → key once; `GET /api-keys/many`; `PUT /api-keys/update {id, name?, eventsUrl?}`; `DELETE /api-keys/delete?id=` (revoke); CLI `pnpm tasker api-key create <name>` (works without a key) |
| settings | `GET /settings`; `PUT /settings/update {timezone?, locale?, failedMode?, weekStart?}` |
| categories, projects, tags | `GET /x`, `GET /x/many`, `POST /x/create`, `PUT /x/update`, `DELETE /x/delete?id=`; `POST /categories/reorder {ids}` |
| items | CRUD as above + `POST /items/complete {id, date?, slot?}` (date/slot for an occurrence), `POST /items/uncomplete`, `POST /items/skip {id, date, slot?}`, `POST /items/move-occurrence {id, date, toDate}`, `POST /items/split {id, order, threads: [{title, …}]}`, `POST /items/reorder {parentId?, ids}`, `POST /items/add-note {id, text}` (appends to `body`) |
| checklist | `POST /checklist/create {itemId, title}`, `PUT /checklist/update {id, title?, position?}`, `POST /checklist/toggle {id, date?}` (date for a periodic task's occurrence), `DELETE /checklist/delete?id=` |
| reminders | `POST /reminders/create {itemId|habitId, at|timeOfDay|offsetMin}`, `DELETE /reminders/delete?id=` (also accepted inline as `reminders[]` on create/update of items and habits) |
| habits | CRUD + `POST /habits/check-in {id, date, slot?, value?, checklistDone?, note?, status?}`, `POST /habits/archive {id}`, `POST /habits/restore {id}`, `GET /habits/check-ins?habitId=&from=&to=` |
| today | `GET /today`, `GET /today/strip` |
| stats | `GET /stats` |
| drafts | `GET /drafts/many?batchId=`, `POST /drafts/save {id}`, `POST /drafts/discard {id}`, `POST /drafts/save-batch {batchId}` (only valid drafts) |

Inline children: `items/create` and `items/update` accept `checklist: [{id?, title}]` (ordered; replaces the list on
update) and `reminders: [...]`, so one call (and one MCP tool) writes the whole form of the reference app.

Deviation from the contract, in favour of the nestjs skill: `DELETE /api-keys/:id` becomes
`DELETE /api-keys/delete?id=`; the contract's other routes are MCP, so nothing else changes.

## 8. MCP server

### 8.1 Transport and auth

- `POST /mcp` (+ `GET` / `DELETE` for the session stream), `@modelcontextprotocol/sdk` streamable HTTP transport in
  a Nest controller, stateful sessions (so `notifications/resources/updated` and `tools/list_changed` reach Mia).
- `Authorization: Bearer tsk_…` checked by the same guard as REST; missing / revoked → 401 before the transport sees
  the request. The session remembers its `api_key_id` (drafts, events).
- `serverInfo: { name: 'tasker', version }` from `package.json`.
- stdio entry `dist/mcp-stdio.js` for Claude Code: an MCP client to `http://127.0.0.1:<port>/mcp` with a key from
  env `TASKER_API_KEY`, re-exposing the same tools (a proxy, no DB).

### 8.2 Tools

Every tool: one-line `description`; `inputSchema` with `additionalProperties: false`, a `description` on every field,
enums, formats; `annotations`; `_meta.actions`, `_meta.keywords` (uk + en), `_meta.lookup` on reference fields,
`_meta.lookupArg: 'query'` on lookups, `_meta.schemaVersion`, `_meta.ui.app` on write tools (the mini app URL, wired
when the app exists). Schemas are generated from the same DTO classes the REST routes use, so they cannot drift.

| Tool | actions | annotations | lookups |
|---|---|---|---|
| `find_projects`, `find_categories`, `find_tags`, `find_items`, `find_habits` | read | readOnly | — |
| `get_today`, `get_item`, `list_items`, `get_habit`, `list_habits`, `get_stats`, `next_task` | read | readOnly | `project_id`, `category_id` |
| `create_item` | create | — | `project_id`, `category_id`, `tag_ids[]`, `parent_id` |
| `update_item` | update | — | `id` → `find_items`, + as create |
| `complete_item`, `uncomplete_item` | update | idempotent | `id` |
| `skip_occurrence`, `move_occurrence` | update | — | `id` |
| `toggle_checklist_item` | update | idempotent | `item_id` → `find_items` (+ `title` matched within the item) |
| `split_task` | update | — | `id` |
| `add_note` | update | — | `item_id` |
| `delete_item` | delete | destructive | `id` |
| `create_habit`, `update_habit` | create / update | — | `category_id`, `id` → `find_habits` |
| `check_in_habit` | update | — | `habit_id` → `find_habits` |
| `archive_habit` | update | — | `habit_id` |
| `create_category`, `create_project` | create | — | — |
| `update_settings` | update | — | — |

- Lookups take `{ query, limit? }` (empty query lists) and answer `structuredContent: { results: [{ id, label,
  path? }] }`. Labels: item `#<short_id> <title>`, habit its name, project / category / tag its name. `find_items`
  matches `#123`, a bare number, and title words (`ILIKE` on words, ranked by match then recency).
- `next_task` keeps the 2026-11-15 contract: oldest actionable `todo` with `owner='claude'`, sets `doing`, re-offers
  after 24 h idle.
- `search_items` (semantic) is not built now: no embeddings in this task (non-goal); `find_items` covers text match.

### 8.3 Dry run and drafts

As the contract §4, for every write tool: `_meta.dryRun: true` validates fully (schema, references exist and are
not deleted / archived, `remind_at` / reminder `at` in the future, thread not locked, recurrence fields consistent),
writes nothing but a `drafts` row (`batch_id` from `_meta.batchId` or a new one), and answers
`structuredContent: { valid, draftId, batchId, errors: [], preview: { refs, computed, warnings } }`.
`preview.computed` holds human strings in `_meta.locale` / `_meta.timeZone` (`«завтра, 10:00»`, `«щопонеділка»`,
`«3 з 5 у потоці»`); `warnings` — a similar open item by title (plain text match, not embeddings), a date in the past
for a task, a sequential parent. A call with `_meta.draftId` re-validates the stored DTO (or the call's own args if
given), executes, marks the draft `saved` with `result_id`. Drafts expire after 24 h (hourly sweep → `expired`).

### 8.4 Errors

`isError: true`, `structuredContent: { valid: false, errors: [{ path, code, message, expected?, options? }] }`;
the same codes go to REST as `innerCode`. Codes general → specific: `invalid:args`, `invalid:item:remind-at-past`,
`invalid:item:thread-locked`, `invalid:item:type-unsupported`, `invalid:recurrence:<field>`, `invalid:habit:target`,
`not-found:project`, `not-found:item`, `not-found:habit`, `not-found:draft`, `conflict:draft:not-pending`,
`unauthorized:api-key`. `options` on a lookup field that matched several. `message` in `_meta.locale`
(uk default, en).

### 8.5 Resources and notifications

- Resources: `tasker://context` (3–5 lines for routing: tasks, periodic tasks, habits, ideas, notes, categories vs
  projects), `tasker://today`, `tasker://drafts/<batchId>`.
- On a draft status change: `notifications/resources/updated` for `tasker://drafts/<batchId>` on the MCP session of
  the draft's key (if open), and a webhook.
- **Webhook to Mia** (BullMQ queue `events`, retries with backoff, 24 h max): `POST <api_keys.events_url>`,
  headers `X-Connector: tasker`, `X-Tasker-Signature: hex(HMAC-SHA256(webhook_secret, body))`, body
  `{ connector: 'tasker', type, … }`:
  - `draft.updated` — `{ draftId, batchId, status, itemId? }` (contract §6), to the draft's key.
  - `reminder.due` — `{ reminderId, itemId?, habitId?, title, at, late }`, to every active key with `events_url`.
    **New event type**: Mia's hub must add it (tell the Mia session).
- `notifications/tools/list_changed` when a tool's schema version changes (on start, compared with the last
  version stored in `settings`).

## 9. Layout and operations

```
tasker/
├── apps/server/            # NestJS app (this task)
│   └── src/ common/ config/ database/ settings/ api-keys/ categories/ projects/ tags/ items/ checklist/
│            reminders/ recurrence/ habits/ today/ stats/ drafts/ events/ mcp/ cli/
├── apps/app/               # the mini app (next task)
├── docs/
└── pnpm-workspace.yaml
```

- Config in `apps/server/.env` (gitignored): `DATABASE_URL`, `REDIS_URL`, `PORT` (leased), `BIND_HOST=127.0.0.1`.
- `recurrence/` is a pure module (no DB): `scheduledDays(rule, from, to)` used by today, stats, reminders, drafts.
- README rewritten for the new direction (the Next.js tracker text goes).

## 10. Done when (checked against the running server)

1. Create / update / complete a task with a checklist (3 items) and 2 reminders through REST and MCP.
2. A periodic task (`weekly` Mon/Wed/Fri) returns its occurrences for a week on `GET /today/strip`; complete one,
   skip one; Today shows them right.
3. A threaded task with `sequential` order: the second thread is locked until the first is done; the parent closes
   with the last.
4. A `numeric` habit: check-ins over a week; `GET /stats?period=week` with `failedMode` `missed` vs `explicit`.
5. MCP: `tools/list` + `tools/call` with an API key; 401 without one and with a revoked one.
6. Dry run of `create_item` returns a draft with a preview (`refs.project_id.label`, `computed.due`); a past
   reminder returns `invalid:item:remind-at-past`; executing with `draftId` saves it and fires `draft.updated`.
7. `find_projects` / `find_items` lookups answer `structuredContent.results`.
8. The Mia session is told the port, how to create a key, and the new `reminder.due` event.

## 11. Builder-check decisions (Claude's calls, correctable)

1. **Counting rules for stats.**
   - Unit = one scheduled slot (an hourly task with 8 slots a day is 8 units; every other `freq` is 1 per day).
   - `days_per_period`: the item stays on Today every day of the period until `count` days are done, then leaves it.
     Under `missed`, the shortfall (`count − done`) is counted as failed on the period's last day, once that day has
     passed. A period still in progress counts no failures.
   - `habits[].score` = the habit's success rate over the period (`completed / (completed + failed)`). No streak
     weighting.
   - `scope=tasks`: a dated single task done on or after its day counts as completed. It counts as failed only under
     `missed`, while it is still undone after its day. A `pending` task's day is its `date`.
2. **Naming.**
   - MCP args are `snake_case`, as in the contract and Mia's reference connector. A tool's target field is named by
     what it points at: `item_id`, `habit_id`, `draft_id`, never a bare `id`.
   - REST DTOs are `camelCase`, as in the nestjs skill.
   - One zod schema per input is the single source of truth. It is written in `camelCase` and produces both the DTO
     validation and the tool's JSON Schema. A generic key mapper turns `camelCase` into `snake_case` for MCP and back
     again.
3. **Threads × recurrence × pending.**
   - A periodic task cannot be split (`invalid:item:thread-periodic`). A child cannot be periodic, but may have its
     own `date`, `pending`, checklist and reminders.
   - The parent may have its own checklist and date.
   - Completing the parent directly completes all its open children (cascade, one transaction).
   - Reminders of locked children are skipped.
4. **Drafts of non-create tools.** Saving a draft re-validates the stored DTO against the current state and applies it
   as a patch. There is no version check (one user). `delete_item` is dry-runnable: its preview shows what goes,
   including threads and occurrences. `update_settings` has no dry run. `save-batch` returns a result per draft
   (`{draftId, status: 'saved' | 'invalid', errors?}`); valid drafts save even when others fail.
5. **HMAC derivation.** `secret = HMAC-SHA256(key = 'webhook' | 'webapp', message = apiKey)`, then
   `signature = hex(HMAC-SHA256(key = secret, message = rawBody))`. tasker tells the Mia session this exact form.
6. **Time zone.**
   - An MCP call's `_meta.timeZone` sets the time zone for the whole call: parsing input, "today", "in the past" and
     the `date` derived from `due_at`.
   - REST takes the time zone from an `X-Time-Zone` header. When there is none, it uses `settings.timezone`.
   - Stored local dates never move once written.

## 12. Left to the builder

- Exact DTO class layout and how JSON Schema is produced from DTOs (a small class-validator → JSON Schema step, or
  zod schemas shared by DTOs and tools — pick one, one source of truth).
- uk / en message wording; `computed` phrasing.
- Seeded category icons / colours (names of the reference app's icons are fine as strings).
- The minute-sweep and hourly-draft-sweep details; BullMQ retry schedule.
