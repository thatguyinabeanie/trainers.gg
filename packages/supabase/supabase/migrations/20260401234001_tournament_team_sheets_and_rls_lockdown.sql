-- =============================================================================
-- Tournament Team Sheets (OTS Snapshots)
-- =============================================================================
--
-- Public OTS (Open Team Sheet) snapshot data. One row per Pokemon per player
-- per tournament. Only contains VGC OTS-format fields: species, ability, item,
-- tera type, and moves. EVs, IVs, nature, gender, shininess are intentionally
-- excluded — players keep those private.
--
-- DESIGN DECISIONS:
-- 1. Snapshots are created ONLY at tournament start, for seeded (checked-in)
--    players. Before that, zero snapshot data exists — eliminates accidental leaks.
-- 2. USING(true) on SELECT is intentional — if a row exists, it's public.
--    This includes anonymous users. The security boundary is WHEN snapshots are
--    created (at tournament start), not column-level or role-level gating.
-- 3. One flat table (not parent + child) for query simplicity.
--    Group by (tournament_id, registration_id) for a full team sheet.
-- 4. 'format' column stores Showdown format IDs (e.g., gen9vgc2026regi) for
--    per-format analytics. Can add Postgres LIST partitioning later if needed.
-- 5. INSERT/UPDATE/DELETE restricted to service role — only the system creates
--    snapshots, never users directly.
-- 6. alt_id and team_id use RESTRICT (default) on delete — snapshot rows are
--    historical records and should not be silently deleted if the source data
--    changes. Deletion of alts/teams with snapshots must be handled explicitly.

CREATE TABLE IF NOT EXISTS tournament_team_sheets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tournament_id bigint NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  registration_id bigint NOT NULL REFERENCES tournament_registrations(id) ON DELETE CASCADE,
  alt_id bigint NOT NULL REFERENCES alts(id),
  team_id bigint NOT NULL REFERENCES teams(id),
  format text NOT NULL,
  position integer NOT NULL CHECK (position >= 1 AND position <= 6),
  species text NOT NULL,
  ability text NOT NULL,
  held_item text,
  tera_type text,
  move1 text NOT NULL,
  move2 text,
  move3 text,
  move4 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- A player cannot have two Pokemon in the same slot for the same tournament
  UNIQUE (tournament_id, registration_id, position)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tts_tournament_registration
  ON tournament_team_sheets (tournament_id, registration_id);
CREATE INDEX IF NOT EXISTS idx_tts_tournament_alt
  ON tournament_team_sheets (tournament_id, alt_id);
CREATE INDEX IF NOT EXISTS idx_tts_format_species
  ON tournament_team_sheets (format, species);

-- RLS: existence = public (snapshots only created when meant to be visible)
ALTER TABLE tournament_team_sheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament team sheets are public" ON tournament_team_sheets;
CREATE POLICY "Tournament team sheets are public"
  ON tournament_team_sheets FOR SELECT
  USING (true);

-- Only service role can write (system creates snapshots at tournament start)
DROP POLICY IF EXISTS "Service role manages team sheets" ON tournament_team_sheets;
CREATE POLICY "Service role manages team sheets"
  ON tournament_team_sheets FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- =============================================================================
-- Lock down pokemon table — drop USING(true), replace with scoped policy
-- =============================================================================
--
-- Previously pokemon was world-readable. Now restricted to:
-- 1. Pokemon belonging to teams owned by the current user
-- 2. Pokemon belonging to public teams (is_public = true)

DROP POLICY IF EXISTS "Pokemon viewable via teams" ON pokemon;

CREATE POLICY "Pokemon viewable via own or public teams"
  ON pokemon FOR SELECT USING (
    id IN (
      SELECT tp.pokemon_id FROM team_pokemon tp
      WHERE tp.team_id IN (
        SELECT t.id FROM teams t
        WHERE t.created_by IN (
          SELECT a.id FROM alts a WHERE a.user_id = (SELECT auth.uid())
        )
      )
    )
    OR id IN (
      SELECT tp.pokemon_id FROM team_pokemon tp
      WHERE tp.team_id IN (
        SELECT t.id FROM teams t WHERE t.is_public = true
      )
    )
  );

-- =============================================================================
-- Lock down team_pokemon table — drop USING(true), replace with scoped policy
-- =============================================================================

DROP POLICY IF EXISTS "Team pokemon viewable" ON team_pokemon;

CREATE POLICY "Team pokemon viewable via own or public teams"
  ON team_pokemon FOR SELECT USING (
    team_id IN (
      SELECT t.id FROM teams t
      WHERE t.created_by IN (
        SELECT a.id FROM alts a WHERE a.user_id = (SELECT auth.uid())
      )
    )
    OR team_id IN (
      SELECT t.id FROM teams t WHERE t.is_public = true
    )
  );

-- =============================================================================
-- Update teams consolidated policy — remove open team sheets condition
-- =============================================================================
--
-- The old policy had 4 conditions. Condition #3 (open team sheets) exposed
-- full private team records for tournaments with open_team_sheets=true.
-- Now removed — OTS data is served from tournament_team_sheets instead.

DROP POLICY IF EXISTS "Teams are viewable" ON teams;

CREATE POLICY "Teams are viewable"
  ON teams FOR SELECT USING (
    -- Public teams (user explicitly chose to make public)
    is_public = true
    -- Own teams
    OR created_by IN (
      SELECT a.id FROM alts a WHERE a.user_id = (SELECT auth.uid())
    )
    -- Own tournament teams (can always see teams you registered with)
    OR id IN (
      SELECT tr.team_id
      FROM tournament_registrations tr
      WHERE tr.alt_id IN (
        SELECT a.id FROM alts a WHERE a.user_id = (SELECT auth.uid())
      )
      AND tr.team_id IS NOT NULL
    )
  );

-- =============================================================================
-- Drop staff team viewing policies — staff read from snapshots now
-- =============================================================================

DROP POLICY IF EXISTS "staff_view_tournament_teams" ON teams;
DROP POLICY IF EXISTS "staff_view_tournament_team_pokemon" ON team_pokemon;
DROP POLICY IF EXISTS "staff_view_tournament_pokemon" ON pokemon;
