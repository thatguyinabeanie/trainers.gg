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
import {
  deleteTeamAction,
  forkTeamAction,
  setTeamFlagsAction,
  transferTeamAction,
  updateTeamAction,
} from "@/actions/teams";
import { teamsApi } from "@/lib/api/teams-client";
import { toSaveLocalPayload } from "../landing/team-landing-shared";

import {
  type EnrichedAccountTeam,
  parseAccountTeamId,
  toAccountRecord,
} from "./account-team-record";
import { deleteLocalDraft } from "./local-drafts-store";
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
  /** Trigger a fresh fetch of the account-teams query and return the promise. */
  refetchAccount: () => Promise<unknown>;
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
  // ---------------------------------------------------------------------------
  // §10.2 Row-action mutators
  // ---------------------------------------------------------------------------
  /** Rename a draft / account team. */
  renameRecord: (id: string, name: string) => void;
  /**
   * Duplicate a draft into a new draft on the same alt.
   * Local → new local draft. Account → fork to the same alt; refetches.
   */
  duplicateRecord: (id: string) => void;
  /**
   * Duplicate and associate with a target alt.
   * Local → saves to the alt (keeps the local draft), then refetches.
   * Account → forks to target alt, then refetches.
   */
  duplicateRecordToAlt: (id: string, altId: number) => void;
  /**
   * Move a draft to a different alt.
   * Local → saves to the alt then deletes the local draft + refetches.
   * Account → transfers to the alt then refetches.
   */
  moveRecordToAlt: (id: string, altId: number) => void;
  /**
   * Toggle the public/private visibility of a draft.
   * Local drafts cannot be made public — shows an error toast.
   */
  makeRecordPublic: (id: string, isPublic: boolean) => void;
  /**
   * Set the deliberate local-only flag.
   * Account teams cannot be local-only — shows an error toast.
   */
  setRecordLocalOnly: (id: string, localOnly: boolean) => void;
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

  function refetchAccount(): Promise<unknown> {
    return accountQuery.refetch();
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

    // Guard: pending folders have ids like "dbfolder-pending-<hex>", which yield NaN.
    // Dispatching an action with NaN would silently fail after hitting the server.
    if (Number.isNaN(numericFolderId)) {
      toast.error("That folder is still saving — try again in a moment.");
      return;
    }

    // Determine current folder membership from the cached record.
    const cachedList = qc.getQueryData<EnrichedAccountTeam[]>(key);
    const cached = cachedList?.find((t) => t.team.id === acctId);

    // Guard: if the account query hasn't resolved yet the cached record is undefined.
    // Defaulting alreadyMember = false would always ADD — wrong when the team is
    // already a member. Wait for the query to settle instead of guessing.
    if (cached === undefined) {
      toast.error("Your teams are still loading — try again in a moment.");
      return;
    }

    const alreadyMember = cached.folderIds.includes(folderId);

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

  // ===========================================================================
  // §10.2 Row-action mutators
  // ===========================================================================

  function renameRecord(id: string, name: string): void {
    const acctId = parseAccountTeamId(id);
    if (acctId == null) {
      // Local draft — synchronous store update.
      local.renameDraft(id, name);
      return;
    }
    // Account team — optimistic patch + server action.
    const rollback = patchAccount(acctId, (t) => ({
      ...t,
      team: { ...t.team, name },
    }));
    void run(updateTeamAction(acctId, { name }), rollback);
  }

  function duplicateRecord(id: string): void {
    const acctId = parseAccountTeamId(id);
    if (acctId == null) {
      // Local draft — synchronous store duplicate.
      local.duplicateDraft(id);
      return;
    }
    // Account team — fork to the same alt, then refetch for the new row.
    const cachedList = qc.getQueryData<EnrichedAccountTeam[]>(key);
    const cached = cachedList?.find((t) => t.team.id === acctId);
    if (!cached) {
      toast.error("Your teams are still loading — try again in a moment.");
      return;
    }
    const { altId } = cached;
    void (async () => {
      try {
        const res = await forkTeamAction(acctId, altId);
        if (!res.success) {
          toast.error(res.error);
        } else {
          toast.success("Team duplicated.");
        }
      } catch (e) {
        logError("unifiedTeams.duplicateRecord", e);
        toast.error("Something went wrong.");
      } finally {
        await refetchAccount();
      }
    })();
  }

  function duplicateRecordToAlt(id: string, altId: number): void {
    const acctId = parseAccountTeamId(id);
    if (acctId == null) {
      // Local draft → save to the target alt (keeps the local draft), then refetch.
      const localRecord = drafts.find((r) => r.id === id);
      if (!localRecord) {
        toast.error("Draft not found.");
        return;
      }
      void (async () => {
        try {
          const res = await teamsApi.saveLocal(toSaveLocalPayload(localRecord, altId));
          if (!res.success) {
            toast.error(res.error);
          } else {
            toast.success("Team copied to alt.");
          }
        } catch (e) {
          logError("unifiedTeams.duplicateRecordToAlt", e);
          toast.error("Something went wrong.");
        } finally {
          await refetchAccount();
        }
      })();
      return;
    }
    // Account team → fork to target alt, then refetch.
    void (async () => {
      try {
        const res = await forkTeamAction(acctId, altId);
        if (!res.success) {
          toast.error(res.error);
        } else {
          toast.success("Team copied to alt.");
        }
      } catch (e) {
        logError("unifiedTeams.duplicateRecordToAlt", e);
        toast.error("Something went wrong.");
      } finally {
        await refetchAccount();
      }
    })();
  }

  function moveRecordToAlt(id: string, altId: number): void {
    const acctId = parseAccountTeamId(id);
    if (acctId == null) {
      // Local draft → save to alt, then delete the local draft and refetch.
      const localRecord = drafts.find((r) => r.id === id);
      if (!localRecord) {
        toast.error("Draft not found.");
        return;
      }
      void (async () => {
        try {
          const res = await teamsApi.saveLocal(toSaveLocalPayload(localRecord, altId));
          if (!res.success) {
            toast.error(res.error);
            return;
          }
          deleteLocalDraft(id);
          toast.success("Team moved to alt.");
        } catch (e) {
          logError("unifiedTeams.moveRecordToAlt", e);
          toast.error("Something went wrong.");
        } finally {
          await refetchAccount();
        }
      })();
      return;
    }
    // Account team → transfer to target alt, then refetch (structural op — no optimistic).
    void (async () => {
      try {
        const res = await transferTeamAction(acctId, altId);
        if (!res.success) {
          toast.error(res.error);
        } else {
          toast.success("Team moved to alt.");
        }
      } catch (e) {
        logError("unifiedTeams.moveRecordToAlt", e);
        toast.error("Something went wrong.");
      } finally {
        await refetchAccount();
      }
    })();
  }

  function makeRecordPublic(id: string, isPublic: boolean): void {
    const acctId = parseAccountTeamId(id);
    if (acctId == null) {
      toast.error("Save this team to an alt to make it public.");
      return;
    }
    // Account team — optimistic patch + server action.
    const rollback = patchAccount(acctId, (t) => ({
      ...t,
      team: { ...t.team, is_public: isPublic },
    }));
    void run(updateTeamAction(acctId, { is_public: isPublic }), rollback);
  }

  function setRecordLocalOnly(id: string, localOnly: boolean): void {
    const acctId = parseAccountTeamId(id);
    if (acctId == null) {
      // Local draft — synchronous store update.
      local.setDraftLocalOnly(id, localOnly);
      return;
    }
    toast.error("Synced teams already live in your account.");
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
    renameRecord,
    duplicateRecord,
    duplicateRecordToAlt,
    moveRecordToAlt,
    makeRecordPublic,
    setRecordLocalOnly,
  };
}
