-- ============================================================================
-- Migration: Make limitless RLS policies idempotent
--
-- The original limitless schema migration used CREATE POLICY without
-- DROP POLICY IF EXISTS guards. This causes failures when migrations
-- are replayed on preview branches. This migration drops and recreates
-- all 6 read-only policies idempotently.
-- ============================================================================

-- tournaments
DROP POLICY IF EXISTS "Anyone can read tournaments" ON limitless.tournaments;
CREATE POLICY "Anyone can read tournaments"
  ON limitless.tournaments FOR SELECT
  TO authenticated, anon
  USING (true);

-- phases
DROP POLICY IF EXISTS "Anyone can read phases" ON limitless.phases;
CREATE POLICY "Anyone can read phases"
  ON limitless.phases FOR SELECT
  TO authenticated, anon
  USING (true);

-- players
DROP POLICY IF EXISTS "Anyone can read players" ON limitless.players;
CREATE POLICY "Anyone can read players"
  ON limitless.players FOR SELECT
  TO authenticated, anon
  USING (true);

-- standings
DROP POLICY IF EXISTS "Anyone can read standings" ON limitless.standings;
CREATE POLICY "Anyone can read standings"
  ON limitless.standings FOR SELECT
  TO authenticated, anon
  USING (true);

-- team_pokemon
DROP POLICY IF EXISTS "Anyone can read team_pokemon" ON limitless.team_pokemon;
CREATE POLICY "Anyone can read team_pokemon"
  ON limitless.team_pokemon FOR SELECT
  TO authenticated, anon
  USING (true);

-- match_results
DROP POLICY IF EXISTS "Anyone can read match_results" ON limitless.match_results;
CREATE POLICY "Anyone can read match_results"
  ON limitless.match_results FOR SELECT
  TO authenticated, anon
  USING (true);
