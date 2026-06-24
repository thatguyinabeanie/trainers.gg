"use client";

/**
 * use-unified-teams.ts
 *
 * Merges DB-backed account teams (via TanStack Query) with localStorage
 * drafts into one unified list, and routes each mutation to the correct
 * backend:
 *
 *   - "local-*" ids   → useLocalDrafts() store (localStorage)
 *   - "acct-*" ids    → Server Actions + optimistic TanStack Query patch
 *
 * Optimistic updates snapshot the EnrichedAccountTeam[] cache and roll back
 * on any action failure, then invalidate the query key so the server state
 * re-syncs regardless.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { logError } from "@trainers/utils";
import { type ActionResult } from "@trainers/validators";

import { fetchEnrichedAccountTeams } from "@/lib/data/enriched-teams";
import { useSupabase } from "@/lib/supabase";
import { addTeamToFolderAction, removeTeamFromFolderAction } from "@/actions/team-folders";
import { deleteTeamAction, setTeamFlagsAction } from "@/actions/teams";

import {
  type EnrichedAccountTeam,
  parseAccountTeamId,
  toAccountRecord,
} from "./account-team-record";
import { type LocalDraftRecord } from "./local-drafts-types";
import { teamKeys } from "../team-query-keys";
import { useLocalDrafts } from "./use-local-drafts";

// =============================================================================
// Public types
// =============================================================================

export interface UseUnifiedTeamsArgs {
  userId: string | null;
  initialAccountTeams?: EnrichedAccountTeam[];
}

export interface UseUnifiedTeamsReturn {
  /** Merged account + local records, sorted by updatedAt descending. */
  drafts: LocalDraftRecord[];
  /** True once the initial localStorage hydration is complete. */
  hydrated: boolean;
  /** True while the account-teams query is in-flight for a signed-in user. */
  accountLoading: boolean;
  /** Error from the account-teams query, or null. */
  accountError: Error | null;
  /** Trigger a fresh fetch of the account-teams query. */
  refetchAccount: () => void;
  /** Always creates a LOCAL draft (account creation is a separate flow). */
  createDraft: (init?: { name?: string; format?: string }) => LocalDraftRecord;
  /** Delete by id — routes to the appropriate backend. */
  deleteDraft: (id: string) => void;
  /** Pin or unpin — routes to the appropriate backend. */
  pinDraft: (id: string, pinned: boolean) => void;
  /** Archive or unarchive — routes to the appropriate backend. */
  archiveDraft: (id: string, archived: boolean) => void;
  /** Set manual sort-order (null resets to updatedAt order) — routes to the appropriate backend. */
  setDraftSortOrder: (id: string, order: number | null) => void;
  /**
   * Toggle folder membership for a draft.
   * For account teams the folderId must start with "dbfolder-"; local drafts
   * accept any folder id handled by the local store.
   */
  toggleDraftFolder: (id: string, folderId: string) => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Returns a merged, sorted list of account teams and local drafts, plus
 * mutation helpers that dispatch to the right backend.
 */
export function useUnifiedTeams(args: UseUnifiedTeamsArgs): UseUnifiedTeamsReturn {
  const local = useLocalDrafts();
  const supabase = useSupabase();
  const qc = useQueryClient();

  const key = teamKeys.enriched(args.userId ?? "anon");

  const accountQuery = useQuery({
    queryKey: key,
    queryFn: () => fetchEnrichedAccountTeams(supabase, args.userId!),
    enabled: args.userId != null,
    initialData: args.userId != null ? args.initialAccountTeams : undefined,
    staleTime: 30_000,
  });

  // Map account teams to the canonical LocalDraftRecord shape.
  const accountRecords = (accountQuery.data ?? []).map(toAccountRecord);

  // Merge and sort by updatedAt descending — React Compiler handles memoization.
  const drafts = [...accountRecords, ...local.drafts].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  );

  const accountLoading = args.userId != null && accountQuery.isLoading;
  const accountError = (accountQuery.error as Error | null) ?? null;

  function refetchAccount(): void {
    void accountQuery.refetch();
  }

  // =============================================================================
  // Private helpers — optimistic patch + action runner
  // =============================================================================

  /**
   * Optimistically patch a single EnrichedAccountTeam in the query cache.
   * Returns a rollback function that restores the previous cache state.
   */
  function patchAccount(
    acctId: number,
    updater: (t: EnrichedAccountTeam) => EnrichedAccountTeam
  ): () => void {
    const prev = qc.getQueryData<EnrichedAccountTeam[]>(key);
    qc.setQueryData<EnrichedAccountTeam[]>(key, (cur) =>
      (cur ?? []).map((t) => (t.team.id === acctId ? updater(t) : t))
    );
    return () => qc.setQueryData(key, prev);
  }

  /**
   * Optimistically remove a team from the query cache.
   * Returns a rollback function that restores the previous cache state.
   */
  function removeAccount(acctId: number): () => void {
    const prev = qc.getQueryData<EnrichedAccountTeam[]>(key);
    qc.setQueryData<EnrichedAccountTeam[]>(key, (cur) =>
      (cur ?? []).filter((t) => t.team.id !== acctId)
    );
    return () => qc.setQueryData(key, prev);
  }

  /**
   * Await a Server Action, roll back on failure, always re-sync the cache.
   */
  async function run(
    action: Promise<ActionResult<void>>,
    rollback: () => void
  ): Promise<void> {
    try {
      const res = await action;
      if (!res.success) {
        rollback();
        toast.error(res.error);
      }
    } catch (e) {
      rollback();
      logError("unifiedTeams.mutate", e);
      toast.error("Something went wrong.");
    } finally {
      void qc.invalidateQueries({ queryKey: key });
    }
  }

  // =============================================================================
  // Mutation routing
  // =============================================================================

  function createDraft(init?: { name?: string; format?: string }): LocalDraftRecord {
    return local.createDraft(init);
  }

  function deleteDraft(id: string): void {
    const acctId = parseAccountTeamId(id);
    if (acctId == null) {
      local.deleteDraft(id);
      return;
    }
    const rollback = removeAccount(acctId);
    void run(deleteTeamAction(acctId), rollback);
  }

  function pinDraft(id: string, pinned: boolean): void {
    const acctId = parseAccountTeamId(id);
    if (acctId == null) {
      local.pinDraft(id, pinned);
      return;
    }
    const rollback = patchAccount(acctId, (t) => ({ ...t, pinned }));
    void run(setTeamFlagsAction(acctId, { pinned }), rollback);
  }

  function archiveDraft(id: string, archived: boolean): void {
    const acctId = parseAccountTeamId(id);
    if (acctId == null) {
      local.archiveDraft(id, archived);
      return;
    }
    const rollback = patchAccount(acctId, (t) => ({ ...t, archived }));
    void run(setTeamFlagsAction(acctId, { archived }), rollback);
  }

  function setDraftSortOrder(id: string, order: number | null): void {
    const acctId = parseAccountTeamId(id);
    if (acctId == null) {
      local.setDraftSortOrder(id, order);
      return;
    }
    const rollback = patchAccount(acctId, (t) => ({ ...t, sortOrder: order }));
    void run(setTeamFlagsAction(acctId, { sortOrder: order }), rollback);
  }

  function toggleDraftFolder(id: string, folderId: string): void {
    const acctId = parseAccountTeamId(id);
    if (acctId == null) {
      local.toggleDraftFolder(id, folderId);
      return;
    }

    // Account teams only support DB-backed folders.
    if (!folderId.startsWith("dbfolder-")) {
      toast.error("Move this team to a synced folder.");
      return;
    }

    const numericFolderId = Number(folderId.slice("dbfolder-".length));

    // Determine current folder membership from the cached record.
    const cached = (qc.getQueryData<EnrichedAccountTeam[]>(key) ?? []).find(
      (t) => t.team.id === acctId
    );
    const alreadyMember = cached?.folderIds.includes(folderId) ?? false;

    if (alreadyMember) {
      // Optimistically remove from folderIds.
      const rollback = patchAccount(acctId, (t) => ({
        ...t,
        folderIds: t.folderIds.filter((fid_) => fid_ !== folderId),
      }));
      void run(removeTeamFromFolderAction(numericFolderId, acctId), rollback);
    } else {
      // Optimistically add to folderIds.
      const rollback = patchAccount(acctId, (t) => ({
        ...t,
        folderIds: [...t.folderIds, folderId],
      }));
      void run(addTeamToFolderAction(numericFolderId, acctId), rollback);
    }
  }

  return {
    drafts,
    hydrated: local.hydrated,
    accountLoading,
    accountError,
    refetchAccount,
    createDraft,
    deleteDraft,
    pinDraft,
    archiveDraft,
    setDraftSortOrder,
    toggleDraftFolder,
  };
}
