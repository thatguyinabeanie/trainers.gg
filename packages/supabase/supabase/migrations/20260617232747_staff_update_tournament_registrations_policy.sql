-- =============================================================================
-- Staff UPDATE policy on tournament_registrations (fix manager-write RLS gap)
-- =============================================================================
-- tournament_registrations had only an own-row UPDATE policy ("Users can update
-- own registration": alt_id ∈ caller's alts). There was NO staff/manager UPDATE
-- policy — so a tournament manager doing a DIRECT authenticated UPDATE on another
-- player's registration was silently filtered to 0 rows. Confirmed-broken paths:
--   • dropPlayer (status → 'dropped')
--   • startTournamentEnhanced (team_locked → true; teams never locked)
--   • updateRegistrationStatus non-drop status changes
-- (The management drop path via the drop_registrations SECURITY DEFINER RPC was
-- already safe; this fixes the remaining direct-write manager paths.)
--
-- This adds a staff UPDATE policy mirroring the existing staff SELECT clause
-- ("Registrations readable by owner or staff") — a manager with tournament.manage
-- for the registration's tournament's community may UPDATE it. It is ADDITIVE: the
-- own-row policy stays, so self-service updates (check-in, team submit) are
-- unaffected (a row is updatable if EITHER policy passes).
-- =============================================================================

DROP POLICY IF EXISTS "Staff can update tournament registrations"
  ON public.tournament_registrations;

CREATE POLICY "Staff can update tournament registrations"
  ON public.tournament_registrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tournaments t
      WHERE t.id = tournament_registrations.tournament_id
        AND public.has_community_permission(t.community_id, 'tournament.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tournaments t
      WHERE t.id = tournament_registrations.tournament_id
        AND public.has_community_permission(t.community_id, 'tournament.manage')
    )
  );
