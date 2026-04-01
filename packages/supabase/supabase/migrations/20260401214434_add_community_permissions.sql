-- Add permission settings to communities table
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_mode text NOT NULL DEFAULT 'anyone'
    CHECK (registration_mode IN ('anyone', 'invite_only')),
  ADD COLUMN IF NOT EXISTS staff_invite_mode text NOT NULL DEFAULT 'owner_only'
    CHECK (staff_invite_mode IN ('owner_only', 'admins_and_above')),
  ADD COLUMN IF NOT EXISTS team_sheet_visibility text NOT NULL DEFAULT 'after_tournament'
    CHECK (team_sheet_visibility IN ('after_tournament', 'after_round', 'never'));

COMMENT ON COLUMN communities.is_public IS 'Whether community appears in /communities public listing';
COMMENT ON COLUMN communities.registration_mode IS 'Who can register for tournaments: anyone or invite_only';
COMMENT ON COLUMN communities.staff_invite_mode IS 'Who can invite staff: owner_only or admins_and_above';
COMMENT ON COLUMN communities.team_sheet_visibility IS 'When team sheets become public: after_tournament, after_round, or never';
