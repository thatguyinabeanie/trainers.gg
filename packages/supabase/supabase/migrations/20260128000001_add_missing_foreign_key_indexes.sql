-- Add indexes for unindexed foreign keys
-- Addresses: unindexed_foreign_keys performance advisors
--
-- Foreign keys without covering indexes can cause performance issues:
-- - Slow DELETE operations on parent tables (must scan child table)
-- - Slow JOIN operations when querying by foreign key column
--
-- Note: We do NOT drop "unused" indexes reported by the linter because
-- those statistics are from a fresh local database. In production,
-- these indexes may be actively used by real queries.

-- ============================================================================
-- organization_invitations
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_org_invitations_invited_by_user
  ON public.organization_invitations (invited_by_user_id);

-- ============================================================================
-- organization_requests
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_org_requests_created_org
  ON public.organization_requests (created_organization_id);

CREATE INDEX IF NOT EXISTS idx_org_requests_requested_by_alt
  ON public.organization_requests (requested_by_alt_id);

CREATE INDEX IF NOT EXISTS idx_org_requests_reviewed_by_alt
  ON public.organization_requests (reviewed_by_alt_id);

-- ============================================================================
-- role_permissions
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission
  ON public.role_permissions (permission_id);

-- ============================================================================
-- tournament_events
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tournament_events_created_by
  ON public.tournament_events (created_by);

-- ============================================================================
-- tournament_invitations
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tournament_invitations_invited_by_alt
  ON public.tournament_invitations (invited_by_alt_id);

CREATE INDEX IF NOT EXISTS idx_tournament_invitations_registration
  ON public.tournament_invitations (registration_id);

-- ============================================================================
-- tournament_matches
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tournament_matches_staff_resolved_by
  ON public.tournament_matches (staff_resolved_by);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_winner_alt
  ON public.tournament_matches (winner_alt_id);

-- ============================================================================
-- tournament_opponent_history
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_opponent_history_alt
  ON public.tournament_opponent_history (alt_id);

CREATE INDEX IF NOT EXISTS idx_opponent_history_opponent_alt
  ON public.tournament_opponent_history (opponent_alt_id);

-- ============================================================================
-- tournament_pairings
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tournament_pairings_alt1
  ON public.tournament_pairings (alt1_id);

CREATE INDEX IF NOT EXISTS idx_tournament_pairings_alt2
  ON public.tournament_pairings (alt2_id);

CREATE INDEX IF NOT EXISTS idx_tournament_pairings_match
  ON public.tournament_pairings (match_id);

-- ============================================================================
-- tournament_registration_pokemon
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reg_pokemon_pokemon
  ON public.tournament_registration_pokemon (pokemon_id);

-- ============================================================================
-- tournament_registrations
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_registrations_rental_verified_by
  ON public.tournament_registrations (rental_team_photo_verified_by);

CREATE INDEX IF NOT EXISTS idx_registrations_team
  ON public.tournament_registrations (team_id);

-- ============================================================================
-- tournament_standings
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tournament_standings_alt
  ON public.tournament_standings (alt_id);

-- ============================================================================
-- tournaments
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tournaments_archived_by
  ON public.tournaments (archived_by);

CREATE INDEX IF NOT EXISTS idx_tournaments_current_phase
  ON public.tournaments (current_phase_id);

CREATE INDEX IF NOT EXISTS idx_tournaments_template
  ON public.tournaments (template_id);

-- ============================================================================
-- user_group_roles
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_group_roles_group_role
  ON public.user_group_roles (group_role_id);

-- ============================================================================
-- waitlist
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_waitlist_converted_user
  ON public.waitlist (converted_user_id);
