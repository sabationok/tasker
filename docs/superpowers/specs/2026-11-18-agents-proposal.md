# Agents in tasker — proposal

> **Built 2026-11-18 (server 0.2.0)** with the user's answers: no card for own items (`_meta.selfScoped`), old
> `owner = claude` → agent `claude`, keep `me`. Deviation from the model below: items store the agent **slug** in
> `assignee` / `created_by` text columns (slugs are immutable), not uuid FKs. Own-item writes are three tools
> (`claim_assignment`, `complete_assignment`, `defer_assignment`), each checked server-side (`forbidden:not-assigned`).
> `get_today` has no assignee filter yet.

Request (Mia session, user's words): «У таскер можеш додати поняття агенти і юзати їх замість проектів». An agent's items are
its to-dos; when Mia calls with her credential, tasker knows it is Mia and tells her what to do.

## What exists today

- `items.owner text` = `'me' | 'claude'`; `next_task` takes the oldest `owner = claude` task and marks it `doing`.
- Every caller is an `api_keys` row: a real `tsk_…` key or, in dev, `header:<name>` from `X-Tasker-Client`. `RequestCtx.apiKeyId`
  carries it into services. The mini app's initData session is signed with the key's webapp secret, so it has the same key.

## Data model

```
agents
  id            uuid v7 PK
  slug          text unique           -- 'mia'; the value tools take
  name          text                  -- 'Mia'
  icon          text null             -- an emoji or short glyph
  color         text null             -- '#RRGGBB'
  description   text null             -- what this agent does (shown to the user, not to the model)
  api_key_id    uuid null unique → api_keys.id   -- the credential; null = not able to call (e.g. legacy 'claude')
  created_at, archived_at

items
  + assignee_agent_id    uuid null → agents.id    -- null = the user
  + created_by_agent_id  uuid null → agents.id    -- null = the user (mini app / UI); set from ctx, never an argument
  - owner                                         -- dropped
```

Credential: no new auth mechanism. An agent is an API key identity plus a profile: `ctx.agentId` is resolved from
`ctx.apiKeyId` in the guard (one cached lookup). In dev, `X-Tasker-Client: mia` → `header:mia` key → the agent with
slug `mia` (linked on first sight). With real keys the user binds a key to an agent in settings. A claim inside the
token is not needed: the key already says who calls, and it cannot be forged by the model.

Migration: seed agent `claude` (no key), move `owner = 'claude'` → `assignee_agent_id = claude`, drop `owner`.
Seed `mia`, link to `header:mia` when it exists. Projects are not touched.

API / tool vocabulary: `assignee: 'me' | '<agent slug>'` (keeps the existing `me`), `createdBy` read-only in views
as `{ kind: 'user' } | { kind: 'agent', slug, name, icon, color }`.

## Tools (server, MCP)

| tool | hint | what |
|---|---|---|
| `my_assignments` | readOnly | The caller agent's open items (todo / doing / pending), oldest first, with body (= instructions), checklist, due, reminders. `forbidden:not-an-agent` for a non-agent caller. |
| `claim_assignment {itemId?}` | write, noDraft | Mark one of mine `doing` (no id = the oldest todo, or a `doing` idle 24 h — today's `next_task` rule). Replaces `next_task`. |
| `create_item` | write | + `assignee`. `createdBy` from ctx. |
| `update_item` | write | + `assignee` (reassign). Done / defer of own items reuse `complete_item` / `update_item {date | dueAt}`. |
| `list_items`, `get_today` | readOnly | + filters `assignee`, `createdBy`. |
| `find_agents` | readOnly lookup | Lookup for `assignee` (agents are rows, so not a static enum). |

Module: `agents` in `TOOL_MODULES` (`my_assignments`, `claim_assignment`, `find_agents`). Connector version bump.

## Mini app

- Agent chip filter on Tasks / Today (avatar = icon + color).
- «Mia чекає від тебе»: `assignee = me AND createdBy = mia AND open`, a block on Today.
- «Задачі Mia»: `assignee = mia` list (the user sees and can edit what Mia owes).
- Settings: agents list (name, icon, color, bound key). REST only, not an MCP tool.

## Open decisions for the user

1. Confirm cards on an agent's own items. Today every write needs a confirm. Mia's `claim` / `complete` / `defer` of
   items assigned to her would each show a card. Option: the hub skips the card when the tool result's target item
   is assigned to the caller (needs `_meta.selfScoped: true` + the server enforcing "only own items" for that call).
   Default if not decided: cards stay.
2. May an agent write items not assigned to it (the user's tasks)? Proposed: yes, as today, always with a confirm.
3. `assignee` vocabulary: `me` (existing) or `user` (Mia's wording).
4. Keep `claude` as a seeded agent for the old `owner = claude` rows, or move them to `me`.
