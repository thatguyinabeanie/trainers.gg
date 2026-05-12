-- =============================================================================
-- Create limitless.organizers table
-- =============================================================================
-- Stores tournament organizer entities from Limitless.
-- Currently just metadata (name, slug, profile URL).
--
-- FUTURE: These organizers will be linked to trainers.gg communities
-- via a foreign key (e.g., community_id UUID REFERENCES public.communities(id)).
-- When that happens, the link allows us to:
--   - Show a community's external tournament history
--   - Auto-associate imported tournaments with the hosting community
--   - Surface organizer reputation/activity across platforms
--
-- Do NOT delete this table or its columns thinking they are unused —
-- they are the foundation for community ↔ external-data integration.
-- =============================================================================

-- Create the organizers table
CREATE TABLE IF NOT EXISTS limitless.organizers (
  id              int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Limitless numeric organizer ID (unique, stable identifier from their API)
  limitless_id    int NOT NULL UNIQUE,
  -- Display name (may change over time, last-seen value from API)
  name            text NOT NULL,
  -- Limitless organizer logo/avatar URL (optional)
  logo_url        text,

  -- FUTURE: link to trainers.gg community
  -- community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS (read-only for authenticated, write via service_role only)
ALTER TABLE limitless.organizers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read organizers" ON limitless.organizers;
CREATE POLICY "Authenticated users can read organizers"
  ON limitless.organizers FOR SELECT
  TO authenticated
  USING (true);

-- Add organizer_id FK to tournaments (nullable — backfill will populate existing rows)
ALTER TABLE limitless.tournaments
  ADD COLUMN IF NOT EXISTS organizer_id int REFERENCES limitless.organizers(id) ON DELETE SET NULL;

-- Index for joining tournaments → organizers
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer_id
  ON limitless.tournaments(organizer_id)
  WHERE organizer_id IS NOT NULL;

-- Grant access to authenticated role (read-only)
GRANT SELECT ON limitless.organizers TO authenticated;

-- Comment on table for future developers
COMMENT ON TABLE limitless.organizers IS
  'Limitless tournament organizers. Will be linked to trainers.gg communities in a future migration (community_id FK).';
COMMENT ON COLUMN limitless.organizers.limitless_id IS
  'Stable numeric organizer ID from the Limitless API (organizer.id field).';
COMMENT ON COLUMN limitless.tournaments.organizer_id IS
  'FK to limitless.organizers. NULL for tournaments imported before organizer table existed — backfill via limitless-sync cron.';
