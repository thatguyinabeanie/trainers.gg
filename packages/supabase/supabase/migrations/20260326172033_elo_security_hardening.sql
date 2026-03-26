-- Migration: elo_security_hardening
-- Hardens all SECURITY DEFINER ELO functions:
--   1. Pins search_path to prevent search-path manipulation attacks.
--   2. Revokes direct EXECUTE on admin-only functions from unprivileged roles.
--
-- peak_rating is intentionally monotonic: it reflects the highest rating
-- a player has ever achieved and is NOT rolled back when a result is
-- corrected. This is a product decision — peak is a historical high-water
-- mark, not a derived value of current tournament state.

-- ─────────────────────────────────────────────
-- 1. Pin search_path on all SECURITY DEFINER functions
-- ─────────────────────────────────────────────

-- Core ELO helper (called from SECURITY DEFINER contexts — also harden it)
ALTER FUNCTION public.apply_elo_result(bigint, text, numeric, numeric)
  SET search_path = 'public';

-- Deprecated tournament-completion batch function (superseded by per-match trigger)
ALTER FUNCTION public.compute_tournament_elo(bigint)
  SET search_path = 'public';

-- Deprecated tournament-completion trigger wrapper
ALTER FUNCTION public.trigger_elo_on_tournament_complete()
  SET search_path = 'public';

-- Per-match ELO trigger (active)
ALTER FUNCTION public.trigger_elo_on_match_complete()
  SET search_path = 'public';

-- Admin recalculation function (active)
ALTER FUNCTION public.recalculate_tournament_elo(bigint)
  SET search_path = 'public';

-- Result-correction auto-recalculate trigger (active)
ALTER FUNCTION public.trigger_elo_on_result_correction()
  SET search_path = 'public';

-- ─────────────────────────────────────────────
-- 2. Restrict direct EXECUTE on admin-only functions
--    Trigger functions are invoked by the trigger mechanism (service role),
--    not by end users directly. The batch/recalc functions could be called
--    directly to rewrite ratings — restrict to service role only.
-- ─────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.compute_tournament_elo(bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_tournament_elo(bigint) FROM PUBLIC;
