---
name: using-mempalace
description: Use when storing design decisions, searching past context, writing session diaries, or working with the mempalace knowledge graph
---

# Using Mempalace

AI memory system for persistent decisions, semantic search, knowledge graph, and session diaries. All MCP tool names follow the pattern `mcp__mempalace__mempalace_<tool>`.

## Project Configuration

- **Wing**: `trainers_gg` — always use this, never omit it
- **Rooms** (domain-specific, NOT generic buckets):

| Room | Domain |
| `architecture` | Package boundaries, data flow, system design |
| `auth` | Auth providers, session handling, RLS decisions |
| `tournaments` | Pairing algorithms, bracket logic, standings rules |
| `pokemon` | Team parsing, legality, format decisions |
| `team-builder` | Team builder UI/UX, import/export, validation |
| `bluesky` | AT Protocol, DID, PDS, federation decisions |
| `mobile` | Expo, React Native, mobile-specific patterns |
| `database` | Schema decisions, migrations, indexes, query patterns |
| `web` | Next.js routes, SSR, caching strategies |
| `ui-design` | Design tokens, component patterns, visual decisions |
| `devtools` | DX tooling, CI/CD, testing infra |
| `product` | Feature decisions, user research, prioritization |

Pick the room matching the content's domain. Never use `technical` or `architecture` as catch-all buckets — every piece of content belongs in a specific room.

## Tool Reference

### Storage

| Tool                        | Purpose                                 | Key Params                                           |
| --------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `mempalace_add_drawer`      | File verbatim content into a room       | `wing`, `room`, `content`, `source_file`, `added_by` |
| `mempalace_check_duplicate` | Check for similar content before filing | `content`, `threshold`                               |
| `mempalace_delete_drawer`   | Remove a drawer by ID                   | `drawer_id`                                          |

Always call `check_duplicate` before `add_drawer`.

### Search & Discovery

| Tool                     | Purpose                        | Key Params                       |
| ------------------------ | ------------------------------ | -------------------------------- |
| `mempalace_search`       | Semantic search across drawers | `query`, `wing`, `room`, `limit` |
| `mempalace_list_wings`   | Wings with counts              | —                                |
| `mempalace_list_rooms`   | Rooms within a wing            | `wing`                           |
| `mempalace_get_taxonomy` | Full wing/room tree            | —                                |
| `mempalace_status`       | System overview                | —                                |

### Knowledge Graph

| Tool                      | Purpose                                  | Key Params                                     |
| ------------------------- | ---------------------------------------- | ---------------------------------------------- |
| `mempalace_kg_add`        | Add facts (subject → predicate → object) | `subject`, `predicate`, `object`, `valid_from` |
| `mempalace_kg_query`      | Query entity relationships               | `entity`, `as_of`, `direction`                 |
| `mempalace_kg_invalidate` | Mark facts as ended                      | `subject`, `predicate`, `object`, `ended`      |
| `mempalace_kg_timeline`   | Chronological entity story               | `entity`                                       |

### Session Diary

| Tool                      | Purpose                             | Key Params                     |
| ------------------------- | ----------------------------------- | ------------------------------ |
| `mempalace_diary_write`   | Write session notes in AAAK dialect | `agent_name`, `entry`, `topic` |
| `mempalace_diary_read`    | Read diary history                  | `agent_name`, `last_n`         |
| `mempalace_get_aaak_spec` | Full AAAK dialect reference         | —                              |

Use `agent_name` to identify which agent wrote the entry (e.g., `"planner"`, `"code-reviewer"`). Use `topic` to tag the session.

## What to Store

### DO store

- Architecture decisions with rationale ("we chose X because Y")
- PR discussion outcomes and resolved trade-offs
- Design decisions not captured in code or commits
- Non-obvious constraints discovered during implementation
- Knowledge graph facts about system relationships

### DO NOT store

- **Repo files** (CLAUDE.md, skills, rules) — Read them directly. Duplicating creates stale copies that drift from the source of truth
- **PR descriptions or commit messages** — use `git log`. The PostToolUse hook already saves commit summaries automatically
- **Bulk imports of any kind** — mempalace is for curated decisions, not document dumps
- **Content in generic rooms** like `technical` or `architecture` as catch-all buckets — use domain-specific rooms
- **Routine code changes or debugging notes** — these belong in commits, not memory

The current `trainers_gg` wing has accumulated junk-drawer content from bulk file imports. Do not repeat this pattern.

## Bulk Operations — Confirm Before Destroying

When the user says "clean up", "fix up", "reorganize", or "sort out" the mempalace (or any bulk content), **never default to delete**. These words are ambiguous — they can mean move/merge/re-tag/archive, and deletion destroys information the user may still need.

Required flow before any bulk delete:

1. Summarize what you propose to do in one sentence (e.g., "delete 806 drawers in room X" vs "move 806 drawers from room X to room Y")
2. Ask the user via `AskUserQuestion` to pick between: reorganize, archive/merge, delete, or cancel
3. Only proceed with the chosen action

Applies to: `mempalace_delete_drawer`, any loop that calls it, any direct ChromaDB/DB manipulation of mempalace storage, and any batch operation over more than ~5 drawers.

## When to Search vs Store

| Situation                                  | Action                                           |
| ------------------------------------------ | ------------------------------------------------ |
| Starting a planning session                | Search — check past decisions on the topic       |
| Making a significant architecture decision | Store — `add_drawer` to the relevant domain room |
| Finishing a session with important context | Diary — `diary_write` with session summary       |
| Reviewing code with notable patterns       | Store — `add_drawer` to the relevant domain room |
| Context window compacting (PreCompact)     | Both — store key decisions + write diary entry   |
| Recording a tech choice or dependency      | KG — `kg_add` with subject/predicate/object      |
| Checking if something was decided before   | Search — `mempalace_search` with topic query     |

## Knowledge Graph Usage

The KG is best for recording relationships between system entities over time:

```
subject: "tournaments package"
predicate: "uses algorithm"
object: "Swiss pairings"
valid_from: "2026-04-01"
```

Use `kg_invalidate` when a decision changes so future queries see the correct current state.

## Diary Format

Call `mempalace_get_aaak_spec` for the full AAAK dialect reference before writing diary entries. AAAK is a structured shorthand designed for efficient AI-to-AI context passing.
