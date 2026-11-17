# tasker

A local server for the user's tasks, periodic tasks, habits, ideas and notes, with Today and statistics. It is the
first connector of Mia (`~/projects/mia-assistant`): Mia calls its MCP tools; a mini app on the same API comes later.

- **Spec:** [`docs/superpowers/specs/2026-11-17-tasker-server-design.md`](docs/superpowers/specs/2026-11-17-tasker-server-design.md)
- **Plan:** [`docs/superpowers/plans/2026-11-17-tasker-server.md`](docs/superpowers/plans/2026-11-17-tasker-server.md)
- **Stack:** NestJS 10 · TypeORM + Postgres · BullMQ + Redis · `@modelcontextprotocol/sdk` · zod (one schema per input
  for REST, MCP JSON Schema and errors).

## Run

Needs Postgres (database `tasker`) and Redis running locally (Homebrew). `apps/server/.env`:

```
DATABASE_URL=postgres://localhost/tasker
REDIS_URL=redis://127.0.0.1:6379
PORT=3109            # leased from dev-dashboard (port name `api`)
BIND_HOST=127.0.0.1
```

```bash
pnpm install
```

```bash
pnpm dev
```

Migrations run on start (`migrationsRun`). `GET /health` → `{ ok, db, redis }`.

## API keys

Every route (REST and `/mcp`) needs `Authorization: Bearer tsk_…`, except `/health`.

```bash
pnpm tasker api-key create mia --events-url http://127.0.0.1:<hub-port>/connectors/events
```

The key is printed once; only its hash is stored. `pnpm tasker api-key list`, `pnpm tasker api-key revoke <id>`.
A revoked key gets 401 at once, on REST and on an open MCP session.

## MCP

- **Streamable HTTP:** `http://127.0.0.1:3109/mcp` (stateful sessions; a session answers only the key that opened it).
- **Tools (29):** lookups `find_projects`, `find_categories`, `find_tags`, `find_items`, `find_habits`
  (`{ query, limit? }` → `structuredContent.results`); reads `get_today`, `get_item`, `list_items`, `get_habit`,
  `list_habits`, `get_stats`, `next_task`; writes for items, habits, categories, projects and settings. Arguments and
  results are `snake_case`; every field has a description, `_meta.lookup` names the lookup for reference fields.
- **`_meta` on `tools/call`:** `locale` (`uk` / `en`), `timeZone`, `dryRun`, `batchId`, `draftId`. A dry run validates
  fully, stores a draft and answers `{ valid, draftId, batchId, errors, preview: { refs, computed, warnings } }`;
  `_meta.draftId` executes it. Errors: `isError` + `{ valid: false, errors: [{ path, code, message }] }`.
- **Resources:** `tasker://context` (what tasker holds, for routing), `tasker://today`, `tasker://drafts/<batchId>`
  (subscribe: `notifications/resources/updated` on every status change). `notifications/tools/list_changed` when
  the tool schema hash changes between starts.

### Claude Code (stdio)

`dist/mcp-stdio.js` is a proxy to the running server (no DB), built by `pnpm build`:

```bash
claude mcp add tasker -e TASKER_API_KEY=tsk_… -- node /Users/vitalii/projects/tasker/apps/server/dist/mcp-stdio.js
```

`TASKER_URL` overrides `http://127.0.0.1:$PORT/mcp` (`PORT` defaults to 3109).

## Events (webhooks)

BullMQ queue `webhooks` POSTs JSON to the key's `events_url` (10 attempts, exponential backoff from 5 s, kept 24 h):

- `draft.updated` — `{ connector: 'tasker', type, draftId, batchId, status: saved|discarded|expired, itemId?, label? }`,
  to the draft's key.
- `reminder.due` — `{ connector: 'tasker', type, reminderId, itemId?, habitId?, title, at, late }`, to every active
  key with an `events_url`. A minute sweep fires one-off reminders once and daily ones once a day while the owner is on
  today's plan and not done / skipped; `late` = more than 5 min after due. Drafts expire after 24 h (hourly sweep).

Headers (Mia's signed-request rule):

```
X-Connector: tasker
X-Connector-Timestamp: <unix seconds>
X-Connector-Signature: hex(HMAC-SHA256(secret, "<timestamp>.<raw body>"))
secret = HMAC-SHA256(key = "webhook", message = <api key>)   (raw 32 bytes)
```

`X-Tasker-Signature` carries the same value.

## Check

`scripts/mcp-check.ts` runs spec §10 against the running server (REST + MCP, dry run, drafts, signed webhook, 401
without a key and with a revoked one) and cleans up after itself:

```bash
TASKER_API_KEY=tsk_… pnpm --filter server mcp:check
```

## Layout

`apps/server/src`: `items` (tasks, ideas, notes, threads, occurrences), `checklist`, `reminders` (+ `sweep`),
`habits`, `recurrence` (pure), `today`, `stats`, `categories`, `projects`, `tags`, `settings`, `api-keys`,
`tools` (registry, definitions, preview), `drafts`, `mcp`, `events`, `cli`.
