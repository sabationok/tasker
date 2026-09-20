# tasker

A **central, standalone local tool** for tracking remediation/backlog tasks across *any*
project. Point it at a project by path; it reads that project's task files and audit READMEs
and serves a graphical tracker (locally) where you mark which tasks you'll do yourself and
which are handed to an agent (Claude / Fable).

- **Source of truth is in the target project's repo** (git-versioned, shared) — not in the
  browser. Two files under the target's `tasks/`:
  - `catalog.jsonl` — generated from the project's READMEs / `FABLE_BACKLOG.md` (what tasks exist).
  - `state.json` — owner / status / comment per task (progress).
- **Levels:** systemic root causes (`S1…`), security-critical (`SEC1…`), and per-module `P1`
  items.
- **Local agents** read those files directly today; a future **MCP layer** lets them pull
  tasks programmatically (`next_agent_task` → work → PR → `done`).

## Status

Design spec: [`docs/specs/2026-09-20-central-task-tracker-design.md`](docs/specs/2026-09-20-central-task-tracker-design.md).
Implementation not started — next step is the implementation plan, then the Next.js app +
generator (iteration 1).

## Stack

Next.js (App Router) + TypeScript · pnpm · Node 20+.

## Iteration 1 scope

1. Task files in the target repo (`mia-erp-server` first).
2. Local Next.js tracker over those files (owner routing, per-task status, comments, filters,
   delegate queues, UK/EN, code legend).
3. `scripts/build-tasks.mjs` generator (READMEs → `catalog.jsonl`, preserving `state.json`).

Later: MCP server, multi-project switching, PR automation, optional Jira/Trello mirror.
