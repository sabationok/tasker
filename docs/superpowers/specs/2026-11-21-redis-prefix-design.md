# Redis prefix for tasker server (dev isolation on the shared Redis)

Date: 2026-11-21. Status: spec, not started. Convention: global skill `local-infra` (`~/.claude/skills/local-infra`).

## Why

All local apps share the brew Redis `127.0.0.1:6379` db0. tasker's BullMQ queue `webhooks` lands in the default
`bull:webhooks` — the same name webhooxy-style apps use. Decision: no per-project Redis containers; every app
prefixes keys, queues and channels with `REDIS_PREFIX`.

## Target

`REDIS_PREFIX=tasker` (zod default `tasker`).

| what | now | target |
|---|---|---|
| BullMQ `webhooks` | `bull:webhooks` | `bull:tasker:webhooks` |
| app-session keys | `tasker:app-session:<h>`, `tasker:initdata-nonce:<n>` (hard-coded) | same names, built from `REDIS_PREFIX` |
| pub/sub | none (listeners are in-process) | — |

## Changes (paths under `apps/server/src`)

1. `config/env.ts:4-15` — add `REDIS_PREFIX: z.string().min(1).default('tasker')`; `apps/server/.env.example`.
2. `app.module.ts:31` — `BullModule.forRoot({ connection: redisConnection(env.REDIS_URL), prefix: \`bull:${env.REDIS_PREFIX}\` })`.
   `events/events.module.ts:12` registerQueue inherits it.
3. `app-session/app-session.service.ts:11` — key builders use `${env.REDIS_PREFIX}:` instead of the literal `tasker:`.
   Keep explicit prefixes; don't also add ioredis `keyPrefix` in `common/redis/redis.module.ts:9`.

## Cut-over

Names of app-session keys don't change with the default prefix, so sessions survive. The old `bull:webhooks:*`
queue: let pending jobs finish, then delete by pattern (ask the user first; never `FLUSHALL`).

## Done when

- `redis-cli --scan --pattern 'bull:tasker:webhooks:*' | head` shows the queue; no new `bull:webhooks:*` keys.
- A webhook event is enqueued and processed (`webhooks.processor.ts`); app session login still works.
