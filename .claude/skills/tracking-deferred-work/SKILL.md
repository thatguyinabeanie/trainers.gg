---
name: tracking-deferred-work
description: Use when a decision lands on "do the small fix now, the bigger improvement later" — log, update, or complete an entry in docs/deferred-improvements.md (the backlog of agreed-but-parked changes). Invoke when someone says to defer, park, backlog, "do later", "follow-up", or "note for later" a concrete improvement, or asks what's deferred.
---

# Tracking Deferred Work

Maintain `docs/deferred-improvements.md` — the backlog of changes the team has **decided to make** but intentionally **parked** (usually because a smaller correct fix shipped and the larger improvement is a refactor / new DB object / out-of-scope for the current branch).

**This is not a wish list.** Only log things that have been agreed as worth doing. If it's a "maybe someday," it doesn't belong here.

## The file

- Location: `docs/deferred-improvements.md` (repo root `docs/`).
- Sections: `## Open` (active backlog) and `## Completed` (shipped, kept for history).
- Each entry follows the **Entry format** block defined at the top of that file — read it before writing so new entries match.

## When to use this skill

| Trigger                                                            | Action                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| A review/design decision is "ship small fix now, bigger one later" | **Add** an Open entry                                   |
| The parked improvement gets picked up                              | Flip status to **In progress**                          |
| The improvement ships                                              | **Complete** it — move to `## Completed` with commit/PR |
| "What have we deferred?" / "anything parked in X?"                 | **Read** and summarize relevant entries                 |

## Adding an entry

1. Read `docs/deferred-improvements.md` (confirm the file exists and re-read the **Entry format** block — it's the source of truth for structure).
2. Append a new `###` entry under `## Open` using that exact format. Required fields: title (short imperative), Status, Area, Logged (date + source), Context, **Shipped instead**, **Deferred improvement**, **Why deferred**, References.
3. Be concrete and self-contained: a future agent must be able to act on it **without** re-deriving the context. Name the files, functions, tables, and the specific change.
4. Convert relative dates to absolute (`2026-06-15`, not "today").
5. If the entry relates to an existing one, cross-link by title.

## Completing an entry

1. Find the entry under `## Open`.
2. Move it to `## Completed`, set `Status: Completed (<commit sha or PR #>)`, and append a one-line note on what shipped.
3. Do not delete — the parked→shipped history is useful context.

## Rules

- **One file, two sections.** Don't scatter deferred notes across other docs, code comments, or commit messages — point them here.
- **Self-contained entries.** No "see the discussion" without saying what the discussion concluded.
- **Keep it honest.** If an item turns out not worth doing, move it to Completed with a note ("Dropped — <reason>"), don't silently delete.
- **Don't duplicate the issue tracker.** This is for engineering improvements parked mid-work, not product features (those go to Linear — see the `ticket` skill).

## Example invocation

> "We fixed the leak with an inline filter, but the real fix is a public-allowlist view — park that."

→ Read the doc, append an Open entry: title "Route X through a public-allowlist view", fill Context / Shipped instead / Deferred improvement / Why deferred / References, save.
