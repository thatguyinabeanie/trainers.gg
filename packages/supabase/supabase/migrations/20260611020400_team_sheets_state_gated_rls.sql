-- =============================================================================
-- RLS AUDIT #2 — State-gated SELECT policy for tournament_team_sheets
-- =============================================================================
--
-- PROBLEM (audit finding #2 / decision #2):
--   tournament_team_sheets previously had `SELECT USING (true)` — any row that
--   existed was world-readable, including anonymous users. Open Team Sheets
--   (OTS) snapshots could therefore be scraped mid-tournament, BEFORE the
--   intended reveal, defeating the purpose of OTS. The original design relied
--   solely on WHEN rows are inserted (at tournament start) as the boundary,
--   which is too coarse: it cannot distinguish "active but hidden until reveal"
--   from "active and public", and offers no per-state gating at all.
--
-- FIX: Replace USING(true) with a STATE-GATED policy that encodes this matrix,
--   joining each sheet to its tournament (direct tournament_id FK) for the
--   status + open_team_sheets state, and to alts for owner identity:
--
--   ┌────────────────────────────────┬──────────────────────────────────────┐
--   │ Tournament state                │ Who can SELECT a sheet                │
--   ├────────────────────────────────┼──────────────────────────────────────┤
--   │ Pre-start (draft / upcoming)    │ Sheet OWNER ONLY.                     │
--   │                                 │ Explicitly NO organizers/staff —      │
--   │                                 │ staff can themselves be competitors,  │
--   │                                 │ so granting them early access would   │
--   │                                 │ leak opponents' sheets (anti-leak).   │
--   ├────────────────────────────────┼──────────────────────────────────────┤
--   │ Active + open_team_sheets=true  │ PUBLIC (anyone, incl. anon —          │
--   │                                 │ spectators).                          │
--   ├────────────────────────────────┼──────────────────────────────────────┤
--   │ Active + open_team_sheets=false │ Owner + tournament STAFF (judges      │
--   │                                 │ need sheets to adjudicate disputes).  │
--   ├────────────────────────────────┼──────────────────────────────────────┤
--   │ Completed                       │ PUBLIC (regardless of open flag).     │
--   └────────────────────────────────┴──────────────────────────────────────┘
--
-- 'paused' is treated identically to 'active': a paused tournament has already
--   started (snapshot rows exist) and its OTS-reveal expectations match the
--   active state. 'cancelled' is treated as pre-start (owner-only) — a cancelled
--   tournament never reached a public-reveal state, so its sheets should not
--   become world-readable.
--
-- Owner is the user behind alt_id (alts.user_id). Staff is expressed via the
--   canonical has_community_permission(community_id, 'tournament.manage') check,
--   joined through tournaments.community_id — the same form every other
--   tournament-management policy/RPC uses. That function is SECURITY DEFINER and
--   already wraps auth.uid() in (SELECT auth.uid()) internally.
--
-- All auth.uid() references use the (SELECT auth.uid()) initplan form so the
--   planner evaluates them once per query, not once per row.
-- =============================================================================

ALTER TABLE public.tournament_team_sheets ENABLE ROW LEVEL SECURITY;

-- Remove the old world-readable policy (audit #2).
DROP POLICY IF EXISTS "Tournament team sheets are public" ON public.tournament_team_sheets;

-- State-gated replacement.
DROP POLICY IF EXISTS "Team sheets visible per tournament state" ON public.tournament_team_sheets;
CREATE POLICY "Team sheets visible per tournament state"
  ON public.tournament_team_sheets FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tournaments t
      WHERE t.id = tournament_team_sheets.tournament_id
        AND (
          -- Completed: public to everyone, regardless of open_team_sheets.
          t.status = 'completed'

          -- Active/paused + open team sheets: public to everyone (spectators).
          OR (
            t.status IN ('active', 'paused')
            AND t.open_team_sheets = true
          )

          -- Active/paused + closed sheets: tournament staff (judges) only.
          -- Owner is handled by the owner branch below.
          OR (
            t.status IN ('active', 'paused')
            AND t.open_team_sheets = false
            AND public.has_community_permission(t.community_id, 'tournament.manage')
          )
        )
    )
    -- Owner: the user behind this sheet's alt can always see their OWN sheet,
    -- in EVERY state (covers pre-start draft/upcoming/cancelled owner-only access,
    -- and active-closed owner access). No staff/organizer access pre-start.
    OR tournament_team_sheets.alt_id IN (
      SELECT a.id FROM public.alts a WHERE a.user_id = (SELECT auth.uid())
    )
  );
