-- Team Builder Landing — Phase 2 schema
-- Adds per-team landing flags (pinned/archived/sort_order), manual folders,
-- folder membership, and smart folders (saved queries). All new tables are
-- owner-scoped via RLS. Also hardens the existing teams UPDATE policy with a
-- WITH CHECK to close a latent owner-reassignment hole, and adds a
-- reorder_teams RPC for batched Custom-order persistence.

-- =============================================================================
-- 1. Per-team landing flags
-- =============================================================================
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS sort_order integer;

-- =============================================================================
-- 2. Harden teams UPDATE policy: add WITH CHECK so an owner cannot reassign
--    created_by to an alt they do not own via a raw PostgREST update.
--    (transferTeamAction remains the app-level move path; this is defense in depth.)
-- =============================================================================
DROP POLICY IF EXISTS "Users can update own teams" ON public.teams;
CREATE POLICY "Users can update own teams" ON public.teams
  FOR UPDATE TO authenticated
  USING (created_by IN (SELECT id FROM public.alts WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (created_by IN (SELECT id FROM public.alts WHERE user_id = (SELECT auth.uid())));

-- =============================================================================
-- 3. Manual folders (owned per-USER, span alts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.team_folders (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_team_folders_owner ON public.team_folders(owner_user_id);

ALTER TABLE public.team_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own folders" ON public.team_folders;
CREATE POLICY "Users manage own folders" ON public.team_folders
  FOR ALL TO authenticated
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

-- =============================================================================
-- 4. Folder membership (many-to-many team <-> folder)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.team_folder_members (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  folder_id  bigint NOT NULL REFERENCES public.team_folders(id) ON DELETE CASCADE,
  team_id    bigint NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_folder_members_unique UNIQUE (folder_id, team_id)
);
CREATE INDEX IF NOT EXISTS idx_tfm_folder ON public.team_folder_members(folder_id);
CREATE INDEX IF NOT EXISTS idx_tfm_team   ON public.team_folder_members(team_id);

ALTER TABLE public.team_folder_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own folder members" ON public.team_folder_members;
CREATE POLICY "Users read own folder members" ON public.team_folder_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_folders f
    WHERE f.id = team_folder_members.folder_id
      AND f.owner_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users delete own folder members" ON public.team_folder_members;
CREATE POLICY "Users delete own folder members" ON public.team_folder_members
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_folders f
    WHERE f.id = team_folder_members.folder_id
      AND f.owner_user_id = (SELECT auth.uid())
  ));

-- INSERT: caller must own BOTH the folder AND the team (cross-table ownership,
-- mirrors the add_pokemon_to_team teams->alts->auth.uid() chain).
DROP POLICY IF EXISTS "Users add own teams to own folders" ON public.team_folder_members;
CREATE POLICY "Users add own teams to own folders" ON public.team_folder_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_folders f
      WHERE f.id = team_folder_members.folder_id
        AND f.owner_user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.alts a ON a.id = t.created_by
      WHERE t.id = team_folder_members.team_id
        AND a.user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- 5. Smart folders (saved queries). criteria = versioned flat-AND predicate list,
--    interpreted client-side; stored opaquely here.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.smart_folders (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  criteria      jsonb NOT NULL DEFAULT '{"version":1,"predicates":[]}'::jsonb,
  is_seeded     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_smart_folders_owner ON public.smart_folders(owner_user_id);

ALTER TABLE public.smart_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own smart folders" ON public.smart_folders;
CREATE POLICY "Users manage own smart folders" ON public.smart_folders
  FOR ALL TO authenticated
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

-- =============================================================================
-- 6. reorder_teams RPC — batched Custom-order persistence (parity with
--    reorder_team_pokemon). Ownership enforced by the UPDATE's WHERE clause
--    (rows not owned by the caller are silently skipped).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reorder_teams(p_orders jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_orders)
  LOOP
    UPDATE public.teams t
    SET sort_order = (v_item->>'sort_order')::integer
    WHERE t.id = (v_item->>'team_id')::bigint
      AND t.created_by IN (
        SELECT id FROM public.alts WHERE user_id = (SELECT auth.uid())
      );
  END LOOP;
END;
$$;

-- Name anon + authenticated explicitly: the baseline ALTER DEFAULT PRIVILEGES
-- grants EXECUTE to anon directly, so REVOKE ... FROM PUBLIC alone leaves that
-- role-specific grant intact (same gap 20260611020600 closes for other RPCs).
REVOKE ALL ON FUNCTION public.reorder_teams(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_teams(jsonb) TO authenticated;
