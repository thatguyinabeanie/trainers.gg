---
name: Parallel agent conflicts on discord-bot branch
description: On the discord-bot branch, multiple agents work in parallel on _components/ — linter auto-imports and component stubs appear in discord-client.tsx from other agents
type: project
---

On the `discord-bot` branch, multiple task agents run concurrently against the same files. When working on a `_components/` task, expect:

- `discord-client.tsx` to be modified by a linter or parallel agent mid-task (adding imports for T16 components like `StatusHeader`, `FailureBanner`)
- Other `_components/*.tsx` files appearing after your write (created by parallel agents)
- `discord-client.test.tsx` expectations referencing stale placeholder text ("renders here") that become stale once real components land

**Why:** The discord bot UI tasks (T15–T20) are dispatched as parallel subagents, all touching the same `discord-client.tsx` and `_components/` directory.

**How to apply:** Read `discord-client.tsx` immediately before any edit. Don't try to revert auto-imports from parallel agents — they are intentional. Scope changes narrowly to your task files only.
