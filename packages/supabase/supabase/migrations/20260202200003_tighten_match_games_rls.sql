-- Tighten match_games SELECT policy to prevent blind scoring leaks.
--
-- Previously, any authenticated user could SELECT from match_games, which
-- meant a malicious client could read alt1_selection / alt2_selection
-- before both players had submitted (bypassing the get_match_games_for_player()
-- redaction function). Now only match participants and org staff can SELECT.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view match games" ON public.match_games;

-- Replace with a restrictive policy: only match participants and org staff
CREATE POLICY "Match participants and staff can view match games"
  ON public.match_games
  FOR SELECT
  TO authenticated
  USING (
    -- Match participant
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.alts a ON a.user_id = (SELECT auth.uid())
      WHERE m.id = match_id
        AND (m.alt1_id = a.id OR m.alt2_id = a.id)
    )
    OR
    -- Org staff with tournament.manage permission
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_org_permission(t.organization_id, 'tournament.manage')
    )
  );
