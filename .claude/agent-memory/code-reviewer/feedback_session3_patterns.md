---
name: Session 3 recurring review patterns
description: Patterns from PR #273 team builder review — router.refresh misuse, cache invalidation gaps, non-atomic mutations
type: feedback
---

Three patterns recurred across the team builder feature (PR #273) that should be flagged in future reviews:

1. **router.refresh() vs TanStack invalidation** — team-workspace.tsx and team-strip.tsx use router.refresh() after mutations instead of queryClient.invalidateQueries(). The project memory explicitly forbids this. Watch for it in any new interactive page that uses Server Actions.

**Why:** router.refresh() causes full server re-renders, loses scroll position, and bypasses client cache. TanStack Query is required for all pages with mutations.

**How to apply:** Grep for `router.refresh()` in Client Components that also call server actions. Any match is a candidate finding.

2. **Mutation cache invalidation gaps** — updatePokemonAction and removePokemonFromTeamAction do not call invalidateTeamCaches(). The pattern of checking ALL server actions in a domain file against the cache invalidation helpers is important — it is easy to add invalidation to some mutations but miss others.

**Why:** The caching rules say cache invalidation is required at implementation time, never deferred.

**How to apply:** For every server action file, enumerate all mutations and verify each one calls an invalidation helper. Cross-reference with the CacheTags that would cover the mutated entity.

3. **Non-atomic multi-step mutations** — addPokemonToTeam does insert+insert with a compensating delete on failure instead of an RPC. The pattern of SECURITY DEFINER RPCs for multi-table writes is already established (fork_team, delete_team, reorder_team_pokemon). New mutations touching multiple tables should use the RPC pattern from the start.

**Why:** Orphaned rows under ownership-scoped RLS policies cannot be cleaned up by the owning user because the ownership chain is broken.

**How to apply:** Any mutation function in packages/supabase/src/mutations/ that does more than one write to different tables is a candidate for RPC promotion.
