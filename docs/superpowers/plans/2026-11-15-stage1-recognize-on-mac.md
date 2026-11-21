# Stage 1 — Local-only recognition on the Mac — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Type or dictate a message in a macOS app and see *what it is and where it should go* (domain, tool, fields, confidence, latency), recognized entirely on the Mac: whisper.cpp for speech, LM Studio for structured recognition. No cloud, nothing executed or stored.

**Architecture:** Three processes on the Mac: `apps/assistant` (NestJS, `POST /transcribe`, `POST /recognize`, static tool registry, Redis session, local provider over BullMQ), `apps/mac-worker` (Node BullMQ consumer on the `inference` queue: `stt` via whisper.cpp, `recognize` via LM Studio structured output), `apps/mac` (SwiftUI client with text field and record button). Redis from Homebrew. No Telegram, no Railway, no Claude, no tasker service yet.

**Tech Stack:** Node 22, pnpm 11, TypeScript 5, NestJS 10 (`@nestjs/core ^10.4`, `@nestjs/config`, `@nestjs/platform-express` multipart via `multer`), `ioredis ^5.4`, `bullmq ^5.66`, `zod`, `execa`, LM Studio 0.4 on `http://localhost:1235` with `qwen/qwen3.5-9b`, whisper.cpp (`brew install whisper-cpp`) with `ggml-large-v3-turbo-q8_0.bin`, `ffmpeg`, Swift 5 / SwiftUI (macOS 14+), AVFoundation for recording, XcodeGen for the project file.

**Spec:** `docs/superpowers/specs/2026-11-15-assistant-hub-design.md` (§5.1 API, §5.2 providers, §5.6 worker, §6 Redis keys, §10 Stage 1).

## Global Constraints

- Follow the user's `nestjs` skill: one module per domain folder (`<domain>.module.ts`, `.controller.ts`, `.service.ts`, `dto/`, `helpers/`, `types/`), `type` never `kind`, no Nest built-in exceptions thrown directly, **no unit/e2e tests for NestJS code** (the golden set in Task 9 is the one deliberate exception).
- Tool names match `^[a-zA-Z0-9_-]{1,64}$`; namespace separator is `__` (`tasker__create_item`).
- Local model `qwen/qwen3.5-9b` via LM Studio OpenAI-compatible API on port **1235**, `temperature: 0`, thinking disabled. STT model `ggml-large-v3-turbo-q8_0.bin`, language `uk`.
- No Claude / no paid calls in this stage. The `RecognitionProvider` interface exists so a cloud provider can be added in stage 2 without touching callers.
- Redis keys exactly as spec §6: `session:{client}:{chatId}:{threadId}` (TTL 30 d), `worker:heartbeat:mac` (TTL 30 s).
- `RecognitionResult` is the only shape the provider returns (Task 1).
- Config in `~/Library/Application Support/tasker/.env` (mode 0600); `.env.example` committed. Audio temp files under `~/Library/Application Support/tasker/tmp/`, deleted after each job.
- Commit after every task with the attribution line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. Empty or whitespace-only `text` → `400` with field error, no job enqueued (Task 6, step 4).
2. `text` longer than 2000 chars → `400`, no job enqueued (Task 6, step 4).
3. Worker heartbeat stale (worker down) → `/recognize` and `/transcribe` return `503 WORKER_UNAVAILABLE` immediately, no job left in the queue (Task 6 step 5, Task 7 step 5).
4. Worker up but LM Studio unreachable / model unloaded → job fails → `502 PROVIDER_ERROR` with the worker's error text within `LOCAL_TIMEOUT_MS` (Task 6, step 6).
5. Audio that is not valid (empty file, wrong format) → ffmpeg fails → `422 AUDIO_INVALID`; audio longer than 5 minutes → `413 AUDIO_TOO_LONG` before transcription (Task 7, step 6).

---

### Task 1: Monorepo scaffold + `@tasker/domain-contract`

**Files:**
- Create: `package.json` (root, `private`, `packageManager: pnpm@11`), `pnpm-workspace.yaml` (`apps/assistant`, `apps/mac-worker`, `libs/*`), `tsconfig.base.json` (strict, `ES2022`, `NodeNext`), `.gitignore` (node_modules, dist, .env, `apps/mac/*.xcodeproj`, `apps/mac/build`, `.archify/`), `.env.example`
- Create: `libs/domain-contract/package.json` (name `@tasker/domain-contract`, build `tsc -p .`), `tsconfig.json`, `src/index.ts`, `src/tool-schema.ts`, `src/recognition.ts`, `src/recognition-schema.ts`, `src/jobs.ts`
- Modify: `README.md` (replace Next.js content: what stage 1 is, the three processes, links to both specs and this plan)

**Interfaces (Produces):**
```ts
// tool-schema.ts
export type DomainName = 'tasker' | 'fintrack';
export type JsonSchemaObject = { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };
export interface ToolSchema { name: string; domain: DomainName; description: string; input_schema: JsonSchemaObject; undoable: boolean; }
// recognition.ts
export type ProviderName = 'mac';                              // 'claude' joins in stage 2
export interface RecognizeRequest { client: 'swift' | 'golden' | 'curl'; session: { chatId: string; threadId: string; userId: string }; text: string; topicHint?: string; }
export interface Intent { domain: DomainName; tool: string; args: Record<string, unknown>; confidence: number; }
export interface RecognitionResult { intents: Intent[]; ask?: { question: string; options: string[] }; provider: ProviderName; latencyMs: number; raw?: unknown; }
export interface TranscribeResult { text: string; language: string; durationMs: number; latencyMs: number; }
// recognition-schema.ts
export function buildRecognitionJsonSchema(tools: ToolSchema[]): JsonSchemaObject
// => { type:'object', required:['intents'], additionalProperties:false, properties:{
//      intents:{ type:'array', items:{ oneOf: tools.map(t => ({ type:'object', required:['domain','tool','args','confidence'], additionalProperties:false,
//                properties:{ domain:{const:t.domain}, tool:{const:t.name}, args:t.input_schema, confidence:{type:'number',minimum:0,maximum:1} } })) } },
//      ask:{ type:'object', required:['question','options'], properties:{ question:{type:'string'}, options:{type:'array',items:{type:'string'}} } } } }
// jobs.ts
export const INFERENCE_QUEUE = 'inference';
export type InferenceJobName = 'recognize' | 'stt';
export interface RecognizeJobData { requestId: string; text: string; topicHint?: string; context: string; schema: JsonSchemaObject; }
export interface RecognizeJobResult { intents: Intent[]; ask?: RecognitionResult['ask']; raw: unknown; latencyMs: number; }
export interface SttJobData { requestId: string; audioPath: string; language: 'uk' | 'auto'; }
export interface SttJobResult { text: string; language: string; durationMs: number; latencyMs: number; }
export const HEARTBEAT_KEY = 'worker:heartbeat:mac';
```

- [ ] **Step 1: Create the root files and the lib; export everything from `index.ts`.**
- [ ] **Step 2: Verify** — Run: `cd ~/projects/tasker && pnpm install && pnpm --filter @tasker/domain-contract build && ls libs/domain-contract/dist/index.d.ts` → Expected: file listed, no TypeScript errors.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "chore: monorepo scaffold and domain-contract types"`

---

### Task 2: `apps/assistant` NestJS skeleton with config and health

**Files:**
- Create: `apps/assistant/package.json` (scripts `start:dev` = `nest start --watch`, `build`, `start`), `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`
- Create: `apps/assistant/src/main.ts` (port `ASSISTANT_PORT` default `4310`, global `ValidationPipe({ whitelist: true, transform: true })`, listen on `127.0.0.1`), `src/app.module.ts`
- Create: `apps/assistant/src/app-config/app-config.module.ts`, `app-config.service.ts`, `types/app-config.types.ts` — zod-validated env: `ASSISTANT_PORT`, `REDIS_URL` (default `redis://127.0.0.1:6379`), `OWNER_ID` (default `vitalii`), `OWNER_TIMEZONE` (default `Europe/Kyiv`), `LOCAL_TIMEOUT_MS` (default `20000`), `STT_TIMEOUT_MS` (default `60000`), `AUDIO_MAX_SECONDS` (default `300`), `TMP_DIR` (default `~/Library/Application Support/tasker/tmp`), `ENV_FILE` (default `~/Library/Application Support/tasker/.env`, loaded with `dotenv` before zod)
- Create: `apps/assistant/src/redis/redis.module.ts` (`@Global()`, provides `REDIS` token = `ioredis` client), `redis.constants.ts`
- Create: `apps/assistant/src/health/health.module.ts`, `health.controller.ts` — `GET /health` → `{ ok, redis: 'ok'|'down', worker: 'fresh'|'stale', time }`; `503` when redis is down
- Create: `apps/assistant/src/common/app-exception.ts` (`AppException(status, code, message, details?)`), `app-response.ts` (`{ ok: true, data }`), `global-exception.filter.ts`

**Interfaces (Produces):** `AppConfigService.get<K extends keyof AppConfig>(key: K): AppConfig[K]`; `REDIS` token (type `Redis`); `AppException`.

- [ ] **Step 1: Scaffold the app and modules (hand-written config files, no `nest new`).**
- [ ] **Step 2: Verify** — Run: `mkdir -p ~/Library/Application\ Support/tasker/tmp && touch ~/Library/Application\ Support/tasker/.env && chmod 600 ~/Library/Application\ Support/tasker/.env && pnpm --filter assistant start:dev`, then `curl -s localhost:4310/health` → Expected: `{"ok":true,"data":{"ok":true,"redis":"ok","worker":"stale",...}}`.
- [ ] **Step 3: Verify Redis-down** — `brew services stop redis; curl -s -o /dev/null -w '%{http_code}' localhost:4310/health; brew services start redis` → Expected: `503`.
- [ ] **Step 4: Commit** — `git commit -m "feat(assistant): nest skeleton, config, redis, health"`

---

### Task 3: Static tool registry (`tools` module)

**Files:**
- Create: `apps/assistant/config/tools/tasker.json`, `apps/assistant/config/tools/fintrack.json` — arrays of `ToolSchema`
- Create: `apps/assistant/src/tools/tools.module.ts`, `tools.service.ts`, `tools.controller.ts` (`GET /tools`), `helpers/load-tool-files.ts`

**Tool set (exact names):**
- tasker: `tasker__create_item { type: 'task'|'idea'|'note', title, body?, due_date? (YYYY-MM-DD), due_at? (ISO), remind_at? (ISO), project?, tags?: string[], priority?: 1|2|3 }`, `tasker__complete_item { short_id: number, note? }`, `tasker__update_item { short_id, patch: object }`, `tasker__list_items { filter: 'today'|'inbox'|'ideas'|'overdue' }`, `tasker__start_brainstorm { topic }`
- fintrack: `fintrack__add_transaction { type: 'expense'|'income'|'transfer', amount: number, currency: string (ISO 4217, default 'UAH'), category?, account?, counterparty?, note?, occurred_at? (ISO) }`, `fintrack__list_transactions { period: 'today'|'week'|'month' }`

**Interfaces (Produces):** `ToolsService.all(): ToolSchema[]`; `ToolsService.recognitionSchema(): JsonSchemaObject` (memoized `buildRecognitionJsonSchema(all())`).

- [ ] **Step 1: Write the JSON files and the module; validate each entry with zod against `ToolSchema` at startup (fail fast naming file and tool).**
- [ ] **Step 2: Verify** — `curl -s localhost:4310/tools | jq '.data | map(.name)'` → Expected: the seven names above.
- [ ] **Step 3: Commit** — `git commit -m "feat(assistant): static tool registry for tasker and fintrack"`

---

### Task 4: Session (Redis)

**Files:**
- Create: `apps/assistant/src/session/session.module.ts`, `session.service.ts`, `types/session.types.ts`

**Interfaces (Produces):**
```ts
interface SessionTurn { role: 'user'|'assistant'; text: string; at: string }
interface SessionState { turns: SessionTurn[]; openQuestion?: { question: string; options: string[] }; updatedAt: string }
SessionService.key(client, chatId, threadId): string                 // `session:${client}:${chatId}:${threadId}`
SessionService.get(key): Promise<SessionState>                        // empty state when missing
SessionService.appendTurn(key, turn, maxTurns = 10): Promise<void>    // trims, EXPIRE 30 d
SessionService.contextText(state): string                             // "user: …\nassistant: …", ≤ 1500 chars, oldest dropped first
```

- [ ] **Step 1: Implement; add `GET /session/:client/:chatId/:threadId` (debug, returns the state) in `session.controller.ts`.**
- [ ] **Step 2: Verify** — `redis-cli SET session:curl:c:t '{"turns":[{"role":"user","text":"hi","at":"2026-11-15T10:00:00Z"}],"updatedAt":"2026-11-15T10:00:00Z"}' && curl -s localhost:4310/session/curl/c/t | jq '.data.turns | length'` → Expected: `1`.
- [ ] **Step 3: Commit** — `git commit -m "feat(assistant): redis session"`

---

### Task 5: `apps/mac-worker` — BullMQ consumer: heartbeat + `recognize` over LM Studio

**Files:**
- Create: `apps/mac-worker/package.json` (scripts `dev` = `tsx src/main.ts`, `build`, `start`), `tsconfig.json`
- Create: `apps/mac-worker/src/main.ts`, `src/config.ts` (`REDIS_URL`, `LMSTUDIO_URL` default `http://localhost:1235/v1`, `LOCAL_MODEL` default `qwen/qwen3.5-9b`, `WHISPER_BIN` default `whisper-cli`, `WHISPER_MODEL` path default `~/Library/Application Support/tasker/models/ggml-large-v3-turbo-q8_0.bin`, `FFMPEG_BIN` default `ffmpeg`), `src/heartbeat.ts`, `src/lmstudio-client.ts`, `src/jobs/recognize.job.ts`, `src/jobs/index.ts` (name → handler map)
- Create: `apps/mac-worker/scripts/enqueue-sample.ts`

**Interfaces (Produces):**
```ts
startHeartbeat(redis: Redis, key = HEARTBEAT_KEY, everyMs = 10_000, ttlSec = 30): () => void
LmStudioClient.recognize(data: RecognizeJobData, model: string): Promise<RecognizeJobResult>
// POST {LMSTUDIO_URL}/chat/completions { model, temperature: 0, max_tokens: 800,
//   messages: [{ role:'system', content: systemPrompt(now, timezone) }, { role:'user', content: (data.context ? data.context + '\n---\n' : '') + (data.topicHint ? `[topic: ${data.topicHint}]\n` : '') + data.text }],
//   response_format: { type:'json_schema', json_schema: { name:'recognition', strict: true, schema: data.schema } },
//   chat_template_kwargs: { enable_thinking: false } }
// If the content still starts with "<think>", prepend "/no_think\n" to the system prompt and retry once; strip any <think>…</think> before JSON.parse.
new Worker<RecognizeJobData | SttJobData>(INFERENCE_QUEUE, dispatchByName, { connection, concurrency: 1 })
```
System prompt must contain: `now` in the owner timezone as ISO + weekday; "One intent per distinct request; a message may contain several."; "Relative dates ('завтра', 'в п'ятницю') resolve against now."; "Amounts without currency are UAH."; "If the domain or a required field is genuinely unclear, return `ask` instead of guessing."; "Answer only with JSON matching the schema." Startup: `lms load qwen/qwen3.5-9b --ttl 3600 --yes` via `execa` (ignore failure if already loaded).

- [ ] **Step 1: Implement the worker with the `recognize` handler and the sample script (`enqueue-sample.ts` fetches `GET /tools`, builds the schema with `buildRecognitionJsonSchema`, enqueues text `"купив каву 85 грн"`, prints the result).**
- [ ] **Step 2: Verify heartbeat** — `pnpm --filter mac-worker dev` and `redis-cli TTL worker:heartbeat:mac` → Expected: between 1 and 30.
- [ ] **Step 3: Verify a job** — `pnpm --filter mac-worker exec tsx scripts/enqueue-sample.ts` → Expected: `intents[0].tool === "fintrack__add_transaction"`, `args.amount === 85`, `args.currency === "UAH"`, latency printed.
- [ ] **Step 4: Verify multi-intent** — same script with `--text "купив каву 85 грн і треба купити молоко завтра"` → Expected: two intents, one per domain.
- [ ] **Step 5: Commit** — `git commit -m "feat(mac-worker): bullmq consumer with lm studio structured recognition"`

---

### Task 6: Local provider + `POST /recognize`

**Files:**
- Create: `apps/assistant/src/providers/providers.module.ts` (registers `Queue(INFERENCE_QUEUE)` + `QueueEvents`), `types/recognition-provider.types.ts`, `local/local.provider.ts`, `helpers/is-worker-fresh.ts`
- Create: `apps/assistant/src/recognize/recognize.module.ts`, `recognize.controller.ts`, `recognize.service.ts`, `dto/recognize.dto.ts`

**Interfaces (Produces):**
```ts
interface RecognitionProvider { readonly name: ProviderName; recognize(input: ProviderInput): Promise<ProviderOutput>; }
interface ProviderInput { text: string; topicHint?: string; context: string; tools: ToolSchema[]; }
interface ProviderOutput { intents: Intent[]; ask?: RecognitionResult['ask']; raw: unknown; latencyMs: number; }
isWorkerFresh(redis): Promise<boolean>                                   // EXISTS worker:heartbeat:mac
LocalProvider.recognize(input)   // throws AppException(503,'WORKER_UNAVAILABLE') when stale; adds job 'recognize' with jobId = requestId, attempts 1, removeOnComplete/Fail; waitUntilFinished(queueEvents, LOCAL_TIMEOUT_MS); job failure → AppException(502,'PROVIDER_ERROR', failedReason); timeout → AppException(504,'PROVIDER_TIMEOUT')
RecognizeService.recognize(req: RecognizeRequest): Promise<RecognitionResult>   // session context in, user turn + intents summary appended after
RecognizeDto: text (string, trimmed, 1..2000), client (enum), session (nested, non-empty strings), topicHint?
```

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify tasker** — `curl -s localhost:4310/recognize -H 'content-type: application/json' -d '{"client":"curl","session":{"chatId":"c","threadId":"t","userId":"vitalii"},"text":"треба подзвонити в банк завтра"}' | jq '.data'` → Expected: `provider: "mac"`, one intent `tasker__create_item`, `args.type: "task"`, `args.due_date` = tomorrow in Europe/Kyiv.
- [ ] **Step 3: Verify fintrack** — same with `"text":"купив каву 85 грн"` → Expected: `fintrack__add_transaction`, `amount: 85`, `currency: "UAH"`.
- [ ] **Step 4: Verify validation (Review Focus 1, 2)** — `"text":"   "` and a 2001-char text → Expected: `400` both with `errors.text`; `redis-cli LLEN bull:inference:wait` unchanged.
- [ ] **Step 5: Verify stale (Review Focus 3)** — stop the worker, wait 35 s, repeat step 2 → Expected: `503` with code `WORKER_UNAVAILABLE`, no job in `bull:inference:wait`.
- [ ] **Step 6: Verify provider error (Review Focus 4)** — worker running with `LMSTUDIO_URL=http://localhost:1` → Expected: `502 PROVIDER_ERROR` with the connection error text, within `LOCAL_TIMEOUT_MS`.
- [ ] **Step 7: Commit** — `git commit -m "feat(assistant): local provider and POST /recognize"`

---

### Task 7: Whisper on the worker + `POST /transcribe`

**Files:**
- Create: `apps/mac-worker/src/jobs/stt.job.ts`, `src/whisper-client.ts`, `scripts/setup-whisper.sh`
- Create: `apps/assistant/src/transcribe/transcribe.module.ts`, `transcribe.controller.ts` (`POST /transcribe`, multipart field `audio`, optional `language`), `transcribe.service.ts`, `helpers/probe-audio.ts`
- Modify: `apps/mac-worker/src/jobs/index.ts` (register `stt`), `.env.example`, `README.md` (prerequisites)

**Interfaces (Produces):**
```ts
// setup-whisper.sh: brew install whisper-cpp ffmpeg; mkdir -p "$HOME/Library/Application Support/tasker/models";
//   curl -L -o "…/ggml-large-v3-turbo-q8_0.bin" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q8_0.bin   (~0.9 GB)
WhisperClient.transcribe(data: SttJobData): Promise<SttJobResult>
// ffmpeg -y -i <audioPath> -ar 16000 -ac 1 -f wav <tmp>.wav  (execa; non-zero exit → throw AudioInvalidError)
// whisper-cli -m <WHISPER_MODEL> -l <language|auto> -f <tmp>.wav -otxt -of <tmp> -nt   → read <tmp>.txt, trim; durationMs from ffprobe; delete temp files in finally
probeAudio(path): Promise<{ durationSec: number }>                       // ffprobe -v error -show_entries format=duration -of csv=p=0
TranscribeService.transcribe(file: Express.Multer.File, language: 'uk'|'auto' = 'uk'): Promise<TranscribeResult>
// saves upload to TMP_DIR/<requestId>.<ext>; probeAudio → AUDIO_INVALID (422) on failure, AUDIO_TOO_LONG (413) when durationSec > AUDIO_MAX_SECONDS;
// WORKER_UNAVAILABLE (503) when stale; adds job 'stt' and waits STT_TIMEOUT_MS; deletes the upload in finally
```
Multer limits: `fileSize: 25 MB`, accepted mimetypes `audio/*`, `video/webm`, `application/octet-stream` (the Mac app sends `.m4a`).

- [ ] **Step 1: Run `scripts/setup-whisper.sh`; verify `whisper-cli --help` prints usage and the model file is ~0.9 GB.**
- [ ] **Step 2: Implement the worker job and the assistant endpoint.**
- [ ] **Step 3: Verify STT alone** — record a 10-second Ukrainian note with QuickTime (`.m4a`, say "купив каву за вісімдесят п'ять гривень"), then `curl -s localhost:4310/transcribe -F audio=@note.m4a | jq .data` → Expected: `text` contains "каву" and "гривень", `durationMs` ≈ 10000, `latencyMs` < 8000 warm.
- [ ] **Step 4: Verify transcript → recognize** — pipe the `text` from step 3 into the Task 6 curl → Expected: `fintrack__add_transaction` with `amount: 85`.
- [ ] **Step 5: Verify stale** — worker stopped → `503 WORKER_UNAVAILABLE`.
- [ ] **Step 6: Verify bad audio (Review Focus 5)** — `curl -F audio=@README.md` → `422 AUDIO_INVALID`; a 6-minute silent file (`ffmpeg -f lavfi -i anullsrc -t 360 long.m4a`) → `413 AUDIO_TOO_LONG` and no job enqueued.
- [ ] **Step 7: Commit** — `git commit -m "feat: whisper stt on the mac worker and POST /transcribe"`

---

### Task 8: `apps/mac` — SwiftUI client (XcodeGen), text + voice

**Files:**
- Create: `apps/mac/project.yml` (XcodeGen: target `Assistant`, macOS 14, SwiftUI app, bundle id `dev.vitalii.tasker.assistant`, entitlements: outgoing network, microphone; `NSMicrophoneUsageDescription`), `apps/mac/Assistant/AssistantApp.swift`, `ContentView.swift`, `RecognizeClient.swift` (`transcribe(fileURL:) async throws -> TranscribeResult`, `recognize(text:topicHint:) async throws -> RecognitionResult`), `Recorder.swift` (AVAudioRecorder, `.m4a` AAC 16 kHz mono, start/stop), `Models.swift` (Codable mirrors), `CorrectionsStore.swift`, `Assistant/Info.plist` (ATS allows `localhost` http)
- Create: `apps/mac/README.md` (`brew install xcodegen && cd apps/mac && xcodegen generate && open Assistant.xcodeproj`)

**Behavior (exact):**
- Toolbar: base URL field (default `http://127.0.0.1:4310`, persisted in `UserDefaults`); status dot from `GET /health` every 10 s (green = worker fresh).
- Main: multiline text field; **Record** button (toggle; red while recording; on stop → `POST /transcribe` → transcript fills the text field, editable) ; **Recognize** (⌘↩) → `POST /recognize` with `client: "swift"`, `session: { chatId: "mac", threadId: "main", userId: "vitalii" }`.
- Result: header line `mac · <latencyMs> ms`; one card per intent: `domain / tool`, confidence bar, args as a two-column table; `ask` as a yellow callout with options; disclosure "Raw JSON".
- "Wrong" button → sheet with a text field "what it should have been" → appends `{ text, result, correction, at }` to `~/Library/Application Support/tasker/corrections.jsonl`.
- Errors (`4xx/5xx`, connection refused) shown inline with the server's `code` and `message`.

- [ ] **Step 1: Write `project.yml` and the Swift files.**
- [ ] **Step 2: Verify build** — `brew list xcodegen >/dev/null || brew install xcodegen; cd apps/mac && xcodegen generate && xcodebuild -project Assistant.xcodeproj -scheme Assistant -configuration Debug -derivedDataPath build build | tail -3` → Expected: `** BUILD SUCCEEDED **`.
- [ ] **Step 3: Verify text path** — `open build/Build/Products/Debug/Assistant.app`, type "подзвонити в банк завтра", Recognize → Expected: tasker card with `tasker__create_item` and tomorrow's date.
- [ ] **Step 4: Verify voice path** — Record "купив каву за вісімдесят п'ять гривень", stop → transcript appears; Recognize → fintrack card with `amount 85`.
- [ ] **Step 5: Commit** — `git commit -m "feat(mac): swiftui client with text and voice recognition"`

---

### Task 9: Golden set and runner (local model)

**Files:**
- Create: `apps/assistant/golden/messages.json` — 30 rows `{ id, text, topicHint?, expect: { intents: [{ domain, tool, args: <subset> }] } | { ask: true } }`: 10 tasker tasks with relative dates (завтра, у п'ятницю, через тиждень, о 9), 5 ideas/notes, 8 fintrack rows (UAH default, USD explicit, "переказав з моно на приват"), 4 ambiguous rows expecting `ask`, 3 multi-intent rows
- Create: `apps/assistant/scripts/golden.ts` (`tsx`): POST each row with `client: "golden"` and a unique session; compare `domain`+`tool` exactly, `args` by subset (dates normalized to `YYYY-MM-DD` in Europe/Kyiv); print a table and totals: intent accuracy, args accuracy, p50/p95 latency; write `apps/assistant/golden/results-mac-<date>.json`
- Modify: `apps/assistant/package.json` (script `golden`)

- [ ] **Step 1: Write the rows and the runner.**
- [ ] **Step 2: Run** — `pnpm --filter assistant golden` → Expected: a measured intent accuracy (target ≥ 80 %), p50 < 3 s warm; multi-intent rows produce 2 intents.
- [ ] **Step 3: Record** — put the numbers and date into the spec's §10 Stage 1 "Done when" line; list failing row ids there. One prompt-tuning pass allowed in this task, no more.
- [ ] **Step 4: Commit** — `git commit -m "test(assistant): golden set with measured local results"`

---

### Task 10: Run as services on the Mac (launchd) + runbook

**Files:**
- Create: `apps/assistant/launchd/com.vitalii.tasker.assistant.plist`, `apps/mac-worker/launchd/com.vitalii.tasker.mac-worker.plist` (templates: `ProgramArguments` = `node dist/main.js`, `WorkingDirectory`, `EnvironmentVariables.PATH` incl. `/opt/homebrew/bin` and `~/.lmstudio/bin`, `KeepAlive`, `RunAtLoad`, logs to `~/Library/Logs/tasker/`)
- Create: `scripts/install-launchd.sh` (renders templates with the repo path, copies to `~/Library/LaunchAgents`, `launchctl bootstrap gui/$UID …`), `scripts/uninstall-launchd.sh`
- Modify: `README.md` — "Run on the Mac": prerequisites (`brew install redis && brew services start redis`, LM Studio server on 1235, `scripts/setup-whisper.sh`, `.env`), build (`pnpm -r build`), install services, `curl localhost:4310/health`, open the app; "Stop everything".

- [ ] **Step 1: Write templates, scripts, runbook.**
- [ ] **Step 2: Verify** — `pnpm -r build && scripts/install-launchd.sh && sleep 5 && curl -s localhost:4310/health | jq .data` → Expected: `redis: "ok"`, `worker: "fresh"`; then `scripts/uninstall-launchd.sh && sleep 2 && curl -s -o /dev/null -w '%{http_code}' localhost:4310/health` → Expected: `000`.
- [ ] **Step 3: Commit** — `git commit -m "chore: launchd services and runbook for stage 1"`
