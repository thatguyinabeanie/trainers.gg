---
name: dispatching-parallel-waves
description: Use when about to dispatch implementation subagents in parallel waves to execute a plan (single message, multiple Agent calls, disjoint file allowlists). Wraps superpowers:dispatching-parallel-agents and adds this repo's required gate — surface the wave/parallelism breakdown to the user and wait before dispatching wave 1.
---

# Dispatching Parallel Waves

This is the trainers.gg house wrapper around the shared
`superpowers:dispatching-parallel-agents` skill. It adds one **non-negotiable
gate** the base skill doesn't have.

> ⚠️ Do **not** edit the vendored superpowers skill to add this — plugin-cache
> files are version-pinned and overwritten on update. This project skill is the
> durable home. See `feedback_no_vendored_skill_edits` memory.

## Steps

1. **Invoke `superpowers:dispatching-parallel-agents` first** and follow it for
   the core mechanics: identify independent domains, write focused self-contained
   agent prompts, dispatch all of a wave's agents in one message, then review and
   integrate.

2. **GATE — surface the wave/parallelism breakdown, then wait.** Before issuing
   any dispatch in a session, show the user the breakdown and pause for their
   acknowledgement. Present one row per task:

   | Wave | Task | Model | Files owned (allowlist) | Depends on |

   …plus the dependency arrows between waves (e.g. `A ∥ B → C`).

   The user reads this to catch scope creep, file-ownership collisions, and wrong
   model choices **before** agents run — far cheaper to fix on paper than after a
   dozen agents have edited files. Do **not** dispatch wave 1 until the user has
   seen it. This applies whether the plan came from plan mode or was assembled
   inline.

3. **Honor the house rules** layered on top of the base skill:
   - **Disjoint file allowlists** within a wave — pass each agent an explicit list
     of files it owns; no two agents in a wave touch the same file (avoids git
     races). Sequence only true dependencies into later waves.
   - **Model per dispatch** — haiku for mechanical work, sonnet for
     implementation/review/tests, opus/main orchestrates only. Prefix each
     agent's description with `[model]`.
   - **Subagents never commit or push.** They report changed files + a suggested
     commit message. The **orchestrator commits between waves** (one committer).
   - After each push, dispatch `background-checker` + `ci-monitor` in the
     background — never block on them.

## Why this exists

The base skill explains *how* to parallelize. This repo additionally requires the
human to see the wave map before execution begins — it is a standing preference,
not a per-task ask. Skipping the gate is the failure mode this skill prevents.
