# tasker as a Mia connector — what tasker must provide

Date: 2026-11-17. Status: draft for the builder. Source of the convention: the global agent
`~/.claude/agents/ai-chat-developer.md` («Connectors», «Connector convention», «Connector mini app»); the hub side is
`~/projects/mia-assistant` (spec `docs/superpowers/specs/2026-11-15-assistant-hub-design.md`, §5.8 connectors).

## 1. Why and scope

Mia (the hub assistant) recognizes a message or a voice note, routes it to a connector and proposes intents
(«Задачі · 1» in the Mac app). tasker is the **first connector** Mia talks to for real. tasker has no UI of its own;
its **first and for now only UI is a mini app for Mia** — a page Mia opens in a WebView to review, edit and save the
drafts it recognized. A full tasker web UI is out of scope.

What tasker adds to its 2026-11-15 design (`personal-tasker-design.md`):
1. MCP over **streamable HTTP** with API-key auth (next to the existing stdio entry for Claude Code).
2. Tool metadata Mia routes and fills by (`inputSchema`, `annotations`, `_meta`).
3. **Dry run** that validates, returns a `preview` and stores a **draft**.
4. Structured errors.
5. The **mini app** (`/assistant/app`) with signed `initData` and the host bridge.
6. A notification to Mia when a draft is saved or discarded.

The single-service-layer rule stays: MCP tools, the mini app's REST and Telegram all call the same services.

## 2. Transport and auth

- `POST /mcp` on the daemon — MCP streamable HTTP. The stdio entry (`mcp.ts`) stays for Claude Code.
- **API keys** are created in tasker: `POST /api-keys { name }` → the key shown once (`tsk_…`), stored hashed
  (sha256) with `id, name, created_at, last_used_at, revoked_at`; `DELETE /api-keys/:id` revokes. Until there is a UI,
  a CLI `pnpm tasker api-key create <name>` is enough. Mia stores the key as its connector profile secret.
- Every MCP request: `Authorization: Bearer tsk_…`. A missing / revoked key → 401.
- Request `_meta` from Mia on every `tools/call`: `locale` (`uk-UA`), `timeZone` (IANA, e.g. `Europe/Kyiv`), `dryRun`,
  `batchId`, `draftId`. Dates without an offset are read in that `timeZone`.
- `serverInfo: { name: 'tasker', version }`.
- Bind: loopback by default (Mia and tasker run on the same Mac); a LAN bind is a config flag, never the default.

## 3. Tools

Names are `snake_case`, without a `tasker__` prefix (the hub adds its own). Each tool:
- `description` — one line; `inputSchema` — JSON Schema with `additionalProperties: false`, a `description` on
  every field, enums for closed sets, `format: date-time` for dates (ISO-8601 with offset), UUIDs as `format: uuid`.
- `annotations`: `readOnlyHint` / `destructiveHint` (`idempotentHint` where true).
- `_meta`: `actions`, `keywords` (uk + en), `lookup` on reference fields, `ui.app` on write tools.

| Tool | `_meta.actions` | annotations | Reference fields → `_meta.lookup` |
| --- | --- | --- | --- |
| `create_item` | `create` | — | `project_id` → `find_projects`, `tag_ids[]` → `find_tags` |
| `update_item` | `update` | — | `id` → `find_items`, `project_id` → `find_projects` |
| `complete_item` | `update` | `idempotentHint` | `id` → `find_items` |
| `add_note` | `update` | — | `item_id` → `find_items` |
| `list_items`, `get_item`, `search_items` | `read` | `readOnlyHint` | — |
| `find_projects`, `find_tags`, `find_items` (new) | `read` | `readOnlyHint` | — |
| `next_task` | `read` | `readOnlyHint` | — |
| `delete_item` (if exposed) | `delete` | `destructiveHint` | `id` → `find_items` |

- **Lookup tools** take `{ query: string, limit?: number }` (an empty query lists) and answer
  `structuredContent: { results: [{ id, label, path? }] }` — Mia reads exactly `structuredContent.results`; a bare
  array is ignored. A project's `label` is its name; an item's label is `#<short_id> <title>`. `_meta.lookupArg:
  'query'`. `find_items` matches by `#123` / short id and title words (plain text match, fast); `search_items` stays
  the semantic read tool and is not a lookup.
- `create_item` input (from the data model): `type` (`task | idea | note`), `title` (required), `body?`,
  `status?` (`inbox | todo | doing | blocked | done`), `owner?` (`me | claude`), `priority?` (1–3), `project_id?`,
  `tag_ids?`, `due_at?`, `remind_at?`. `title` and `body` stay as the user said them.
- Keywords examples: `create_item` — «задача», «ідея», «нагадай», «запиши», «todo», «remind».
- A breaking change to a tool's input is a new tool name or a `_meta.schemaVersion` bump, never silent; tasker sends
  `notifications/tools/list_changed` after a change.

## 4. Dry run, preview, drafts

`tools/call` with `_meta: { dryRun: true, batchId?: string }` on any write tool:
- validates fully (schema + semantic: the project exists, `remind_at` is in the future, the item is not deleted),
- changes nothing in `items`,
- **stores a draft** and answers in `structuredContent` (Mia reads `valid` / `errors` / `preview` there; `draftId` /
  `batchId` are extra fields Mia keeps on the intent):

```json
{ "valid": true, "draftId": "…", "batchId": "…", "errors": [],
  "preview": { "refs": { "project_id": { "id": "…", "label": "Mia", "path": "Projects / Mia" } },
               "computed": { "due": "завтра, 10:00" }, "warnings": ["Є схожа задача #41"] } }
```

- invalid → `isError: true`, `structuredContent: { valid: false, errors: [{ path, code, message, expected?, options? }] }`
  — codes general → specific (`invalid:item:remind-at-past`, `not-found:project`); `options` for a lookup field with
  several matches. `message` in the request's locale (`_meta.locale`, default `uk`).
- Drafts: `drafts(id, batch_id, tool, dto_json, preview_json, status draft|saved|discarded, item_id, api_key_id,
  created_at, expires_at)`; TTL 24 h, swept by the maintenance cron. One Mia message = one `batchId` (Mia sends it;
  tasker creates one if absent).
- The real call (`tools/call` without `dryRun`, or with `_meta.draftId`) **validates again** and executes; with a
  `draftId` it marks the draft `saved` and links `item_id`.
- A similar-item warning uses the existing embeddings (`search_items`), not a new model call.

## 5. Mini app (`/assistant/app`)

tasker's only UI for now — a light UI of tasker itself (a route / layout of tasker's own app, e.g. Vite + React
built into `daemon/public/app`), which may have its own header and navigation inside. tasker's team writes it; Mia only
hosts it (opens it, signs who opened it, relays events, proxies model calls).

- **Declared** on write tools: `_meta.ui.app: 'http://127.0.0.1:<port>/assistant/app'` (Mia checks the origin
  against the connector's registered URL).
- **Opened** by Mia as `…/assistant/app#initData=<base64url(payload)>.<base64url(sig)>`:
  `payload = { user, profile, batchId, draftIds, locale, theme, exp, nonce }`, `exp` ≈ now + 5 min,
  `sig = HMAC-SHA256(key = HMAC-SHA256('webapp', apiKey), payload)`.
- **Verification** (tasker backend, `POST /assistant/app/session { initData }`): find the API key whose derived key
  verifies the signature (tasker keeps per key a derived `webapp_secret`, computed at creation — the plain key is
  never stored), check `exp`, check the `nonce` was not used (kv, TTL = exp) → set an httpOnly session cookie scoped
  to that key. The API key never reaches the page; the `#` fragment keeps `initData` out of server logs.
- **Screens:** the batch — a list of the batch's drafts (type icon, title, project, due, warnings); a draft — the edit
  form from the tool's input (type, title, body, status, owner, priority, project picker and tag picker over the
  lookup tools, due / remind pickers); actions «Зберегти» / «Відхилити» per draft and «Зберегти всі» (only valid
  drafts). Saving goes through the same services as the MCP call, with the same validation.
- **Host bridge** — a thin adapter `host.ts` that detects the host and exposes one API:
  - Mia: `window.Mia.WebApp` (injected by the Mac app; named like `window.Telegram.WebApp`): `initData`, `ready()`,
    `expand()`, `close()`, `themeParams`, `onEvent('themeChanged' | 'mainButtonClicked' | 'backButtonClicked' |
    'draft.updated')`, `MainButton` (`setText`, `show`, `hide`, `showProgress`, `enable`, `onClick`), `BackButton`,
    `showConfirm`, `showAlert`, `sendResult({ draftId, status, id? })`, `ai.complete({ messages, system?, schema?,
    maxTokens?, purpose })` (a model call through Mia — the page and tasker never call a model provider themselves).
    Message shapes: Mia's contract `connector-apps.ts` (`MiaWebAppBridgeRequest` / `Response` / `Event`).
  - Telegram: `window.Telegram.WebApp` — the same calls (tasker is Telegram-first, so the bot can open the same app as
    a Mini App; its `initData` is verified by Telegram's own rule with the bot token).
  - Plain browser: no-ops + a «Saved» toast.
  The page uses `MainButton` for «Зберегти всі», follows `themeParams` (Mia's light / dark), calls `ready()` after the
  first render and `sendResult` after each save / discard.
- **Not in the page:** no Mia tokens, no direct calls to Mia (only through the bridge), no other connector's data.
- **Model calls from tasker's backend** go to Mia too: `POST <hub>/connectors/llm/complete { messages, system?, schema?,
  maxTokens?, purpose }` signed like the webhook (§6) with the label `llm`; Mia picks the model, counts the use under
  `tasker` and enforces tasker's daily caps (429 `LIMIT_REACHED`).

## 6. Telling Mia

On every draft status change (saved / discarded / expired):
- MCP `notifications/resources/updated` for `tasker://drafts/<batchId>` on Mia's session, and
- a webhook `POST <hub>/connectors/events` with `{ connector: 'tasker', type: 'draft.updated', draftId, batchId,
  status, itemId?, label? }` (Mia's API takes no path params; the slug is in the body and in `X-Connector: tasker`),
  with `X-Connector-Timestamp: <unix seconds>` and `X-Connector-Signature` (or `X-Tasker-Signature`) = hex
  `HMAC-SHA256(key: HMAC-SHA256(key: 'webhook', apiKey), message: '<timestamp>.<raw body>')`; Mia accepts ± 5 min and
  answers a repeated signature with `{ duplicate: true }`; retried with backoff (a new timestamp, a new signature).
- MCP: tasker declares `resources: { subscribe: true }`; Mia subscribes to `tasker://drafts/<batchId>` after a dry run
  that returned a `batchId` (and again on every new session).
Mia treats these as the truth; `sendResult` from the page only makes the card update instant.

## 7. Resources

- `tasker://context` — 3–5 lines for routing: what tasker is, item types, its vocabulary.
- `tasker://drafts/<batchId>` — the batch's drafts (status, preview), for the hub to re-read after a notification.
- Existing `tasker://today`, `tasker://inbox` stay.

## 8. Later (not now)

- A declarative card template (`_meta.ui.card: 'ui://tasker/cards/item'`) in Mia's block catalog.
- The same mini app as an MCP Apps `ui://` resource (step 2, after the WebView works).
- `_meta.undoTool` (`restore_item`) on write tools.

## 9. Done when (tested with Mia)

1. Mia lists tasker's tools over HTTP MCP with an API key created in tasker; a revoked key gets 401.
2. «нагадай завтра о 10 подзвонити Олі в проєкті Mia» → Mia fills `create_item` from the schema, `project_id` resolved
   through `find_projects`, dry run returns a draft with a preview; the card in Mia shows «Mia» and «завтра, 10:00».
3. A wrong value (a past `remind_at`) comes back as a structured error, Mia's model fixes it or asks.
4. «Відкрити в tasker» opens the mini app in Mia's WebView, signed in through `initData` (a replayed or expired link is
   refused); edit + «Зберегти всі» saves; the cards in Mia turn «Записано» from the notification.
5. The same mini app opens from the tasker Telegram bot as a Mini App.

## 9a. Aligned with Mia's hub (2026-11-17)

Checked against `mia-assistant` (`connectors/services/mcp-connectors`, spec §5.8b–c): lookups answer
`structuredContent.results`; dry-run answers in `structuredContent`; the webhook route has no path params; `_meta`
carries `locale` / `timeZone`; `find_items` is the item lookup (`search_items` stays semantic). On Mia's side the
static `tasker` schemas (`config/tools/tasker.json`) are retired once this MCP server is registered under slug
`tasker`, and Mia adds `batchId` to dry runs, `initData` signing, the events webhook and the WebView.

Hub side built in Mia on 2026-11-17 (spec §5.8e) and tested against Mia's reference connector: `initData` signing and
verification (replay, expiry, tampering refused), the signed `draft.updated` webhook (replay → duplicate), the drafts
resource path, the model proxy with per-connector caps. The bridge is `window.Mia.WebApp` (renamed from `MiaWebApp`).

## 10. Open questions for the user

- The mini app's stack: Vite + React served by the daemon (proposed) vs. a separate Next.js app.
- Does Mia's hub run on the same Mac as tasker always (loopback is enough), or should the LAN bind be planned now?
