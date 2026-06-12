-- RLS audit finding #10: tournaments had no DELETE policy.
-- By omission, deletes were service-role-only — an implicit, undocumented contract.
-- This migration makes that contract explicit:
--   • Community staff with tournament.manage permission MAY delete draft tournaments.
--   • Published or later-status tournaments are never client-deletable; use cancel instead.
--   • Hard deletes of non-draft tournaments remain service-role only.
--
-- Permission expression mirrors "Community staff can update tournaments"
-- (source: 20260328023929_rename_organizations_to_communities.sql, line ~1030).

DROP POLICY IF EXISTS "Staff can delete draft tournaments" ON public.tournaments;

CREATE POLICY "Staff can delete draft tournaments"
  ON public.tournaments FOR DELETE TO authenticated
  USING (
    -- Only draft tournaments are ever client-deletable.
    -- Published, in-progress, or completed tournaments must use the cancel workflow;
    -- hard deletes of those records are reserved for service-role operations only.
    tournaments.status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = tournaments.community_id
        AND (
          c.owner_user_id = (SELECT auth.uid())
          OR public.has_community_permission(tournaments.community_id, 'tournament.manage')
        )
    )
  );

-- Document the delete lifecycle on the table itself so future readers don't
-- have to grep policies to understand the contract.
COMMENT ON TABLE public.tournaments IS
  'Tournaments owned by a community. '
  'Client-deletable only while status = ''draft'' (community owner or tournament.manage staff). '
  'Once published, the only client-accessible state change is cancellation; '
  'hard deletes of published/completed/cancelled records are service-role only.';
