# Assistant + domain services — central voice/text entry, domains own their data

> Status: draft for review · Date: 2026-11-15 · Author: vitalii + Claude
> Supersedes `2026-11-15-personal-tasker-design.md` (same day) and the direction of
> `docs/specs/2026-09-20-central-task-tracker-design.md`. Diagram: `docs/diagrams/tasker-architecture.html`.

## 1. Intent and why

Vitalii wants one **assistant** he can talk to (text now, voice later) that understands what he
said and acts in the right **domain service**: **tasker** (tasks, ideas, notes, brainstorms) first,
**fintrack** (his existing finance tracker with its own AI assistant) second. The assistant has
**three entries of its own**: Telegram (supergroup with topics), the Mac app (SwiftUI, later) and
**Claude Code as an agent over the assistant's MCP** ("here is a task, put it where it belongs":
a task goes to tasker, a transaction to fintrack). Each domain's own UI is a fourth kind of entry:
the domain calls the assistant with its identity, so no routing is needed there.

Recognition is provider-agnostic: the **Mac worker** (LM Studio, local, free) is primary when the
Mac is awake, **Claude** (Haiku) is the fallback, Sonnet for brainstorms. The assistant keeps no
database: Redis holds the session; everything it stores (items, brainstorms, notes) goes into
tasker through tasker's MCP. Claude Code reads tasks from that same tasker MCP.

Why this shape: the user already has two domains and will add more. Each domain stays a normal
service with its own DB and UI; the assistant is the shared brain and the shared mouth, not a
store. fintrack's adapter replaces its direct Claude calls with calls to the assistant, so one
provider choice and one spend cap cover every domain.

## 2. Goals, non-goals, anti-goals

**Goals**
- Capture by text in Telegram (voice in iteration 2); raw update kept before anything happens.
- Assistant entries (Telegram, Mac app, Claude Code via the assistant MCP): the model picks the
  domain and tool among all registered tools; topic is a strong hint. Domain entries (fintrack
  UI, tasker UI): domain known, the structured result returns to the caller.
- (Later feature, not a stage) Claude Code may also open tasker's or fintrack's MCP directly.
- Provider choice inside the assistant: Mac worker primary, Claude fallback, Sonnet for brainstorm.
- Assistant stateless except a Redis session; all persistent data lives in domain services.
- tasker as the first domain service: own PostgreSQL, REST for its UI, MCP server for the
  assistant and for Claude Code; stores items and brainstorms.
- Domain contract symmetric for tasker and fintrack: expose MCP tools; call the assistant to
  recognize; receive notifications to forward.
- Reminders delivered through Telegram via the assistant.

**Non-goals (v1)**
- Voice notes (iteration 2). fintrack adapter (iteration 2). Assistant SwiftUI app (iteration 3).
- Web UI (later, separate). Multi-user. Recurring reminders.

**Anti-goals**
- Losing or silently misfiling a message: raw update stored; every write confirms with undo.
- A chatty assistant: act when confident, ask one question only when domain or a key field is
  genuinely unclear.
- Spending without a ceiling: 1 USD/day, visible.
- Assistant growing its own data model: if something needs persistence, it is a domain service.

## 3. Constraints

- Hosting: Railway (user): assistant service, tasker service, Postgres (tasker), Redis (shared).
- Stack: NestJS + TypeORM + Postgres (tasker), BullMQ/Redis, per the user's `nestjs` skill
  (module/entity/repository/service/controller/queue/processor layout; `type` never `kind`; no
  tests unless asked).
- Models: Anthropic API, Haiku `claude-haiku-5-5` fallback/default cloud, Sonnet
  `claude-sonnet-5-5` for brainstorm and `/think`. Local: LM Studio on the Mac, `qwen/qwen3.5-9b`
  (port 1235), JSON-schema output, thinking off; whisper.cpp from iteration 2.
- Mac: M4, 24 GB; `whisper-cli` and `ffmpeg` not installed yet; Redis reached over TLS.
- Telegram Bot API: no access to Telegram's own transcription; bot must be group admin.
- fintrack exists; it will get an adapter (its side) in iteration 2.

## 4. Approaches considered

| | Approach | Trade-off | Verdict |
|---|---|---|---|
| A | Standalone tasker bot on the Mac, local classifier, SQLite | private, free; offline when Mac sleeps; rewrite on second domain | superseded |
| B | Hub with an in-hub classifier step and deterministic dispatch; hub owns a DB | predictable; every domain edits hub schema/prompts; hub becomes a store | rejected |
| C | Hub with Claude tool use as the loop; domains as in-process modules; hub DB | one call routes + extracts; but hub owns data and Claude is the only brain | superseded |
| **D** | **Assistant as gateway + MCP client; domains as separate services with their own DB/UI and MCP servers; providers interchangeable (Mac first, Claude fallback); assistant state = Redis session** | two services from day one, bidirectional contract to maintain; but domains stay normal apps, fintrack reuses its own assistant path, local-first and cheap, Claude Code uses tasker MCP directly | **chosen** |

Chosen by the user ("кожен домен має свій флоу", "асистент стане центральним входом", "брейншторм лежить у таскері, асистент через tasker mcp записує").

## 5. Architecture

```
            ┌─ Anthropic API (Haiku fallback, Sonnet brainstorm) ─┐   ┌─ Mac: apps/mac-worker ─┐
            │                                                     │   │ LM Studio recognize v1  │
            └──────────────▲──────────────────────────────────────┘   │ whisper stt it2         │
                           │ fallback                                 └───────────▲────────────┘
Vitalii ─▶ Telegram ──▶ ┌──┴──────────── assistant (NestJS, Railway, no DB) ────────┴──────────┐
   (topics)             │ TelegramModule · SessionModule (Redis) · ProviderModule (Mac/Claude)   │
Vitalii ─▶ Swift (it3) ▶│ RecognizeModule (one API for every entry) · DomainsModule (MCP client) │
                        │ NotificationsModule · SpendGuard · BullMQ (inbox, inference, claude)   │
                        └───────┬──────────────────────────────┬───────────────────────────────┘
               MCP tools ◀──────┘ recognize ▶     MCP (it2) ◀──┘ recognize (it2) ▶
          ┌─────────────────────────┐             ┌──────────────────────────┐
          │ tasker (NestJS, Railway)│◀─ MCP ── Claude Code   │ fintrack (existing)      │
          │ Postgres · REST · MCP   │             │ own DB · UI · adapter    │
          │ tasker UI (own client)  │             └──────────────────────────┘
          └─────────────────────────┘
```

### 5.1 Assistant API (the one contract every entry uses)

`POST /recognize` (bearer per client):

```ts
{ client: 'telegram' | 'swift' | 'claude-code' | 'tasker' | 'fintrack',
  session: { chatId?, threadId?, userId },          // where to keep context and where to reply
  domain?: 'tasker' | 'fintrack',                    // set by domain entries; absent from assistant entries
  text: string, topicHint?: string,
  tools?: ToolSchema[],                              // domain entries may pass their own; else assistant uses registered tools
  mode?: 'recognize' | 'brainstorm' | 'think' }
→ { intents: [{ domain, tool, args, confidence }], reply?, ask?: { question, options[] },
    executed?: [{ tool, result, undoable }], provider: 'mac' | 'claude', spendUsd }
```

- **Assistant entry** (Telegram, Swift, Claude Code via assistant MCP): no `domain`; the assistant recognizes against *all*
  registered tools, **executes** them through the domain's MCP, and returns/sends the domain's
  result with undo buttons.
- **Domain entry** (fintrack UI, tasker UI): `domain` set, optional `tools`; the assistant
  recognizes and **returns** the structured intents to the caller, which executes them itself.
  Execution on behalf of the caller is possible (`execute: true`) but not the default.

### 5.2 Provider choice (`ProviderModule`)

1. Mac worker heartbeat (`worker:heartbeat:mac`, TTL 30 s) fresh → enqueue `inference.recognize`
   with the tool schemas and context; wait up to 20 s.
2. Otherwise, on timeout, or when `confidence` < threshold → Anthropic Haiku with the same tools
   (`tool_choice: auto`); tool calls map to intents; `ask_user` and `escalate` hub tools exist
   only here.
3. `mode: brainstorm | think` → Sonnet directly, tool use, thread kept in the Redis session and
   saved to tasker (`tasker__save_brainstorm`) when the thread closes.
4. Every paid call increments `spend:{owner}:{day}`; cap 1 USD/day in the owner's timezone; over
   cap: message kept in the session, job delayed to the next day, `/think!` forces one call.

Both providers return the same `RecognitionResult`; the local provider gets a JSON schema
generated from the tool list; Claude gets the tools natively.

### 5.3 Domain contract (`libs/domain-contract`)

A domain service:
- **exposes** an MCP server (streamable HTTP + bearer) with tools (`tasker__create_item`, ...),
  each write tool declaring `undoable` and its `undo` tool, and a `context` resource (short text
  for prompts, e.g. "today: 3 due, 1 overdue");
- **calls** `POST /recognize` on the assistant from its own UI path with `domain` set;
- **notifies** the assistant (`POST /notifications`, signed) for reminders/digests, which the
  assistant posts into the domain's Telegram topic.

The assistant's `DomainsModule` registers domains from config (`{ name, mcpUrl, token }`), lists
their tools at startup and on `/reload`, and keeps a snapshot in Redis.

### 5.3a Assistant MCP server (Claude Code entry)

`McpServerModule` on the assistant (streamable HTTP + bearer) exposes: `assistant__recognize`
(same semantics as `POST /recognize`, executes by default), `assistant__brainstorm`,
`assistant__spend`, `assistant__undo_last`, plus a resource `assistant://today`. Claude Code uses
it to hand over anything without choosing a domain; for service-specific work it connects to
that service's MCP directly.

### 5.4 Telegram (assistant entry)

Private supergroup with Topics, bot as admin; private chat as fallback. Topics: `Inbox`
(General), one per domain (`Tasks`, `Ideas`, `Finance` when fintrack joins), one per brainstorm
(created/closed by the bot), `Log`. Webhook with `secret_token`; `tg:update:{id}` idempotency;
200 at once, job enqueued; typing indicator in the thread. `message_thread_id` → session key, so
context is per topic. Replies always text. Write confirmations carry **↶ undo** / **✎ fix**
buttons; `ask` renders inline buttons and parks the turn in the session for 24 h. Pinned live
"today" message in `Tasks` edited in place after each tasker write. Commands are sugar:
`/today`, `/inbox`, `/ideas`, `/brainstorm <topic>`, `/spend`, `/undo`, `/think <text>`, `/end`.
Voice notes in v1: "голосові поки не підтримую".

### 5.5 tasker service (first domain)

Own NestJS app on Railway with PostgreSQL. REST for its UI; MCP server used by the assistant and
by Claude Code. Tools: `tasker__create_item`, `update_item`, `complete_item`, `list_items`,
`search_items`, `get_item`, `link_items`, `save_brainstorm`, `next_task`, `undo_*`. Item types
`task | idea | note`; a reminder is any item with `remind_at`. Statuses
`inbox | todo | doing | blocked | done | archived`; `owner ∈ {me, claude}`; `next_task` returns
the oldest `todo` with `owner='claude'`, sets `doing`, re-offers after 24 h idle. Reminders are
BullMQ delayed jobs in tasker posting to the assistant's notification webhook.

### 5.6 Mac worker (`apps/mac-worker`)

Node process under launchd, BullMQ consumer on `inference` over Railway Redis (TLS + password),
no DB, no business logic. Jobs: `recognize` (v1: LM Studio with the shipped JSON schema,
`enable_thinking: false`, temperature 0, model kept warm), `stt` (it2: ffmpeg → whisper.cpp
`large-v3-turbo`), `embed` (later: nomic). Heartbeat every 10 s.

## 6. Data

**Assistant: Redis only**

```
session:{client}:{chatId}:{threadId}  { turns[≤10], openQuestion?, lastActions[≤20], updatedAt }   TTL 30 d
session:brainstorm:{id}               { topic, model, messages[] }                                 TTL 30 d
spend:{owner}:{YYYY-MM-DD}            USD counter                                                  TTL 3 d
worker:heartbeat:mac                  "1"                                                          TTL 30 s
tg:update:{updateId}                  "1"                                                          TTL 2 d
domain:{name}                         { mcpUrl, toolsSnapshot, lastSeenAt }
```
Owner profile (chat ids, timezone, cap) is config. Audit beyond `lastActions` is stdout logging.

**tasker: PostgreSQL (TypeORM migrations)**

```sql
projects(id uuid pk, name text, slug text unique, archived_at timestamptz)
items(id uuid pk, short_id int unique default nextval('items_short_id_seq'),   -- #123, never reused
      type text check (type in ('task','idea','note')),
      title text not null, body text,
      status text check (status in ('inbox','todo','doing','blocked','done','archived')),
      owner text check (owner in ('me','claude')) default 'me',
      priority smallint, project_id uuid references projects,
      due_at timestamptz, due_date date,              -- date-only dues keep no time
      remind_at timestamptz, reminded_at timestamptz,
      source jsonb,                                   -- {client, chatId, threadId, messageId}
      created_from_brainstorm_id uuid,
      created_at, updated_at, done_at, deleted_at timestamptz)
tags(id uuid pk, name text unique)
item_tags(item_id, tag_id, pk(item_id, tag_id))
item_links(from_id, to_id, type text check (type in ('related','parent','spawned_from')), pk(from_id,to_id,type))
brainstorms(id uuid pk, topic text, item_id uuid, model text, transcript jsonb, started_at, ended_at timestamptz)
item_embeddings(item_id uuid pk, model text, embedding vector(768), updated_at timestamptz)  -- later
```
Conventions: UUIDv7, `timestamptz` UTC, soft delete, `type` never `kind`, `DbTx.run` for
multi-row writes, no I/O inside a transaction.

**fintrack:** its own app and DB, untouched; adapter added in iteration 2.

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Local 9B misroutes or invents fields | JSON schema, temperature 0, `confidence`; below threshold → Claude; writes confirm with undo; golden set per provider |
| Mac asleep | heartbeat → Claude fallback for text; voice (it2) waits with retries unless a cloud STT key is set |
| Redis exposed for the worker | Railway TCP proxy, TLS + strong password, worker is the only external client |
| Multi-intent message partly handled | several intents per result; reply lists everything done; partial success reported |
| Spend creep | Redis daily counter, cap 1 USD, `/spend`; brainstorm/Sonnet counted |
| Prompt injection via forwarded text | tool args validated by the domain; destructive tools need a button; MCP callers token-gated |
| Telegram webhook retries | `tg:update` idempotency key; job id = update id |
| Two services + worker to deploy | monorepo, one Railway project, health endpoints, `/reload` for domains |

## 8. Decided (as decided in conversation)

- Assistant is the central entry for voice/text with three entries: Telegram, Mac app, Claude
  Code over the assistant's own MCP; domains keep their own service, DB and UI and talk to the
  assistant both ways; the assistant discovers their tools via MCP `list_tools` (user).
- Direct MCP from Claude Code to tasker/fintrack is a later feature, not part of the stages (user).
- Recognition: Mac worker primary when awake, Claude fallback; Sonnet for brainstorm (user).
- tasker is a plain task server with its own DB; brainstorms live there; the assistant writes
  everything through tasker MCP; Claude Code reads from the same MCP (user).
- Assistant has no DB, only Redis session (user).
- Railway; NestJS + TypeORM + Redis/BullMQ; Swift app later as pure client; no web UI now (user).
- Telegram supergroup with forum topics, bot as admin (user).
- Text only first; voice later (user). Daily cap 1 USD (user).
- Stage order: (1) Mac UI + assistant + Mac worker, local-only recognition incl. whisper, no Claude;
  (2) Telegram admin bot as a new channel (+ Claude fallback, tasker service); (3) MCP for agents + vectorization (user).
- Monorepo in `~/projects/tasker` (user).

Claude's calls, correctable: Postgres for tasker; webhook over polling; local low confidence
falls back to Claude rather than asking the user; two Railway services from day one; `recognize`
returns intents to domain entries instead of executing by default.

## 9. Left to the builder

- grammY vs raw Bot API; MCP libraries (`@modelcontextprotocol/sdk` behind Nest controllers);
  `ws` for WS.
- Prompt wording, JSON-schema generation from tool lists, confidence threshold, context budget.
- Undo semantics per tool; which tools get quick-action buttons.
- Railway service layout, env naming, health paths; launchd plist for the worker.
- Internal module layout of `apps/assistant` and `apps/tasker` per the nestjs skill.

## 9a. Repository layout

```
tasker/
├── apps/assistant/       # NestJS: Telegram, session, providers, recognize API, MCP client, notifications
├── apps/tasker/          # NestJS: Postgres, REST, MCP server, reminders
├── apps/mac-worker/      # Node BullMQ consumer: LM Studio recognize (v1), whisper stt (it2)
├── apps/mac/             # Xcode project, SwiftUI assistant app (it3); not a pnpm package
├── libs/domain-contract/ # ToolSchema, RecognitionResult, notification payload
├── docs/
├── pnpm-workspace.yaml   # apps/assistant, apps/tasker, apps/mac-worker, libs/*
└── README.md
```

## 10. Stages (user's order, 2026-11-15 15:38)

**Stage 1 — local-only recognition on the Mac: `apps/mac` + `apps/assistant` + `apps/mac-worker`.**
Goal: type or dictate something in the Mac app and see *what it is and where it should go*
("task → `tasker__create_item {title, due_date}`", "transaction → `fintrack__add_transaction
{amount, currency, category}`"). Nothing is executed, nothing is stored beyond the Redis session.
- **No Claude in this stage** (user, 15:56). The provider interface exists; only the local
  provider is implemented. Worker stale → `503`, no fallback.
- `apps/assistant` runs locally (NestJS, `localhost`), Redis from Homebrew; no Railway yet.
- Tools come from a **static registry** in config (tasker + fintrack tool schemas as JSON);
  `DomainsModule` later replaces it with MCP `list_tools`.
- Local recognition: LM Studio `qwen/qwen3.5-9b`, structured output (JSON schema generated from
  the tool list), thinking off, temperature 0.
- **Voice in stage 1**: whisper.cpp `large-v3-turbo` on the Mac worker (`stt` job); the app
  records or picks audio, the assistant transcribes through the worker, the transcript is shown
  (editable) and then recognized.
- `apps/mac`: SwiftUI, text field + record button, calls `POST /transcribe` and
  `POST /recognize`, shows intents with confidence, latency and raw JSON; "wrong" button records
  a correction locally (feeds the golden set).
- Golden set: ~30 synthetic messages against the local model; measured accuracy and latency.
- Done when: text and voice typed/dictated in the app return domain/tool/fields for the golden
  set with a measured accuracy (target ≥ 80 % intents on the local model) and p50 < 3 s warm.

**Stage 2 — Telegram channel + execution + Claude fallback.** Claude Haiku provider with the spend cap; bot as admin of the supergroup with topics, webhook,
same `/recognize`; `apps/tasker` service (Postgres, REST, MCP) so intents can be executed and
tasks stored; confirmations with undo; reminders. Railway deploy of assistant + tasker.

**Stage 3 — MCP for agents + vectorization.** Assistant MCP server (`assistant__recognize`,
`brainstorm`, `spend`, `undo_last`); Claude Code connected to the assistant;
embeddings via the Mac worker (nomic) and `search_items`; brainstorm threads saved to tasker.

**Later:** voice on the Mac worker (whisper.cpp), fintrack adapter, direct Claude Code → tasker/fintrack MCP, morning digest, web client.

## 11. Builder-check decisions (Claude's calls, correctable)

1. One owner, two Telegram surfaces (group + private chat); General topic has no thread id →
   `inbox` session. Notifications go to the domain topic, else private chat.
2. Assistant entries always get the full registered tool set (prompt-cacheable); topic is a hint
   in the user turn, not a filter.
3. Undo per tool, declared; `✎ fix` auto-undoes the turn's undoable writes from `lastActions`,
   lists the rest, re-runs. Turns are not transactional across tools.
4. Reminders fire into the domain topic; date-only due → no reminder unless set; default 09:00
   owner time; sweep every 5 min for missed ones, marked "late". No recurrence in v1.
5. MCP callers (Claude Code) are the owner; writes not confirmed, logged, undoable via undo tools.
6. `next_task` contract as in §5.5.
7. Spend cap covers every paid call; day = owner timezone; over cap: store, delay to next day.
8. Tool names use `__` as namespace separator (Anthropic allows `^[a-zA-Z0-9_-]{1,64}$`).
9. `short_id` is a Postgres sequence, never reused.
10. Edited Telegram messages within 10 min with undoable writes → auto-undo + re-run; otherwise
    appended as a new message marked "(edited earlier message)".

## 12. Open questions for the user

(none; awaiting approval of this document)
