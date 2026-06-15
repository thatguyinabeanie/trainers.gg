# Deferred Improvements

A backlog of changes we **have decided to make** but are intentionally **not doing right now** — usually because a smaller, correct fix already shipped and the larger improvement is a refactor, new DB object, or scope we don't want to fold into the current branch.

This is **not** a wish list or a "maybe someday" pile. Every entry here is something we agreed is worth doing; it's parked with enough context to pick up cleanly later.

## How to use this file

- Add an entry when a review or design discussion lands on "do the small fix now, the bigger one later."
- Keep each entry self-contained: a future reader (human or agent) should be able to act on it without re-deriving the context.
- When an item ships, move it to **Completed** (with the PR/commit) rather than deleting it — the history is useful.
- The `tracking-deferred-work` skill manages this file. Invoke it to add, update, or complete entries.

## Entry format

```md
### <short imperative title>

- **Status:** Open | In progress | Completed (<commit/PR>)
- **Area:** <package/path or domain>
- **Logged:** <YYYY-MM-DD> (<source — PR #, review round, design chat>)
- **Context:** Why this came up and what the current behavior is.
- **Shipped instead:** The smaller fix we made now (with commit if known).
- **Deferred improvement:** The larger change to make later, concretely.
- **Why deferred:** The trade-off that made us park it.
- **References:** files, PRs, related entries.
```

---

## Open

### Route `searchPlayers` alt reads through a public-allowlist view/RPC

- **Status:** Open
- **Area:** `packages/supabase/src/queries/players.ts`, public player directory (`/api/players/search`, `/players`)
- **Logged:** 2026-06-15 (PR #357, Copilot review round 7)
- **Context:** `searchPlayers` powers the public directory and runs under a service-role client (RLS bypassed) on `/api/players/search`. It reads the `alts` base table directly. Pre-revoke, RLS silently filtered private alts; under service-role it does not, so private alts could leak into public results.
- **Shipped instead:** Explicit `.eq("is_public", true)` filters on the three `alts` reads in `searchPlayers` (username search, format-filter resolution, primary-alt fetch) + exclusion of users with no public alt. Commit on PR #357.
- **Deferred improvement:** Route the public directory's alt reads through a dedicated **public-allowlist view or RPC** (e.g. `public_alts` view that pre-filters `is_public = true`, or an RPC that returns only directory-safe columns). This centralizes the public-safety guarantee in one DB object instead of relying on every query author to remember the `is_public` filter — defense-in-depth against the next service-role caller forgetting it.
- **Why deferred:** Requires a new DB object + migration + repointing callers; the inline `is_public` filters fully close the leak now without that surface area.
- **References:** `packages/supabase/src/queries/players.ts` (`searchPlayers`); related to the realtime/anon-revoke split in `.claude/rules/architecture.md` (Query Routing by Bucket).

### Source public team species from `tournament_team_sheets` (not `teams`/`team_pokemon`)

- **Status:** Open
- **Area:** `packages/supabase/src/queries/tournaments.ts` (`getPlayerTournamentHistory`), `/api/players/tournaments`
- **Logged:** 2026-06-15 (PR #357, Copilot review round 7)
- **Context:** `getPlayerTournamentHistory` returns team species by reading `team_pokemon` (joined to `pokemon`) for a player's registration `team_id`s. On the public `/api/players/tournaments` route it runs under service-role (RLS bypassed), which could leak species for private teams. The same function also serves the authed dashboard (`teams-sub-table.tsx`) where a user legitimately sees their own private teams via RLS.
- **Shipped instead:** A `publicOnly` option on `getPlayerTournamentHistory`. The public service-role route passes `publicOnly: true`, which first resolves `teams.is_public = true` and restricts the `team_pokemon` read to those team IDs. The authed dashboard caller omits the flag and keeps RLS-based own-team access. Commit on PR #357.
- **Deferred improvement:** For the public path, source team species from **`tournament_team_sheets`** (the public team-sheet table that is the intended public-data boundary for revealed teams) instead of reading `teams`/`team_pokemon` at all. This aligns the public read with the open-team-sheet product boundary and removes the public route's dependency on the private team tables entirely.
- **Why deferred:** It's a larger refactor of the query's data source (different table, different shape, mapping work); the `publicOnly` filter closes the leak now with a minimal, well-contained change.
- **References:** `packages/supabase/src/queries/tournaments.ts` (`getPlayerTournamentHistory`); `tournament_team_sheets` schema; `.claude/rules/usage-data-sources.md` (public-tournament-data boundary).

### Chunk the unbounded `.in()` lists in `getPlayerTournamentHistory`

- **Status:** Open
- **Area:** `packages/supabase/src/queries/tournaments.ts` (`getPlayerTournamentHistory`)
- **Logged:** 2026-06-15 (PR #357, security-reviewer pass on the round-7 fixes)
- **Context:** `getPlayerTournamentHistory` builds `.in("team_id", …)` against `team_pokemon` (pre-existing) and, in the new `publicOnly` branch, `.in("id", registrationTeamIds)` against `teams`. Both are unbounded id lists. For a player with many tournament registrations, the list can overflow the PostgREST URI limit → `{ error: "URI too long" }`. The error is thrown (not silent), so it surfaces as a hard error rather than dropped rows — but it still breaks the page for prolific players. This is the same class as the `fetchInChunks` gotcha in the root `CLAUDE.md`.
- **Shipped instead:** Nothing yet — the `publicOnly` privacy fix landed on PR #357 without addressing chunking (pre-existing on the non-publicOnly path; the security review confirmed it's a scale concern, not a privacy leak).
- **Deferred improvement:** Wrap both `.in()` queries with `fetchInChunks` (the reference helper already used in `packages/supabase/src/queries/players.ts`) so the lists split into ≤100-id chunks and merge.
- **Why deferred:** Not a privacy issue and only reproduces at scale (hundreds of teams for one player); out of scope for the round-7 privacy fix. Cheap to do when touched next.
- **References:** `packages/supabase/src/queries/tournaments.ts` (`getPlayerTournamentHistory`); `fetchInChunks` in `packages/supabase/src/queries/players.ts`; root `CLAUDE.md` "Chunk unbounded Supabase `.in()` filters" gotcha.

---

## Completed

_(none yet — move shipped entries here with their commit/PR.)_
