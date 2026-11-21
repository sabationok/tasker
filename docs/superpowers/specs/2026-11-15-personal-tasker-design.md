# tasker — Telegram-first task & idea capture with hybrid local/Claude agent

> Status: draft for review · Date: 2026-11-15 · Author: vitalii + Claude
> **Superseded on 2026-11-15 (same day)** by `2026-11-15-assistant-hub-design.md`: the scope grew from a task manager into a personal assistant hub with tasker as its first domain. The tasks data model and Telegram UX below carry over; the Mac-local daemon, SQLite and the classifier pipeline do not.
> Supersedes the direction of `docs/specs/2026-09-20-central-task-tracker-design.md` (the
> repo-file-based dev backlog tracker). That spec is kept as history; its concepts
> (owner routing, status set, MCP contract `list / next / complete`, atomic writes) carry over.

## 1. Intent and why

A personal "second brain" for **tasks and ideas**, not for code backlogs. Vitalii captures
things on the go by sending text or voice messages to a Telegram bot. Everything lands in one
SQLite database on his Mac, which acts as the always-on server. A local model (LM Studio)
does the cheap, structured work: speech-to-text post-processing, classification, field
extraction, dedup, embeddings. Claude (Haiku by default) does the thinking work: brainstorms,
breaking a big idea into steps, weekly reviews. A native macOS app (Swift) is the calm
desk-side view over the same data. An MCP server over the same database lets Claude Code /
Claude Desktop later pull ideas and tasks into real work on other projects.

Why hybrid: privacy and zero marginal cost for the high-volume stream of short messages;
quality where it matters (brainstorming), paid per use, only when explicitly invoked.

## 2. Goals, non-goals, anti-goals

**Goals**
- Capture from Telegram (text + voice) with near-zero friction; every message is stored raw
  before anything else happens, nothing is lost.
- Local-only processing for classification/extraction/embeddings/STT.
- Claude (Haiku) only for `/brainstorm`, breakdowns, reviews, and anything free-form.
- One SQLite database as the single source of truth for the bot, the Mac app and MCP.
- MCP server exposing items and brainstorms to Claude Code / Claude Desktop.
- Bot catches up on everything it missed while the Mac was asleep or the daemon was down.
- Reminders delivered back through Telegram.

**Non-goals (v1)**
- Multi-user, sharing, iOS app, cloud sync, Jira/Notion/Trello sync.
- **No web UI.** The Next.js tracker from the old spec is dropped; the only UIs are Telegram and the native macOS app.
- Replacing the dev-backlog tracker idea from the 2026-09-20 spec.
- Running Claude Code itself on the local model (explicitly dropped: the harness adds a ~20k
  token system prompt and no value for schema-shaped work; the daemon calls LM Studio
  directly).

**Anti-goals**
- Silently dropping or mangling a message. A failed classification must still leave the raw
  text in the inbox, visible and retryable.
- A chatty bot that asks a clarifying question on every message. Ask only when confidence is
  low and the ambiguity actually matters (type or due date).
- Sending every message to the cloud. The local/Claude boundary is a hard routing rule, not a
  heuristic.

## 3. Constraints

- Hardware: MacBook Air M4, 24 GB. Everything runs on it; it sleeps (so catch-up matters).
- LM Studio 0.4.x, server on port **1235**, models available: `qwen/qwen3.5-9b` (MLX 4-bit),
  `text-embedding-nomic-embed-text-v1.5`. Models are JIT-loaded and unloaded on idle; the
  first call after idle is a cold start.
- Telegram Bot API cannot use Telegram's own voice transcription (Premium client feature);
  the bot downloads the `.ogg` and transcribes locally.
- Claude via Anthropic API; default model Haiku (`claude-haiku-5-5`), escalation to Sonnet
  is a per-call option, not the default.
- Stack preference: TypeScript for the daemon (user's primary stack), Swift for the Mac app.
- Node 22, pnpm 11 are installed. `whisper-cli` and `ffmpeg` are **not** installed yet.

## 4. Approaches considered

| | Approach | Trade-off | Verdict |
|---|---|---|---|
| A | Everything in one Swift process (SwiftUI app hosts bot, SQLite, LLM calls, MCP) | Single artifact; but lives only while the app is open, thin Swift ecosystem for Telegram/MCP/agents, not the user's main stack | rejected |
| **B** | **TypeScript daemon (launchd) + Swift client** | Two processes, two languages; but 24/7 daemon independent of UI, best ecosystem for bot/MCP/LLM, user's stack | **chosen** |
| B' | B, with the daemon as a **NestJS** app (TypeORM + SQLite, BullMQ on the local Redis), Swift as a pure REST + WebSocket client | Heavier framework for a single-user daemon; but it is the user's production stack with existing module/queue/processor conventions, and BullMQ removes hand-rolled retry/delay/scheduler code | **chosen refinement of B** (user asked for their stack) |
| C | B, with Claude Agent SDK as the brainstorm runtime | Ready agent loop, can combine several MCPs; but cost/context harder to bound, overkill for v1 | deferred to iteration 3, builds on B's MCP |

Chosen by the user: B now, C later.

## 5. Architecture

```
Telegram ──long polling──▶ ┌──────────────── daemon: NestJS app (Node 22, TS, launchd) ─────────────────┐
                           │ TelegramModule ─▶ inbox_messages (raw, idempotent on update_id)             │
                           │   │ enqueue (BullMQ on local Redis)                                          │
                           │   ▼                                                                          │
                           │ InboxProcessor: voice → ffmpeg → whisper.cpp → text                         │
                           │                 router ── schema-shaped? ─▶ LM Studio :1235 (qwen, nomic)   │
                           │                        └─ free-form?     ─▶ Anthropic API (Haiku)           │
                           │   ▼                                                                          │
                           │ services (items, brainstorms, reminders, search) ─▶ TypeORM ─▶ SQLite (WAL)  │
                           │   ▲                            ▲                                             │
                           │ REST controllers + WS gateway (127.0.0.1)   RemindersQueue (delayed jobs)    │
                           └───────┬───────────────────────────┬──────────────────────────────────────────┘
                                   │ HTTP                      │ REST + WebSocket (live updates)
                     MCP stdio proxy ◀── Claude Code/Desktop   macOS app (SwiftUI, pure client)
```

**One service layer, three transports.** Telegram handlers, MCP tools and the HTTP API all
call the same TypeScript service functions. No transport talks to SQLite directly except the
Swift app's read-only path.

**The daemon owns the database, full stop.** The Swift app is a pure client: REST for
reads and writes, a WebSocket gateway for live updates (item created/updated, inbox status,
reminder fired, brainstorm message). No GRDB, no shared file access. The daemon runs on the
same Mac under launchd, so "daemon down" is a bug to fix, not a mode to design for.

### 5.1 Daemon modules (`daemon/src/`, NestJS, one module per domain per the user's nestjs skill)

- `telegram/` — grammY bot inside a Nest module, long polling, `offset` persisted in `kv` so a
  restart resumes exactly where it stopped. Allowlist: a single `TELEGRAM_OWNER_CHAT_ID`;
  anything else is ignored and logged. Writes the raw inbox row, then enqueues `inbox.process`.
- `queues/` — BullMQ on the already-running local Redis (`homebrew.mxcl.redis`). Queues:
  `inbox` (STT + classify, concurrency 1 so the 9B model is never called in parallel),
  `reminders` (delayed jobs, jobId = item id, re-scheduled on `remind_at` change),
  `claude` (brainstorm/breakdown, concurrency 1, spend cap checked in the processor).
  Retries with backoff; failed jobs surface as `inbox_messages.status='failed'`.
- `stt/` — downloads voice file, `ffmpeg -i in.ogg -ar 16000 -ac 1 out.wav`, runs
  `whisper-cli -m ggml-large-v3-turbo.bin -l uk` (language auto-detect allowed; default `uk`).
  Stores transcript on the inbox row.
- `llm/` — two clients behind one `route(purpose, input)`:
  - `local`: OpenAI-compatible `POST :1235/v1/chat/completions` with
    `response_format: { type: "json_schema" }`, Qwen thinking disabled
    (`chat_template_kwargs: { enable_thinking: false }`), temperature 0. Embeddings via
    `/v1/embeddings` with nomic.
  - `claude`: `@anthropic-ai/sdk`, model from config (Haiku default), tool-use for structured
    outputs where needed (e.g. `propose_items`).
  - Every call logged to `llm_calls` (provider, model, purpose, tokens, latency, cost, ok).
- `inbox/` — processor + state machine: `received → transcribed → classified → filed | needs_input | failed`.
- `items/`, `projects/`, `tags/`, `brainstorms/`, `reminders/`, `search/` — entity + repository +
  service + controller each, per the skill's file layout.
- `realtime/` — WebSocket gateway (`@nestjs/websockets`, ws adapter) broadcasting domain events
  to the Swift app; events come from the domain emitter, not from controllers.
- `mcp/` (separate entry `mcp.ts`) — stdio MCP server, **thin**: every tool is an HTTP call to
  the daemon's REST API; if the daemon is down the tool returns a clear error.
- REST on `127.0.0.1:<port>`, loopback only; port leased via dev-dashboard `allocate_port`.
- `maintenance/` — `@nestjs/schedule` cron: nightly `VACUUM INTO` backup, weekly review trigger
  (Haiku) if enabled, LM Studio keep-warm ping.

### 5.2 Routing rule (hard)

| Purpose | Model | Output |
|---|---|---|
| classify message type, extract title/due/project/tags/priority | local Qwen | JSON by schema + `confidence` |
| dedup / "is this the same idea as X?" | local Qwen + nomic embeddings | JSON |
| embeddings for search / related items | local nomic | vector |
| `/brainstorm <topic>`, `/breakdown <item>`, `/review week` | Claude Haiku | free text + optional `propose_items` tool call |
| anything the user explicitly prefixes with `/claude` | Claude Haiku | free text |

If the local model fails (LM Studio down, timeout) the message stays `received` with
`error`, is retried with backoff, and the user gets one Telegram notice. It is **never**
silently escalated to Claude.

### 5.3 Telegram UX (v1)

- Plain text or voice → stored, classified, filed, bot replies with a one-line confirmation
  and inline buttons: `✓ ok` · `→ idea` / `→ task` (flip type) · `📅 due…` · `🗑`.
- Low confidence (< threshold, builder picks ~0.6) on type or due date → bot asks one
  question with inline buttons; message sits in `needs_input`.
- Commands: `/today`, `/inbox`, `/ideas`, `/done <n>`, `/brainstorm <topic>`,
  `/breakdown <n>`, `/remind <n> <when>`, `/claude <text>`.
- Replies in Ukrainian; item text stored as written.

### 5.4 Brainstorm flow

`/brainstorm <topic>` → daemon pulls the top-k related items by embedding similarity → Haiku
with a system prompt describing the user's goal, the related items, and a `propose_items`
tool. Haiku's free-text answer is sent back to Telegram in chunks. If it called
`propose_items`, the bot shows them as a checklist with inline buttons; only confirmed ones
become items (`created_from_brainstorm_id` set). The whole transcript is stored in
`brainstorm_messages`. A brainstorm can be continued by replying to the bot within the
session window (builder's call on the window, suggest 2h or until `/end`).

### 5.5 MCP server (iteration 1 includes it)

Launched by Claude Code / Claude Desktop over stdio (`node daemon/dist/mcp.js`). It is a thin
adapter: every tool call is an HTTP request to the running daemon on loopback. The daemon stays
the single writer; the MCP process holds no database connection.

Tools: `list_items(filter)`, `search_items(query, k)` (semantic), `get_item(id)`,
`create_item(...)`, `update_item(id, patch)`, `next_task(owner="claude")`,
`complete_item(id, note)`, `list_brainstorms()`, `get_brainstorm(id)`, `add_note(item_id, text)`.
Resources: `tasker://today`, `tasker://inbox`.

`owner ∈ {me, claude}` and the `next_task → work → complete` contract are inherited from the
2026-09-20 spec.

### 5.6 macOS app (iteration 2)

SwiftUI, GRDB opening the same `.db` read-only (WAL), live queries for lists; all mutations via
the daemon's HTTP API. Views: Inbox, Today, Ideas (with "related" via `search_items`),
Brainstorms (read transcripts, start one), Projects. Menu-bar quick-add that posts to the HTTP
API. No business logic in Swift beyond presentation.

## 6. Data model (SQLite via TypeORM `better-sqlite3` driver, TypeORM migrations)

```sql
kv(key TEXT PK, value TEXT)                      -- telegram offset, schema flags

projects(id TEXT PK, name TEXT, slug TEXT UNIQUE, archived_at TEXT)

inbox_messages(
  id TEXT PK, tg_update_id INTEGER UNIQUE, tg_message_id INTEGER, chat_id INTEGER,
  type TEXT CHECK(type IN ('text','voice','edit')),      -- never `kind` (nestjs skill naming rule)
  edited_message_id TEXT REFERENCES inbox_messages(id),   -- for type='edit': the original capture
  text TEXT, voice_file_id TEXT, transcript TEXT,
  status TEXT CHECK(status IN ('received','transcribed','classified','filed','needs_input','failed')),
  classification_json TEXT, error TEXT,
  received_at TEXT, processed_at TEXT, item_id TEXT REFERENCES items(id))

items(
  id TEXT PK, short_id INTEGER UNIQUE NOT NULL,          -- monotonically increasing, shown as #123
  type TEXT CHECK(type IN ('task','idea','note')),       -- a reminder is any item with remind_at
  title TEXT NOT NULL, body TEXT,
  status TEXT CHECK(status IN ('inbox','todo','doing','blocked','done','archived')),
  owner TEXT CHECK(owner IN ('me','claude')) DEFAULT 'me',
  priority INTEGER,                              -- 1..3, null = unset
  project_id TEXT REFERENCES projects(id),
  due_at TEXT, remind_at TEXT, reminded_at TEXT,
  source_message_id TEXT REFERENCES inbox_messages(id),
  created_from_brainstorm_id TEXT REFERENCES brainstorms(id),
  created_at TEXT, updated_at TEXT, done_at TEXT, deleted_at TEXT)

tags(id TEXT PK, name TEXT UNIQUE)
item_tags(item_id, tag_id, PK(item_id, tag_id))

item_links(from_id, to_id, type TEXT CHECK(type IN ('related','parent','spawned_from')), PK(from_id,to_id,type))

item_embeddings(item_id TEXT PK, model TEXT, dims INTEGER, vector BLOB, updated_at TEXT)
  -- v1: brute-force cosine in TS over all rows (thousands of items is fine);
  -- switch to sqlite-vec when it hurts.

brainstorms(id TEXT PK, topic TEXT, item_id TEXT, status TEXT CHECK(status IN ('open','closed')),
            model TEXT, started_at TEXT, ended_at TEXT)
brainstorm_messages(id TEXT PK, brainstorm_id TEXT, role TEXT, content TEXT,
                    tool_calls_json TEXT, tokens_in INTEGER, tokens_out INTEGER, created_at TEXT)

llm_calls(id TEXT PK, provider TEXT, model TEXT, purpose TEXT, tokens_in INTEGER,
          tokens_out INTEGER, latency_ms INTEGER, cost_usd REAL, ok INTEGER, error TEXT, created_at TEXT)
```

Conventions: IDs are UUIDv7 (time-sortable). Timestamps ISO-8601 UTC. Soft delete via
`deleted_at`. All writes in transactions; `PRAGMA journal_mode=WAL; busy_timeout=5000`.
Database path: `~/Library/Application Support/tasker/tasker.db`. Nightly `VACUUM INTO`
backup to `.../backups/YYYY-MM-DD.db`, keep 14.

Why raw `inbox_messages` separate from `items`: catch-up and idempotency key on
`tg_update_id`, retry of failed classification, and the audit trail "what did I actually say"
when the local model misfiled something.

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| LM Studio JIT unload → 5–15 s cold start on first message | `lms load qwen/qwen3.5-9b --ttl 3600` at daemon start or set keep-alive in LM Studio; show "thinking…" chat action in Telegram |
| Qwen 9B misclassifies or hallucinates dates | strict JSON schema, temperature 0, `confidence` field, ask-on-low-confidence, flip-type buttons; raw text always kept |
| Qwen thinking template breaks structured output | `enable_thinking: false`; fall back to prompt-level `/no_think` |
| Whisper quality for Ukrainian with mixed English terms | large-v3-turbo, optional local Qwen "clean up transcript" pass (schema: `{text}`), user sees transcript in confirmation |
| Mac asleep → missed messages | long polling with persisted offset; Telegram keeps updates ~24h; optional `caffeinate`/Awake app or scheduled wake |
| Haiku spend creep | daily USD cap in config, counted from `llm_calls`; bot refuses `/brainstorm` over cap |
| Redis not running → queues dead | launchd dependency: daemon start script runs `brew services start redis` check; health endpoint reports queue state; Telegram ingest still stores raw rows even if enqueue fails (job re-enqueued on next start by scanning `status='received'`) |
| Bot token / API key leakage | `.env` outside repo (`~/Library/Application Support/tasker/.env`, 0600); single chat allowlist |

## 8. Decided (as decided in conversation)

- Hybrid routing: local for schema-shaped work, Claude Haiku for brainstorm/complex (user).
- SQLite as the store (user). Telegram bot as the primary input and launcher (user).
- Native Swift macOS app as the desk UI, Mac as the server (user).
- MCP server so Claude can later pull ideas (user).
- Daemon in TypeScript, approach B; Agent SDK deferred (user picked B, C later).
- Daemon is a **NestJS** app with TypeORM + SQLite and BullMQ on the local Redis; Swift is a pure
  REST + WebSocket client, no direct DB access (user asked for their stack; Claude agreed).
- Product and repo name: **tasker**; repo reused as the home; old spec kept as history (user).
- No web version (user).

## 9. Left to the builder

- grammY vs. raw Bot API client (grammY suggested). WS adapter (`ws` suggested, no socket.io).
- Confidence threshold, brainstorm session window, chunking of long Haiku replies.
- Prompt wording for the classifier and the brainstorm system prompt.
- whisper.cpp install path (`brew install whisper-cpp`) and model download location.
- launchd plist details (KeepAlive, log paths, `RunAtLoad`).
- Whether the MCP server runs as a separate process or the daemon also exposes MCP over
  streamable HTTP (stdio separate process is the v1 assumption).

## 10. Iterations and first steps

**Iteration 1 — daemon + Telegram + local pipeline + MCP (this is what the plan covers)**
1. Repo layout: `daemon/` (pnpm, NestJS, TypeORM, BullMQ), `mac/` (empty placeholder), keep
   `docs/`. Rewrite README for the new direction (no Next.js).
2. `brew install whisper-cpp ffmpeg`; download `ggml-large-v3-turbo`. Verify Ukrainian STT on
   a sample voice note.
3. Entities + TypeORM migrations + repositories/services/controllers for items, inbox, projects,
   tags, search; WS gateway skeleton.
4. Local LLM client: classify/extract with JSON schema against LM Studio; **golden-set check**
   on ~30 real messages (text), measured accuracy and latency. (Deviation from the nestjs
   skill's no-tests default, deliberate: the classifier is the one piece whose quality must be
   measured, not assumed. No other tests unless asked.)
5. Telegram ingest with persisted offset → `inbox` queue → STT → classify → file; confirmations
   and buttons, `/today /inbox /done`.
6. `reminders` queue (delayed jobs) → Telegram, snooze buttons, late-fire on start.
7. Claude client + `/brainstorm` + `/breakdown` with `propose_items` confirmation flow,
   spend cap.
8. MCP stdio proxy over the REST API; verify from Claude Code.
9. launchd agent, backups, `.env`, runbook in README.

**Iteration 2 — macOS app (SwiftUI + GRDB read-only + HTTP writes).**
**Iteration 3 — Claude Agent SDK brainstorm runtime using the MCP server; weekly review.**

## 11. Builder-check decisions (my calls, correctable)

1. **Single writer, for real.** The stdio MCP process proxies to the daemon HTTP API; the HTTP
   API therefore moves into iteration 1. Swift stays read-only on SQLite + HTTP for writes.
2. **`needs_input` never blocks.** Each clarifying question is sent as a reply to the user's
   original message; `callback_data` carries the `inbox_messages.id`. Incoming replies are
   routed by `reply_to_message`: reply to a brainstorm bot message → brainstorm continuation;
   reply to a clarifying question → answer; anything else → new capture.
3. **Short ids.** `items.short_id` (monotonic integer, `#123`) is what the bot shows and what
   `/done 123`, `/breakdown 123`, `/remind 123 …` take. No per-chat list state.
4. **Edits and callbacks.** Callbacks are not inbox rows (logged to the daemon log only). An
   edited Telegram message becomes an inbox row `type='edit'` pointing at the original; if the
   original item is not `done`, it is re-classified and title/body updated, the original row
   stays as audit.
5. **Time.** Classifier gets `now` and the Mac's system timezone injected per call. Date-only
   due → stored as date-only (no time). Reminders default to 09:00 local when only a date is
   given. No recurrence in v1 (non-goal).
6. **Late reminders.** A reminder whose time passed while the daemon was down fires on start
   with a "late by N h" note; never dropped. Snooze buttons: 15 m / 1 h / tomorrow 09:00.
7. **Dedup never skips.** On a similarity hit the confirmation says "схоже на #123" with a
   "link" / "merge into #123" button; nothing is auto-merged or dropped. Threshold is the
   builder's.
8. **Spend cap** covers every Claude call (`/brainstorm`, `/breakdown`, `/review`, `/claude`).
   Prices live in config (`llm.prices`), cost computed per call from tokens. When tripped the
   bot answers with the day's spend and refuses; `/claude!` forces one call past the cap.
   Default cap: **1 USD/day** (user may change, see §12).
9. **Item types.** `reminder` removed as a type; a reminder is any item with `remind_at`.
   `note` = reference, nothing to do or develop (a link, a quote, a fact). `idea` = something to
   possibly do or explore later. `task` = concrete, has a done state. Classifier schema uses
   exactly these three plus `confidence`.
10. **Golden tests.** Pass bar: ≥ 90 % type accuracy, ≥ 80 % due-date exact match where a date
    is present, p50 latency < 3 s with the model warm. Corpus source: see §12.

## 12. Open questions for the user

- Daily Claude spend cap value (default 1 USD/day).
- Golden-set corpus: ~30 real past messages from the user (preferred) or synthetic ones.
- Build on `@mia/nest-kit` (if it is consumable outside the mia monorepo) or plain NestJS
  following the nestjs skill's shapes? Default: plain NestJS, skill shapes, no kit.
