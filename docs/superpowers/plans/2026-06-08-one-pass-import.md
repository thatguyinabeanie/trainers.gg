# One-Pass Import (RK9 roster+teams · Limitless full import) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (or executing-plans). Steps use checkbox (`- [ ]`).

**Goal:** Make a **single-row Import** fully import an event in one pass — RK9 scrapes **roster + teams** in one action, Limitless runs the **full tournament import** immediately (not just enqueue). Bulk **Import matching / Import all** keep enqueuing for the background worker (which already imports each item fully). This also fixes the "**Complete · 0 teams**" RK9 status bug (no roster-only intermediate to mislabel).

**Branch:** `trainers-data-import-tweaks` (already checked out; the 1000-row pagination fix `581bf3c` is already on it).

**Architecture:** RK9 one-pass is client orchestration of existing actions (`scrapeRk9Roster` → the already-looping `handleScrapeTeams`). Limitless one-pass is a new server action wrapping the existing `importTournament` (the same work `processOne` does per queue item). Status derivation is tightened so an event isn't "imported"/"complete" with zero teams when team lists were expected.

**Tech Stack:** Next.js server actions, React 19 (no manual memoization), `@trainers/data-sources` (`importTournament`, `fetchTournamentData`), Jest.

---

## Decisions (confirmed with user)

- **Single-row Import** (the per-row button) → **immediate full one-pass** import.
- **Bulk Import matching / Import all** → **enqueue** (Limitless `queueTournamentForImport`); the background worker imports each fully in one pass. No change to bulk's scalable queue model.
- **RK9 "Complete · 0 teams" is a status bug** — 0 teams imported must not read as Complete/Imported when team lists were expected.

## Open items

1. **RK9 background worker — RESOLVED (align it too).** The RK9 auto-import worker is the CLI at **`tools/data-import/src/cli.ts`** (gated by the `rk9_backend_auto_import` site-config flag), not a Supabase edge function. Task 4 below updates it so background + manual behave identically (roster+teams in one pass per event).
2. **Limitless single full-import timeout (runtime check):** one tournament's `importTournament` (fetch standings/teams + insert) is the same unit the worker does per tick, so it fits in a serverless invocation. Confirm no per-tournament event is large enough to risk the function timeout; if so, fall back to enqueue for that one.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/web/src/actions/limitless.ts` | Modify | New `importLimitlessTournament(id)` — full one-pass import (service client → `fetchTournamentData` + `importTournament`), `ActionResult`-wrapped, admin-gated |
| `apps/web/src/actions/__tests__/limitless.test.ts` | Modify | Tests for the new action (success, not-admin, error) |
| `apps/web/src/components/admin/external-data.tsx` | Modify | `handleImport` (single) → one-pass per source; keep `handleImportMatching/All` enqueuing; status counts unaffected |
| `apps/web/src/components/admin/external-data-row-actions.tsx` | Modify | One **Import** per importable row; no roster/teams re-import branch |
| `apps/web/src/components/admin/display-status.ts` / `limitless-status.ts` (RK9 normalize) | Modify | RK9: 0-teams-when-expected ≠ imported/complete |
| `apps/web/src/actions/rk9.ts` | Modify (maybe) | Stop writing `import_status="complete"` when 0 teams imported + team lists were expected (root-cause of bug B) |
| `apps/web/src/components/admin/__tests__/external-data.test.tsx` | Modify | Single Import dispatches one-pass per source; bulk still enqueues |

---

## Task 1: Limitless single-tournament full-import action

**Files:** `apps/web/src/actions/limitless.ts`, `apps/web/src/actions/__tests__/limitless.test.ts`

- [ ] **Step 1: Write the failing test** — in `limitless.test.ts`, mock `@trainers/data-sources` `fetchTournamentData` + `importTournament` (and the supabase client). Assert `importLimitlessTournament("t1")` (a) rejects when not admin, (b) on success calls `importTournament` with the fetched data and returns `{ success:true, data:{ imported:true } }` (shape to match `importTournament`'s return), (c) returns `{ success:false }` on a thrown error.

- [ ] **Step 2: Run it — confirm FAIL** (`importLimitlessTournament` undefined).

- [ ] **Step 3: Implement** in `actions/limitless.ts` (mirror the existing admin-gate pattern from `queueTournamentForImport`):
```ts
/**
 * Fully import ONE Limitless tournament in a single pass (fetch + insert),
 * the same work the queue worker does per item — used by the manual per-row
 * Import action so the admin doesn't have to queue + wait.
 */
export async function importLimitlessTournament(
  tournamentId: string
): Promise<ActionResult<{ imported: boolean }>> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };
    if (!(await isSiteAdmin())) return { success: false, error: "Requires site admin" };
    const apiKey = process.env.LIMITLESS_API_KEY;
    if (!apiKey) return { success: false, error: "LIMITLESS_API_KEY not configured" };
    const supabase = createServiceRoleClient();
    // Mark importing so the UI reflects state immediately.
    await supabase.schema("limitless").from("tournaments")
      .update({ import_status: "importing", import_requested_at: new Date().toISOString(), import_error: null })
      .eq("tournament_id", tournamentId);
    const data = await fetchTournamentData(tournamentId, apiKey);
    const result = await importTournament(supabase, data /*, …match processOne's call*/);
    return { success: true, data: { imported: true } };
  } catch (e) {
    return { success: false, error: getErrorMessage(e, "Failed to import tournament") };
  }
}
```
> Read `processOne` (`packages/data-sources/src/limitless/import.ts:579`) to match the EXACT `fetchTournamentData` + `importTournament` call (args, how it sets `import_status`/`data_imported_at`/`import_error` on success/failure) so the action mirrors the worker's behavior — including writing `import_status="completed"` + `data_imported_at` on success and the failure/`import_attempts` handling.

- [ ] **Step 4: Run tests — PASS. Step 5: Commit.**

---

## Task 2: Per-row Import → one-pass dispatch

**Files:** `apps/web/src/components/admin/external-data.tsx`, `external-data-row-actions.tsx`

- [ ] **Step 1:** Add an RK9 one-pass orchestrator in `external-data.tsx`:
```ts
async function handleImportRk9(eventId: string) {
  await handleScrapeRoster(eventId);     // existing — scrapes roster
  await handleScrapeTeams(eventId);      // existing — already loops team batches to completion
}
```
Rewrite `handleImport(row)` so the SINGLE per-row action is one-pass:
```ts
async function handleImport(row: UnifiedRow) {
  if (row.source === "limitless") {
    await handleImportLimitlessOne(row.limitless!.tournament_id); // calls importLimitlessTournament + refresh
    return;
  }
  await handleImportRk9(row.rk9!.event_id);
}
```
Add `handleImportLimitlessOne` (wraps `importLimitlessTournament`, toggles `queuingIds`, toasts on error, bumps `refreshKey`).

- [ ] **Step 2:** Keep `handleImportMatching` / `handleImportAll` ENQUEUING (bulk) — they must NOT call the new one-pass `handleImport`. Point them at the queue path: Limitless rows → `batchQueueTournaments(ids)` (existing); RK9 rows → leave pending for the worker (or keep the existing matching behavior — see Open Item 1). Add a `queueImportMatching`/`queueImportAll` that enqueues rather than reusing the now-one-pass `handleImport`.

- [ ] **Step 3:** `RowActions`: a single **Import** button for importable rows (`displayStatus === "pending" || "failed"`). Remove the RK9 "roster ready → Import again for teams" path — one Import does both. Keep RK9 **Reset**. Imported rows show ✓.

- [ ] **Step 4:** Typecheck + admin tests; reconcile any test asserting the two-step RK9 flow (now one click). Commit.

---

## Task 3: Fix RK9 "Complete · 0 teams" status (bug B)

**Files:** `apps/web/src/actions/rk9.ts`, RK9 status derivation

- [ ] **Step 1:** Root cause — in `rk9.ts`, the roster path (≈ line 488) writes `import_status="complete", has_team_lists:false, teams_imported_count:0` when there's nothing to scrape, and the teams path writes `complete` on `allImported` even if `importedCount===0`. Change so **`complete` is only written when teams were actually imported OR the event genuinely has no team lists** (distinguish "no lists available" from "lists expected but 0 imported"). For the "lists expected but 0 imported" case, leave status as `failed`/`teams` (retryable), not `complete`.

- [ ] **Step 2:** Defense-in-depth in the display layer — in RK9 status derivation (`normalizeRk9Status` / `deriveDisplayStatus`), a row with `import_status==="complete"` but `has_team_lists && teams_imported_count===0` should NOT render as Imported/Complete (render as in-progress/needs-import so the Import action shows). Add a unit test for this in `display-status.test.ts`.

- [ ] **Step 3:** Typecheck + tests + commit.

---

## Task 4: RK9 background worker — roster+teams in one pass

**Files:** `tools/data-import/src/cli.ts` (+ any RK9 import helper it calls)

The CLI worker (run on a schedule, gated by `rk9_backend_auto_import`) currently advances events through roster → teams across separate runs. Align it with the manual action so each event it picks is imported fully in one pass.

- [ ] **Step 1:** Read `tools/data-import/src/cli.ts` to find the RK9 import loop — how it selects the next event and whether it calls roster then teams separately. Note how it imports shared logic (it may reuse `@trainers/data-sources` rk9 import or the same scrape functions).
- [ ] **Step 2:** Change the per-event handling so a picked RK9 event runs **roster, then teams to completion**, in one pass (mirror `handleImportRk9`: roster → loop team batches). Reuse the shared rk9 import function rather than duplicating batch logic.
- [ ] **Step 3:** Apply the same "0 teams ≠ complete" rule (Task 3) here — don't mark an event `complete` if team lists were expected but 0 imported.
- [ ] **Step 4:** Run the data-import package's checks (`pnpm --filter <data-import pkg> typecheck`/tests if present). Commit.

> Verify whether the manual RK9 scrape actions (`apps/web/src/actions/rk9.ts`) and this CLI share a common rk9-import module. If they do, fix the one-pass + 0-teams logic THERE (Task 3) so both inherit it and this task is just wiring; if not, apply the change in both, keeping behavior identical.

---

## Task 5: Integration tests + Playwright verification

- [ ] **Step 1:** `external-data.test.tsx` — assert: clicking a single RK9 row's **Import** triggers roster THEN teams (both rk9 action mocks fire); clicking a single Limitless row's **Import** calls `importLimitlessTournament` (not `queueTournamentForImport`); **Import matching** still enqueues (`batchQueueTournaments`/queue path), not the one-pass action.
- [ ] **Step 2:** typecheck + lint + full admin/limitless suites green. Commit.
- [ ] **Step 3:** Playwright on the preview deploy (or local): single RK9 Import on a small event → goes pending→importing→imported with teams in one action, no "Complete · 0 teams"; single Limitless Import → imports immediately (importing→imported), no queue wait; bulk Import matching → rows go queued and drain via the worker.

---

## Verification Checklist

- [ ] Single RK9 Import does roster + teams in one click (no second click for teams).
- [ ] Single Limitless Import fully imports immediately (no queue-and-wait).
- [ ] Bulk Import matching/all still enqueue → worker drains.
- [ ] No RK9 row shows "Complete" with 0 teams when team lists were expected.
- [ ] Typecheck, lint, admin + limitless + display-status tests green.
- [ ] RK9 worker (`tools/data-import/src/cli.ts`) also does roster+teams in one pass per event.
