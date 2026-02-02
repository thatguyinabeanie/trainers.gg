-- Fix: wrap auth.uid() in (select ...) to prevent per-row re-evaluation
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- tournament_registrations

DROP POLICY IF EXISTS "Users can register for tournaments" ON "public"."tournament_registrations";
CREATE POLICY "Users can register for tournaments"
  ON "public"."tournament_registrations"
  FOR INSERT
  WITH CHECK (
    alt_id IN (
      SELECT a.id FROM public.alts a WHERE a.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own registration" ON "public"."tournament_registrations";
CREATE POLICY "Users can update own registration"
  ON "public"."tournament_registrations"
  FOR UPDATE
  USING (
    alt_id IN (
      SELECT a.id FROM public.alts a WHERE a.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can cancel own registration" ON "public"."tournament_registrations";
CREATE POLICY "Users can cancel own registration"
  ON "public"."tournament_registrations"
  FOR DELETE
  USING (
    alt_id IN (
      SELECT a.id FROM public.alts a WHERE a.user_id = (select auth.uid())
    )
  );

-- organization_requests

DROP POLICY IF EXISTS "Users can create org requests" ON "public"."organization_requests";
CREATE POLICY "Users can create org requests"
  ON "public"."organization_requests"
  FOR INSERT
  WITH CHECK (
    requested_by_alt_id IN (
      SELECT a.id FROM public.alts a WHERE a.user_id = (select auth.uid())
    )
  );

-- team_pokemon

DROP POLICY IF EXISTS "Team owners can manage team pokemon" ON "public"."team_pokemon";
CREATE POLICY "Team owners can manage team pokemon"
  ON "public"."team_pokemon"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_pokemon.team_id
        AND t.created_by IN (
          SELECT a.id FROM public.alts a WHERE a.user_id = (select auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Team owners can delete team pokemon" ON "public"."team_pokemon";
CREATE POLICY "Team owners can delete team pokemon"
  ON "public"."team_pokemon"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_pokemon.team_id
        AND t.created_by IN (
          SELECT a.id FROM public.alts a WHERE a.user_id = (select auth.uid())
        )
    )
  );
