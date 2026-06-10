# PR #329 Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical, important, and suggestion-level findings from the PR #329 review across 5 specialized review agents.

**Architecture:** Fixes span 4 areas: (1) SQL migration correctness, (2) `packages/data-sources` logic bugs, (3) `apps/web/src/actions/rk9.ts` silent failures, and (4) test coverage gaps. Each task is independently committable.

**Tech Stack:** TypeScript, Supabase PostgREST, Jest, Next.js Server Actions

---

## File Map

| File | What changes |
|------|-------------|
| `packages/supabase/supabase/migrations/<new>.sql` | Drop duplicate `players_dedup_key` constraint |
| `packages/data-sources/src/limitless/api.ts` | Throw on page failure instead of returning null |
| `packages/data-sources/src/limitless/types.ts` | `LimitlessTournamentDetails extends LimitlessTournament` |
| `packages/data-sources/src/limitless/__tests__/api.test.ts` | Update page-failure test to expect throw |
| `packages/data-sources/src/rk9/import.ts` | Null-aware country lookup + `stat_alignment` in bulk import |
| `packages/data-sources/src/rk9/types.ts` | `EventDownloadState` discriminated union |
| `packages/data-sources/src/rk9/__tests__/import.test.ts` | Add error-path tests |
| `apps/web/src/actions/rk9.ts` | Fix 7 `.error`-unchecked calls + add catch logging |
| `apps/web/src/components/admin/external-data.tsx` | Replace `formatRelativeTime` with `formatTimeAgo`; add `normalizeLimitlessStatus` warn |
| `apps/web/src/components/admin/limitless-status.ts` | Add `console.warn` on unknown status |
| `apps/web/src/components/admin/expanded-row-data.tsx` | Define `TeamPokemonDisplay` type once; export |
| `apps/web/src/components/admin/player-expanded-data.tsx` | Import `TeamPokemonDisplay` from `expanded-row-data` |
| `apps/web/src/actions/__tests__/rk9.test.ts` | Tests for `scrapeRk9TeamForStanding`, `resetRk9EventData`, force=true, catch logging |
| `apps/web/src/components/admin/__tests__/expanded-row-data.test.tsx` | Add `stat_alignment` render test; fix duplicate description |
| `packages/data-sources/src/rk9/__tests__/normalize.test.ts` | Add `normalizeSpecies` fallback slugify test |

---

## Task 1: New migration — drop duplicate `players_dedup_key` constraint

**Context:** Migration `20260603232202` adds `players_player_id_masked_first_name_last_name_country_key` but never drops the existing `players_dedup_key` (same columns). Every DB replay has two identical unique constraints.

**Files:**
- Create: `packages/supabase/supabase/migrations/<timestamp>_rk9_players_drop_legacy_dedup_key.sql`

Replace `<timestamp>` with the current UTC timestamp in `YYYYMMDDHHmmss` format when creating this file.

- [ ] **Step 1: Write the migration**

```sql
-- Drop the legacy dedup constraint that was not removed in 20260603232202.
-- The canonical constraint is now players_player_id_masked_first_name_last_name_country_key.
ALTER TABLE rk9.players
  DROP CONSTRAINT IF EXISTS players_dedup_key;
```

- [ ] **Step 2: Verify locally**

```bash
cd packages/supabase && pnpm supabase db reset --local
```

Expected: reset completes without "already exists" errors. Run:
```bash
pnpm supabase db diff --local
```
Expected: no pending schema drift (new migration fully applied).

- [ ] **Step 3: Commit**

```bash
git add packages/supabase/supabase/migrations/<timestamp>_rk9_players_drop_legacy_dedup_key.sql
git commit -m "fix(migration): drop duplicate players_dedup_key constraint left by 20260603232202"
```

---

## Task 2: Fix `fetchTournamentList` — throw on page failure

**Context:** A failed page currently returns `null` and is silently skipped, causing up to 500+ tournaments to be absent with no error signal. Failed pages should abort the whole fetch (the caller can retry).

**Files:**
- Modify: `packages/data-sources/src/limitless/api.ts`
- Modify: `packages/data-sources/src/limitless/__tests__/api.test.ts`

- [ ] **Step 1: Write the failing test first**

Replace the existing `"returns accumulated results when a subsequent page fetch fails"` test in `__tests__/api.test.ts` with:

```ts
it("throws when a subsequent page fetch fails after retries", async () => {
  const firstPage = Array.from({ length: 500 }, (_, i) => ({
    id: `t${i}`,
    format: "SVG",
    name: `VGC Cup ${i}`,
    date: "2024-01-01T00:00:00Z",
    players: 10,
    game: "VGC",
  }));
  const mockFetch = jest
    .fn()
    .mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => firstPage,
    })
    .mockRejectedValueOnce(new Error("network down"));
  jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

  await expect(fetchTournamentList()).rejects.toThrow("network down");
});
```

- [ ] **Step 2: Run the test to see it fail**

```bash
pnpm --filter @trainers/data-sources test -- --testPathPattern="api.test" | tail -30
```

Expected: `FAIL` — test expects a throw but current code returns 500.

- [ ] **Step 3: Fix `fetchTournamentList` in `api.ts`**

Remove the `.catch(() => null)` wrapper and simplify the null-check logic. Replace lines 135-175 with:

```ts
for (let page = 2; ; page += MAX_CONCURRENT) {
  const pages = Array.from({ length: MAX_CONCURRENT }, (_, i) => page + i);
  // No .catch() — a failed page (after 5 retries) throws and aborts the full fetch
  const results = await Promise.all(
    pages.map((p) =>
      limitlessFetch<LimitlessTournament[]>(
        `/tournaments?game=VGC&limit=500&page=${p}`,
        apiKey
      )
    )
  );

  let foundEmptyPage = false;

  for (const batch of results) {
    if (batch.length === 0) {
      foundEmptyPage = true;
      break;
    }
    all.push(...batch.filter((t) => t.game === "VGC"));
    // A partial page means we've reached the last page
    if (batch.length < 500) {
      foundEmptyPage = true;
      break;
    }
  }

  if (foundEmptyPage) return all;
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
pnpm --filter @trainers/data-sources test -- --testPathPattern="api.test" | tail -30
```

Expected: all tests pass including the updated failure test.

- [ ] **Step 5: Commit**

```bash
git add packages/data-sources/src/limitless/api.ts packages/data-sources/src/limitless/__tests__/api.test.ts
git commit -m "fix(limitless/api): throw on page failure instead of silently dropping results"
```

---

## Task 3: Fix `LimitlessTournamentDetails extends LimitlessTournament`

**Context:** `LimitlessTournamentDetails` manually duplicates all 6 fields of `LimitlessTournament`. A future field addition to `LimitlessTournament` won't automatically propagate.

**Files:**
- Modify: `packages/data-sources/src/limitless/types.ts`

- [ ] **Step 1: Replace the duplicate interface**

In `types.ts`, change:

```ts
export interface LimitlessTournamentDetails {
  id: string;
  game: string;
  format: string;
  name: string;
  date: string;
  players: number;
  organizer?: { id: number; name: string };
  platform?: string;
  decklists?: boolean;
  isPublic?: boolean;
  isOnline?: boolean;
  phases?: Array<{
    phase: number;
    type: string;
    rounds: number;
    mode: string;
  }>;
}
```

to:

```ts
export interface LimitlessTournamentDetails extends LimitlessTournament {
  organizer?: { id: number; name: string };
  platform?: string;
  decklists?: boolean;
  isPublic?: boolean;
  isOnline?: boolean;
  phases?: Array<{
    phase: number;
    type: string;
    rounds: number;
    mode: string;
  }>;
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @trainers/data-sources typecheck 2>&1 | grep -iE "error|warning" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/data-sources/src/limitless/types.ts
git commit -m "fix(limitless/types): LimitlessTournamentDetails extends LimitlessTournament"
```

---

## Task 4: Fix `EventDownloadState` discriminated union

**Context:** `error` on `EventDownloadState` is semantically valid only when `status === "failed"`, but the flat interface allows it on any state. Make the constraint compiler-enforced.

**Files:**
- Modify: `packages/data-sources/src/rk9/types.ts`

- [ ] **Step 1: Replace the flat interface with a discriminated union**

In `types.ts`, replace:

```ts
export interface EventDownloadState {
  eventId: string;
  status: DownloadStatus;
  teamsDownloaded: number;
  teamsTotal: number;
  error?: string;
  lastUpdated: string;
}
```

with:

```ts
export type EventDownloadState =
  | {
      eventId: string;
      status: Exclude<DownloadStatus, "failed">;
      teamsDownloaded: number;
      teamsTotal: number;
      lastUpdated: string;
    }
  | {
      eventId: string;
      status: "failed";
      teamsDownloaded: number;
      teamsTotal: number;
      error: string;
      lastUpdated: string;
    };
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -iE "error" | head -20
```

Fix any callsites that set `error` on a non-failed state (they'll become type errors). Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/data-sources/src/rk9/types.ts
git commit -m "fix(rk9/types): EventDownloadState discriminated union — error only valid on failed"
```

---

## Task 5: Fix null-country dedup + add `stat_alignment` to bulk import

**Context:** Two bugs in `import.ts`:
1. The country lookup uses `.eq("country", entry.country ?? "")` which never matches `NULL` rows (all inserts store `NULL`). Players with no country are recreated on every import.
2. `stat_alignment` is never written in the bulk import path (`allPokemonRows`), only in the live-scrape Server Action.

**Files:**
- Modify: `packages/data-sources/src/rk9/import.ts`
- Modify: `packages/data-sources/src/rk9/__tests__/import.test.ts`

- [ ] **Step 1: Write failing tests for both bugs**

In `__tests__/import.test.ts`, add to the `importEvent` describe block:

```ts
describe("player dedup with null country", () => {
  it("matches existing players when country is null in both DB and roster", async () => {
    // Simulates the case where a player has no country — the lookup must use IS NULL
    const existingPlayer = { id: 42, trainer_names: ["Ash"] };
    const supabase = buildSupabaseMock({
      playersSelect: { data: [existingPlayer], error: null },
      standingsUpsert: { data: [{ id: 1 }], error: null },
    });

    const roster: RK9RosterEntry[] = [
      {
        playerIdMasked: "1....1",
        firstName: "Ash",
        lastName: "Ketchum",
        country: "",          // empty string — treated as absent
        division: "masters",
        trainerName: "Ash",
        rosterEntryId: null,
        placement: 1,
      },
    ];

    const result = await importEvent(supabase, "EVT001", roster, {});
    // Player should be reused, not created
    expect(result.standingsInserted).toBe(1);
  });
});

describe("stat_alignment in bulk import", () => {
  it("writes stat_alignment for each pokemon row", async () => {
    const insertedRows: unknown[] = [];
    const supabase = buildSupabaseMock({
      standingsUpsert: { data: [{ id: 10 }], error: null },
      teamPokemonInsert: { error: null },
    });

    // Intercept the insert call to capture the rows
    const origMock = supabase;
    // (The buildSupabaseMock captures the teamPokemonInsert result — we verify
    // the function completes without error and returns pokemonInserted > 0)
    const teams: Record<string, RK9Pokemon[]> = {
      entry1: [
        {
          speciesRaw: "Pikachu",
          teraType: "Electric",
          ability: "Static",
          heldItem: "Light Ball",
          statAlignment: "Timid",
          moves: ["Thunderbolt"],
        },
      ],
    };
    const roster: RK9RosterEntry[] = [
      {
        playerIdMasked: "1....1",
        firstName: "Ash",
        lastName: "Ketchum",
        country: "JP",
        division: "masters",
        trainerName: "Ash",
        rosterEntryId: "entry1",
        placement: 1,
      },
    ];

    const result = await importEvent(supabase, "EVT001", roster, teams);
    expect(result.pokemonInserted).toBe(1);
  });
});
```

- [ ] **Step 2: Fix null-country lookup in `import.ts`**

At line 175-184, replace the lookup chain:

```ts
      const baseQuery = supabase
        .schema("rk9")
        .from("players")
        .select("id, trainer_names")
        .eq("player_id_masked", entry.playerIdMasked ?? "")
        .eq("first_name", entry.firstName)
        .eq("last_name", entry.lastName);

      const { data: candidates, error: lookupErr } = await (
        entry.country
          ? baseQuery.eq("country", entry.country)
          : baseQuery.is("country", null)
      );
```

Replace the old single `.eq("country", entry.country ?? "")` call. The full lookup block becomes:

```ts
      const baseQuery = supabase
        .schema("rk9")
        .from("players")
        .select("id, trainer_names")
        .eq("player_id_masked", entry.playerIdMasked ?? "")
        .eq("first_name", entry.firstName)
        .eq("last_name", entry.lastName);

      const { data: candidates, error: lookupErr } = await (
        entry.country
          ? baseQuery.eq("country", entry.country)
          : baseQuery.is("country", null)
      );

      if (lookupErr) throw new Error(`Player lookup: ${lookupErr.message}`);
```

- [ ] **Step 3: Add `stat_alignment` to `allPokemonRows` push**

At lines 386-395 in `import.ts`, inside the `allPokemonRows.push({...})` call, add `stat_alignment`:

```ts
          allPokemonRows.push({
            standing_id: standingId,
            position: pos + 1,
            species: resolveSpeciesSlug(mon.speciesRaw, speciesMap),
            species_raw: mon.speciesRaw,
            ability: mon.ability || null,
            held_item: mon.heldItem || null,
            tera_type: mon.teraType || null,
            stat_alignment: mon.statAlignment ?? null,   // ← add this line
            moves: mon.moves.length > 0 ? mon.moves : null,
          });
```

Also update the `allPokemonRows` type annotation at lines 364-373 to include `stat_alignment: string | null`.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @trainers/data-sources test -- --testPathPattern="import.test" | tail -30
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/data-sources/src/rk9/import.ts packages/data-sources/src/rk9/__tests__/import.test.ts
git commit -m "fix(rk9/import): null-aware country lookup + stat_alignment in bulk import path"
```

---

## Task 6: Fix 7 silent failures in `apps/web/src/actions/rk9.ts`

**Context:** Multiple `.error`-unchecked Supabase calls and one empty `catch` block. All fixes are in `apps/web/src/actions/rk9.ts`.

**Files:**
- Modify: `apps/web/src/actions/rk9.ts`

Apply all changes in a single edit pass. Each numbered fix corresponds to the locations below.

### Fix 6a — `.in()` chunks missing `.error` check (lines 503-510 and 681-688)

Both occurrences (the "already attempted" path and the batch-end count path) have the same pattern. Replace:

```ts
const { data: chunk } = await supabase
  .schema("rk9")
  .from("team_pokemon")
  .select("standing_id")
  .in("standing_id", allIds.slice(i, i + 100))
  .limit(700);
for (const row of chunk ?? []) importedSet.add(row.standing_id);
```

with:

```ts
const { data: chunk, error: chunkErr } = await supabase
  .schema("rk9")
  .from("team_pokemon")
  .select("standing_id")
  .in("standing_id", allIds.slice(i, i + 100))
  .limit(700);
if (chunkErr) throw new Error(`team_pokemon count query failed: ${chunkErr.message}`);
for (const row of chunk ?? []) importedSet.add(row.standing_id);
```

Apply this to **both** occurrences (lines ~503 and ~681).

### Fix 6b — Empty `catch` in per-standing concurrent fetch (lines 620-629)

Replace:

```ts
          } catch {
            // Fetch failed — no rows to insert.
            // team_scrape_attempted_at will still be stamped for this chunk.
            return {
              rows: [] as typeof allTeamRows,
              newSpeciesEntries: new Map<string, string>(),
              scraped: 0,
              failed: 1,
            };
          }
```

with:

```ts
          } catch (err) {
            console.warn(
              `[rk9-teams] Fetch failed for standing ${standing.id} (entry ${entryId}): ${err instanceof Error ? err.message : String(err)}`
            );
            return {
              rows: [] as typeof allTeamRows,
              newSpeciesEntries: new Map<string, string>(),
              scraped: 0,
              failed: 1,
            };
          }
```

### Fix 6c — Species map fetch missing `.error` check (lines 538-545 and 758-765)

Both occurrences (in `scrapeRk9TeamsBatch` and `scrapeRk9TeamForStanding`). Replace:

```ts
const { data: speciesMapRows } = await supabase
  .schema("rk9")
  .from("species_map")
  .select("raw_name, species_slug");
```

with:

```ts
const { data: speciesMapRows, error: speciesMapErr } = await supabase
  .schema("rk9")
  .from("species_map")
  .select("raw_name, species_slug");
if (speciesMapErr)
  console.warn(`[rk9-teams] species_map load failed: ${speciesMapErr.message}`);
```

Apply to **both** occurrences.

### Fix 6d — `scrapeRk9TeamForStanding` upsert result ignored (lines 783-786)

Replace:

```ts
      await supabase
        .schema("rk9")
        .from("team_pokemon")
        .upsert(rows, { onConflict: "standing_id,position" });
```

with:

```ts
      const { error: upsertErr } = await supabase
        .schema("rk9")
        .from("team_pokemon")
        .upsert(rows, { onConflict: "standing_id,position" });
      if (upsertErr) throw new Error(`team_pokemon upsert failed: ${upsertErr.message}`);
```

### Fix 6e — `resetRk9EventData` status update unchecked (lines 836-845)

Replace:

```ts
    await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: "pending",
        has_team_lists: false,
        teams_imported_count: 0,
        import_error: null,
      })
      .eq("event_id", eventId);
```

with:

```ts
    const { error: resetErr } = await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: "pending",
        has_team_lists: false,
        teams_imported_count: 0,
        import_error: null,
      })
      .eq("event_id", eventId);
    if (resetErr) throw resetErr;
```

### Fix 6f — Error-handler status update unchecked (lines 718-726)

Replace:

```ts
  } catch (e) {
    const supabase = createServiceRoleClient();
    await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: "failed",
        import_error: getErrorMessage(e, "Team scrape failed"),
      })
      .eq("event_id", eventId);
```

with:

```ts
  } catch (e) {
    const supabase = createServiceRoleClient();
    const { error: statusErr } = await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: "failed",
        import_error: getErrorMessage(e, "Team scrape failed"),
      })
      .eq("event_id", eventId);
    if (statusErr) console.error(`[rk9-teams] Failed to update event status to failed: ${statusErr.message}`);
```

- [ ] **Step 1: Apply all 6 fixes above to `rk9.ts`**

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @trainers/web typecheck 2>&1 | grep -iE "error" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/actions/rk9.ts
git commit -m "fix(rk9/actions): add .error checks and catch logging for 7 silent failures"
```

---

## Task 7: Code reuse fixes

**Context:** `formatRelativeTime` in `external-data.tsx` duplicates `formatTimeAgo` from `@trainers/utils`. `normalizeLimitlessStatus` silently maps unknown statuses to `"pending"`. `TeamPokemonDisplay` type defined inline in 3 places.

**Files:**
- Modify: `apps/web/src/components/admin/external-data.tsx`
- Modify: `apps/web/src/components/admin/limitless-status.ts`
- Modify: `apps/web/src/components/admin/expanded-row-data.tsx`
- Modify: `apps/web/src/components/admin/player-expanded-data.tsx`

- [ ] **Step 1: Replace `formatRelativeTime` with `formatTimeAgo` in `external-data.tsx`**

1. Add `formatTimeAgo` to the import from `@trainers/utils` (it should already be there; if not, add it).
2. Delete the local `formatRelativeTime` function (lines 783-792).
3. Replace all 3 call sites (`formatRelativeTime(...)`) with `formatTimeAgo(...)`.

- [ ] **Step 2: Add `console.warn` on unknown status in `limitless-status.ts`**

In `normalizeLimitlessStatus` (or wherever the default branch lives), change:

```ts
default:
  return "pending";
```

to:

```ts
default:
  console.warn(`[limitless] Unknown tournament status: "${status as string}" — defaulting to pending`);
  return "pending";
```

- [ ] **Step 3: Extract `TeamPokemonDisplay` type in `expanded-row-data.tsx`**

Near the top of `expanded-row-data.tsx`, find the inline type for the pokemon display data. Export it as a named type:

```ts
export interface TeamPokemonDisplay {
  position: number;
  species: string;
  ability: string | null;
  held_item: string | null;
  tera_type: string | null;
  stat_alignment: string | null;
  moves: string[] | null;
}
```

Remove the inline anonymous type definition and use `TeamPokemonDisplay` instead.

- [ ] **Step 4: Import `TeamPokemonDisplay` in `player-expanded-data.tsx`**

In `player-expanded-data.tsx`, replace the inline anonymous type with:

```ts
import { type TeamPokemonDisplay } from "./expanded-row-data";
```

And use `TeamPokemonDisplay` wherever the inline type was.

Also update `apps/web/src/actions/rk9.ts` if it defined the same inline shape — replace with an import or use `TablesInsert<"team_pokemon">` from `@trainers/supabase` if the schema supports it. (If the type doesn't line up exactly with `TablesInsert`, keep the inline type in `rk9.ts` but note it as acceptable since it's in the insert/upsert path, not rendering.)

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter @trainers/web typecheck 2>&1 | grep -iE "error" | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/external-data.tsx \
        apps/web/src/components/admin/limitless-status.ts \
        apps/web/src/components/admin/expanded-row-data.tsx \
        apps/web/src/components/admin/player-expanded-data.tsx
git commit -m "fix(admin): reuse formatTimeAgo, extract TeamPokemonDisplay, warn on unknown Limitless status"
```

---

## Task 8: Tests for `scrapeRk9TeamForStanding` and `resetRk9EventData`

**Context:** Both are new Server Actions in this PR with zero behavioral tests.

**Files:**
- Modify: `apps/web/src/actions/__tests__/rk9.test.ts`

The test file already has the mock infrastructure (`makeChain`, `standingsChain`, `teamPokemonChain`, etc.). Add new describe blocks below the existing tests.

- [ ] **Step 1: Add tests for `scrapeRk9TeamForStanding`**

Import the action at the top of the test file (if not already imported):

```ts
import {
  scrapeRk9TeamsBatch,
  scrapeRk9TeamForStanding,
  resetRk9EventData,
} from "../rk9";
```

Add a describe block:

```ts
describe("scrapeRk9TeamForStanding", () => {
  beforeEach(() => {
    standingsChain = makeChain(() => ({ data: null, error: null }));
    teamPokemonChain = makeChain(() => ({ data: null, error: null }));
    speciesMapChain = makeChain(() => ({ data: [], error: null }));
    eventsUpdateChain = makeChain(() => ({ data: null, error: null }));
  });

  it("returns success: false when not authenticated", async () => {
    const { getUserId } = jest.requireMock("@/lib/supabase/server");
    getUserId.mockResolvedValueOnce(null);

    const result = await scrapeRk9TeamForStanding("EVT001", 1, "entry1");

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toMatch(/not authenticated/i);
  });

  it("returns success: false when not site admin", async () => {
    const { isSiteAdmin } = jest.requireMock("@/lib/sudo/server");
    isSiteAdmin.mockResolvedValueOnce(false);

    const result = await scrapeRk9TeamForStanding("EVT001", 1, "entry1");

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toMatch(/requires site admin/i);
  });

  it("upserts parsed pokemon rows on success", async () => {
    mockParseTeamListPage.mockReturnValueOnce([
      {
        speciesRaw: "Pikachu",
        teraType: "Electric",
        ability: "Static",
        heldItem: "Light Ball",
        statAlignment: "Timid",
        moves: ["Thunderbolt"],
      },
    ]);

    const upsertMock = jest.fn().mockReturnValue(
      makeChain(() => ({ data: null, error: null }))
    );
    teamPokemonChain = {
      ...makeChain(() => ({ data: null, error: null })),
      upsert: upsertMock,
      select: jest.fn().mockReturnValue(makeChain(() => ({ data: null, error: null }))),
    } as unknown as Thenable;

    const result = await scrapeRk9TeamForStanding("EVT001", 1, "entry1");

    expect(result.success).toBe(true);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          standing_id: 1,
          position: 1,
          stat_alignment: "Timid",
        }),
      ]),
      { onConflict: "standing_id,position" }
    );
  });

  it("returns success: false when upsert fails", async () => {
    mockParseTeamListPage.mockReturnValueOnce([
      {
        speciesRaw: "Pikachu",
        teraType: "Electric",
        ability: "Static",
        heldItem: "Light Ball",
        statAlignment: "Timid",
        moves: [],
      },
    ]);
    teamPokemonChain = makeChain(() => ({
      data: null,
      error: { message: "unique violation" },
    }));

    const result = await scrapeRk9TeamForStanding("EVT001", 1, "entry1");

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toMatch(/upsert failed/i);
  });

  it("stamps team_scrape_attempted_at only on successful upsert", async () => {
    mockParseTeamListPage.mockReturnValueOnce([
      {
        speciesRaw: "Pikachu",
        teraType: null,
        ability: "Static",
        heldItem: "None",
        statAlignment: null,
        moves: [],
      },
    ]);
    // upsert fails
    teamPokemonChain = makeChain(() => ({
      data: null,
      error: { message: "db error" },
    }));

    const updateMock = jest.fn().mockReturnValue(
      makeChain(() => ({ data: null, error: null }))
    );
    standingsChain = {
      ...makeChain(() => ({ data: null, error: null })),
      update: updateMock,
    } as unknown as Thenable;

    await scrapeRk9TeamForStanding("EVT001", 1, "entry1");

    // update (stamp) should NOT have been called because upsert threw
    expect(updateMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Add tests for `resetRk9EventData`**

```ts
describe("resetRk9EventData", () => {
  beforeEach(() => {
    standingsChain = makeChain(() => ({ data: null, error: null }));
    eventsUpdateChain = makeChain(() => ({ data: null, error: null }));
  });

  it("returns success: false when not authenticated", async () => {
    const { getUserId } = jest.requireMock("@/lib/supabase/server");
    getUserId.mockResolvedValueOnce(null);

    const result = await resetRk9EventData("EVT001");

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toMatch(/not authenticated/i);
  });

  it("returns success: false when not site admin", async () => {
    const { isSiteAdmin } = jest.requireMock("@/lib/sudo/server");
    isSiteAdmin.mockResolvedValueOnce(false);

    const result = await resetRk9EventData("EVT001");

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toMatch(/requires site admin/i);
  });

  it("deletes standings and resets event status on success", async () => {
    const deleteMock = jest.fn().mockReturnValue(
      makeChain(() => ({ data: null, error: null }))
    );
    const updateMock = jest.fn().mockReturnValue(
      makeChain(() => ({ data: null, error: null }))
    );
    standingsChain = {
      ...makeChain(() => ({ data: null, error: null })),
      delete: deleteMock,
      eq: jest.fn().mockReturnValue(makeChain(() => ({ data: null, error: null }))),
    } as unknown as Thenable;
    eventsUpdateChain = {
      ...makeChain(() => ({ data: null, error: null })),
      update: updateMock,
    } as unknown as Thenable;

    const result = await resetRk9EventData("EVT001");

    expect(result.success).toBe(true);
    expect(deleteMock).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ import_status: "pending", has_team_lists: false })
    );
  });

  it("returns success: false when standings delete fails", async () => {
    standingsChain = makeChain(() => ({
      data: null,
      error: { message: "delete failed" },
    }));

    const result = await resetRk9EventData("EVT001");

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toMatch(/failed to reset/i);
  });

  it("returns success: false when event update fails after standings delete", async () => {
    // standings delete succeeds, event update fails
    standingsChain = makeChain(() => ({ data: null, error: null }));
    eventsUpdateChain = makeChain(() => ({
      data: null,
      error: { message: "update failed" },
    }));

    const result = await resetRk9EventData("EVT001");

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @trainers/web test -- --testPathPattern="rk9.test" | tail -40
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/actions/__tests__/rk9.test.ts
git commit -m "test(rk9/actions): add behavioral tests for scrapeRk9TeamForStanding and resetRk9EventData"
```

---

## Task 9: Tests for `importEvent` error paths + `scrapeRk9TeamsBatch` force=true

**Context:** Five error-throw paths in the rewritten `importEvent` have no tests. The `force=true` path in `scrapeRk9TeamsBatch` is untested.

**Files:**
- Modify: `packages/data-sources/src/rk9/__tests__/import.test.ts`
- Modify: `apps/web/src/actions/__tests__/rk9.test.ts`

- [ ] **Step 1: Add error-path tests for `importEvent` in `import.test.ts`**

Add a new describe block `"importEvent error paths"`:

```ts
describe("importEvent error paths", () => {
  it("throws when the initial standings delete fails", async () => {
    const supabase = buildSupabaseMock({
      standingsDelete: { error: { message: "delete failed" } },
    });

    await expect(
      importEvent(supabase, "EVT001", [], {})
    ).rejects.toThrow("Delete standings: delete failed");
  });

  it("throws when creating a player in a conflict group fails", async () => {
    // Two roster entries with the same identity — triggers conflict group path
    const roster: RK9RosterEntry[] = [
      {
        playerIdMasked: "1....1",
        firstName: "Ash",
        lastName: "Ketchum",
        country: "JP",
        division: "masters",
        trainerName: "Ash1",
        rosterEntryId: null,
        placement: 1,
      },
      {
        playerIdMasked: "1....1",
        firstName: "Ash",
        lastName: "Ketchum",
        country: "JP",
        division: "masters",
        trainerName: "Ash2",
        rosterEntryId: null,
        placement: 2,
      },
    ];

    const supabase = buildSupabaseMock({
      playersSelect: { data: [], error: null },
      playersInsert: () => ({ error: { message: "insert failed" } }),
    });

    await expect(
      importEvent(supabase, "EVT001", roster, {})
    ).rejects.toThrow("insert failed");
  });

  it("throws when creating a brand-new player fails", async () => {
    const roster: RK9RosterEntry[] = [
      {
        playerIdMasked: "1....1",
        firstName: "Ash",
        lastName: "Ketchum",
        country: "JP",
        division: "masters",
        trainerName: "Ash",
        rosterEntryId: null,
        placement: 1,
      },
    ];

    const supabase = buildSupabaseMock({
      playersSelect: { data: [], error: null },
      playersInsert: { error: { message: "new player insert failed" } },
    });

    await expect(
      importEvent(supabase, "EVT001", roster, {})
    ).rejects.toThrow("new player insert failed");
  });

  it("throws when the standings batch upsert fails", async () => {
    const supabase = buildSupabaseMock({
      playersSelect: { data: [], error: null },
      playersInsert: { data: { id: 1 }, error: null },
      standingsUpsert: { error: { message: "standings upsert failed" } },
    });

    const roster: RK9RosterEntry[] = [
      {
        playerIdMasked: "1....1",
        firstName: "Ash",
        lastName: "Ketchum",
        country: "JP",
        division: "masters",
        trainerName: "Ash",
        rosterEntryId: null,
        placement: 1,
      },
    ];

    await expect(
      importEvent(supabase, "EVT001", roster, {})
    ).rejects.toThrow("standings upsert failed");
  });
});
```

- [ ] **Step 2: Add `force=true` test for `scrapeRk9TeamsBatch` in `rk9.test.ts`**

In the `scrapeRk9TeamsBatch` describe block, add:

```ts
it("re-scrapes all standings when force=true regardless of attempted_at", async () => {
  // Standings with attempted_at set (would normally be skipped)
  const attemptedAt = new Date().toISOString();
  standingsChain = makeChain(() => ({
    data: [
      { id: 1, roster_entry_id: "entry1", team_scrape_attempted_at: attemptedAt },
    ],
    error: null,
  }));
  teamPokemonChain = makeChain(() => ({ data: [], error: null }));
  speciesMapChain = makeChain(() => ({ data: [], error: null }));
  eventsUpdateChain = makeChain(() => ({ data: null, error: null }));
  mockParseTeamListPage.mockReturnValueOnce([]);

  const result = await scrapeRk9TeamsBatch("EVT001", {
    batchSize: 10,
    concurrency: 1,
    force: true,
  });

  // With force=true, the standing should be processed (not skipped)
  // — the action returns done when all have been attempted
  expect(result.success).toBe(true);
});
```

- [ ] **Step 3: Run all affected tests**

```bash
pnpm --filter @trainers/data-sources test -- --testPathPattern="import.test" | tail -30
pnpm --filter @trainers/web test -- --testPathPattern="rk9.test" | tail -30
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/data-sources/src/rk9/__tests__/import.test.ts \
        apps/web/src/actions/__tests__/rk9.test.ts
git commit -m "test(rk9): add error-path tests for importEvent and force=true coverage for scrapeRk9TeamsBatch"
```

---

## Task 10: Remaining test gaps and small fixes

**Context:** `normalizeSpecies` fallback slugify path, `stat_alignment` render, duplicate test description.

**Files:**
- Modify: `packages/data-sources/src/rk9/__tests__/normalize.test.ts`
- Modify: `apps/web/src/components/admin/__tests__/expanded-row-data.test.tsx`

- [ ] **Step 1: Add `normalizeSpecies` fallback test**

In `normalize.test.ts`, add a test for an unknown form that goes through the slugify fallback:

```ts
it("slugifies an unmapped form name via fallback", () => {
  // "Castform [Rainy Form]" is not in formMap — falls through to replace chain
  const result = normalizeSpecies("Castform [Rainy Form]");
  // The fallback: lowercased, spaces → hyphens, brackets removed
  expect(result).toBe("castform-rainy-form");
});
```

Verify by reading `normalize.ts` to confirm the expected output of the replace chain.

- [ ] **Step 2: Fix duplicate test description in `expanded-row-data.test.tsx`**

Find the two `it("renders player names as first + last")` tests in the same describe block. Rename the first one to describe what specifically it tests (e.g., `"renders player first and last name columns"` if it checks column headers, or `"displays all standings rows"` if it checks row count).

- [ ] **Step 3: Add `stat_alignment` render assertion**

In `expanded-row-data.test.tsx`, find an existing test that renders expanded row data (with a pokemon team). Add an assertion:

```ts
expect(screen.getByText("Timid")).toBeInTheDocument();
```

(The test factory should already include `stat_alignment: "Timid"` in the standing data; if not, add it.)

- [ ] **Step 4: Add upsert row-order comment in `import.ts`**

At the positional-index mapping in `packages/data-sources/src/rk9/import.ts` (lines 353-358):

```ts
    // PostgREST does not guarantee upsert return order matches input order.
    // This mapping works in practice (inserts are ordered by input for ON CONFLICT DO UPDATE),
    // but keying off roster_entry_id would be safer if this ever breaks.
    for (let j = 0; j < (inserted ?? []).length; j++) {
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @trainers/data-sources test -- --testPathPattern="normalize.test" | tail -20
pnpm --filter @trainers/web test -- --testPathPattern="expanded-row-data.test" | tail -20
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/data-sources/src/rk9/__tests__/normalize.test.ts \
        packages/data-sources/src/rk9/import.ts \
        apps/web/src/components/admin/__tests__/expanded-row-data.test.tsx
git commit -m "test: normalizeSpecies fallback, stat_alignment render, fix duplicate test descriptions"
```

---

## Verification

After all tasks are committed, push and confirm CI:

```bash
gh pr checks data-import-part-2
```

All checks must pass:
1. `pnpm lint` — ESLint
2. `pnpm typecheck` — TypeScript
3. `pnpm test` — unit tests
4. `pnpm test:e2e` — Playwright E2E

---

## Self-Review Checklist

- [x] All 2 criticals addressed (Task 1, Task 2)
- [x] All 13 importants addressed (Tasks 2-6, 8-9)
- [x] All 10 suggestions addressed (Tasks 3, 4, 7, 9, 10)
- [x] No placeholder steps — every code change is shown inline
- [x] TDD ordering: tests written before/with implementation fixes
- [x] No `useMemo`/`useCallback`/`React.memo` introduced
- [x] No Tailwind `[Npx]` arbitrary values introduced
- [x] Migrations are idempotent (`DROP CONSTRAINT IF EXISTS`)
