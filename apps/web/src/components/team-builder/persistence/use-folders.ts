"use client";

/**
 * use-folders.ts
 *
 * React hook for reading and mutating folders (manual + smart).
 *
 * useFolders(userId?) — signature is BACKWARD COMPATIBLE:
 * - When userId is null/undefined (or omitted): local + seeded behavior only,
 *   fully synchronous, exactly as before. No TanStack Query involved.
 * - When userId is provided: merges DB-backed folders on top of local ones.
 *   Manual DB folders get "dbfolder-<id>" ids; smart DB folders get
 *   "dbsmart-<id>" ids. CRUD mutations route to the DB (with optimistic
 *   updates + rollback on error) when the folder id carries the db prefix,
 *   or when userId is set for new creations.
 *
 * id-prefix discipline:
 *   local manual        → "folder-*"
 *   DB manual           → "dbfolder-<numeric-id>"
 *   local smart         → "smart-*" / "smart-seed-*"
 *   DB smart            → "dbsmart-<numeric-id>"
 *
 * SSR-safe: server snapshots return empty manual folders and seeded-only
 * smart folders (same as before). `hydrated` stays = useIsClient().
 *
 * Replaces the old setState-in-effect hydration pattern with
 * useSyncExternalStore + useIsClient() per react-patterns.md.
 */

import { useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getTeamFoldersForUser,
  getSmartFoldersForUser,
} from "@trainers/supabase";
import { getErrorMessage, logError } from "@trainers/utils";

import { useSupabase } from "@/lib/supabase";
import {
  createTeamFolderAction,
  renameTeamFolderAction,
  deleteTeamFolderAction,
  createSmartFolderAction,
  deleteSmartFolderAction,
} from "@/actions/team-folders";

import {
  subscribe,
  getManualSnapshot,
  getManualServerSnapshot,
  getSmartSnapshot,
  getSmartServerSnapshot,
  createManualFolder as localCreateManualFolder,
  renameManualFolder as localRenameManualFolder,
  deleteManualFolder as localDeleteManualFolder,
  createSmartFolder as localCreateSmartFolder,
  deleteSmartFolder as localDeleteSmartFolder,
} from "./local-folders-store";
import { useIsClient } from "@/hooks/use-is-client";
import { type ManualFolder, type SmartFolder } from "./local-folders-types";
import { type Predicate } from "../landing/search-types";
import { folderKeys } from "../team-query-keys";

// =============================================================================
// Return type
// =============================================================================

export interface UseFoldersReturn {
  /** All manual folders in insertion order. Empty until `hydrated`. */
  manualFolders: ManualFolder[];
  /**
   * All smart folders: seeded defaults first, then user-created.
   * Seeded folders are available immediately (before hydration) because they
   * are returned by getSmartServerSnapshot().
   */
  smartFolders: SmartFolder[];
  /** True once the initial hydration from localStorage is complete. */
  hydrated: boolean;
  /**
   * Create a new manual folder with the given name.
   * When userId is set: calls DB action + optimistic update; else local only.
   *
   * @param name - Display name for the new folder.
   * @returns The created ManualFolder (best-effort temp object for DB path).
   */
  createManualFolder: (name: string) => ManualFolder;
  /**
   * Rename an existing manual folder.
   * Routes to DB when id starts with "dbfolder-", else local.
   *
   * @param id   - Folder id to rename.
   * @param name - New display name.
   */
  renameManualFolder: (id: string, name: string) => void;
  /**
   * Delete an existing manual folder.
   * Routes to DB when id starts with "dbfolder-", else local.
   *
   * @param id - Folder id to remove.
   */
  deleteManualFolder: (id: string) => void;
  /**
   * Create a new user smart folder with the given name and criteria.
   * When userId is set: calls DB action + optimistic update; else local only.
   *
   * @param name     - Display name for the smart folder.
   * @param criteria - Predicates defining the membership rule.
   * @returns The created SmartFolder (best-effort temp object for DB path).
   */
  createSmartFolder: (name: string, criteria: Predicate[]) => SmartFolder;
  /**
   * Delete a user smart folder by id.
   * Routes to DB when id starts with "dbsmart-", else local (no-op for seeded).
   *
   * @param id - Smart folder id to remove.
   */
  deleteSmartFolder: (id: string) => void;
}

// =============================================================================
// DB cache shape (stored in TanStack Query cache)
// =============================================================================

interface DbFolderCache {
  manual: ManualFolder[];
  smart: SmartFolder[];
}

// =============================================================================
// useFolders
// =============================================================================

/**
 * Hook that manages all folders (manual + smart).
 *
 * When userId is null/undefined (or omitted): purely local + seeded behavior
 * — no network calls, no TanStack Query, identical to the previous version.
 *
 * When userId is provided: DB folders are fetched via TanStack Query and merged
 * on top of the local snapshot. CRUD operations route to DB actions (with
 * optimistic updates and rollback on failure) or the local store depending on
 * the folder id prefix.
 */
export function useFolders(userId?: string | null): UseFoldersReturn {
  const localManual = useSyncExternalStore(
    subscribe,
    getManualSnapshot,
    getManualServerSnapshot
  );
  const localSmart = useSyncExternalStore(
    subscribe,
    getSmartSnapshot,
    getSmartServerSnapshot
  );
  const hydrated = useIsClient();

  const supabase = useSupabase();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // DB fetch — only runs when userId is provided
  // ---------------------------------------------------------------------------

  const queryKey = folderKeys.all(userId ?? "anon");

  const { data: dbData } = useQuery<DbFolderCache>({
    queryKey,
    enabled: userId != null,
    staleTime: 60_000,
    queryFn: async () => {
      const [rawManual, rawSmart] = await Promise.all([
        getTeamFoldersForUser(supabase),
        getSmartFoldersForUser(supabase),
      ]);
      const manual: ManualFolder[] = rawManual.map((f) => ({
        id: `dbfolder-${f.id}`,
        name: f.name,
        createdAt: f.created_at ?? "",
      }));
      const smart: SmartFolder[] = rawSmart.map((f) => ({
        id: `dbsmart-${f.id}`,
        name: f.name,
        // criteria jsonb shape: { version: number, predicates: Predicate[] }
        criteria: ((f.criteria as { predicates?: Predicate[] } | null)?.predicates ?? []) as Predicate[],
        isSeeded: f.is_seeded ?? false,
      }));
      return { manual, smart };
    },
  });

  // ---------------------------------------------------------------------------
  // Merged folder lists
  // ---------------------------------------------------------------------------

  const dbManual = dbData?.manual ?? [];
  const dbSmart = dbData?.smart ?? [];

  // Local seeded smart folders always come first; then local user-created;
  // then DB-backed ones (non-seeded from DB are appended after local).
  const manualFolders: ManualFolder[] = [...localManual, ...dbManual];
  const smartFolders: SmartFolder[] = [...localSmart, ...dbSmart];

  // ---------------------------------------------------------------------------
  // Cache helpers
  // ---------------------------------------------------------------------------

  function getCachedDb(): DbFolderCache {
    return queryClient.getQueryData<DbFolderCache>(queryKey) ?? { manual: [], smart: [] };
  }

  function setCachedDb(next: DbFolderCache): void {
    queryClient.setQueryData<DbFolderCache>(queryKey, next);
  }

  function invalidateDb(): void {
    void queryClient.invalidateQueries({ queryKey });
  }

  // ---------------------------------------------------------------------------
  // Manual folder mutations
  // ---------------------------------------------------------------------------

  function handleCreateManualFolder(name: string): ManualFolder {
    // No userId → local path (unchanged behavior)
    if (!userId) {
      return localCreateManualFolder(name);
    }

    // DB path: optimistic append → call action → invalidate on settle
    const tempId = `dbfolder-pending-${name.length}`;
    const tempFolder: ManualFolder = {
      id: tempId,
      name,
      createdAt: new Date().toISOString(),
    };
    const prev = getCachedDb();
    setCachedDb({ ...prev, manual: [...prev.manual, tempFolder] });

    createTeamFolderAction(name)
      .then((result) => {
        if (!result.success) {
          // Roll back optimistic entry
          setCachedDb(prev);
          toast.error(result.error);
        }
      })
      .catch((err: unknown) => {
        setCachedDb(prev);
        toast.error(getErrorMessage(err, "Failed to create folder"));
        logError("useFolders.createManualFolder", err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        invalidateDb();
      });

    return tempFolder;
  }

  function handleRenameManualFolder(id: string, name: string): void {
    if (id.startsWith("dbfolder-")) {
      const numericId = Number(id.slice(9));
      const prev = getCachedDb();
      // Optimistic patch
      setCachedDb({
        ...prev,
        manual: prev.manual.map((f) => (f.id === id ? { ...f, name } : f)),
      });
      renameTeamFolderAction(numericId, name)
        .then((result) => {
          if (!result.success) {
            setCachedDb(prev);
            toast.error(result.error);
          }
        })
        .catch((err: unknown) => {
          setCachedDb(prev);
          toast.error(getErrorMessage(err, "Failed to rename folder"));
          logError("useFolders.renameManualFolder", err instanceof Error ? err : new Error(String(err)));
        })
        .finally(() => {
          invalidateDb();
        });
    } else {
      localRenameManualFolder(id, name);
    }
  }

  function handleDeleteManualFolder(id: string): void {
    if (id.startsWith("dbfolder-")) {
      const numericId = Number(id.slice(9));
      const prev = getCachedDb();
      // Optimistic removal
      setCachedDb({
        ...prev,
        manual: prev.manual.filter((f) => f.id !== id),
      });
      deleteTeamFolderAction(numericId)
        .then((result) => {
          if (!result.success) {
            setCachedDb(prev);
            toast.error(result.error);
          }
        })
        .catch((err: unknown) => {
          setCachedDb(prev);
          toast.error(getErrorMessage(err, "Failed to delete folder"));
          logError("useFolders.deleteManualFolder", err instanceof Error ? err : new Error(String(err)));
        })
        .finally(() => {
          invalidateDb();
        });
    } else {
      localDeleteManualFolder(id);
    }
  }

  // ---------------------------------------------------------------------------
  // Smart folder mutations
  // ---------------------------------------------------------------------------

  function handleCreateSmartFolder(
    name: string,
    criteria: Predicate[]
  ): SmartFolder {
    // No userId → local path (unchanged behavior)
    if (!userId) {
      return localCreateSmartFolder(name, criteria);
    }

    const tempId = `dbsmart-pending-${name.length}`;
    const tempFolder: SmartFolder = {
      id: tempId,
      name,
      criteria,
      isSeeded: false,
    };
    const prev = getCachedDb();
    setCachedDb({ ...prev, smart: [...prev.smart, tempFolder] });

    createSmartFolderAction(name, { version: 1, predicates: criteria })
      .then((result) => {
        if (!result.success) {
          setCachedDb(prev);
          toast.error(result.error);
        }
      })
      .catch((err: unknown) => {
        setCachedDb(prev);
        toast.error(getErrorMessage(err, "Failed to create smart folder"));
        logError("useFolders.createSmartFolder", err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        invalidateDb();
      });

    return tempFolder;
  }

  function handleDeleteSmartFolder(id: string): void {
    if (id.startsWith("dbsmart-")) {
      const numericId = Number(id.slice(8));
      const prev = getCachedDb();
      setCachedDb({
        ...prev,
        smart: prev.smart.filter((f) => f.id !== id),
      });
      deleteSmartFolderAction(numericId)
        .then((result) => {
          if (!result.success) {
            setCachedDb(prev);
            toast.error(result.error);
          }
        })
        .catch((err: unknown) => {
          setCachedDb(prev);
          toast.error(getErrorMessage(err, "Failed to delete smart folder"));
          logError("useFolders.deleteSmartFolder", err instanceof Error ? err : new Error(String(err)));
        })
        .finally(() => {
          invalidateDb();
        });
    } else {
      localDeleteSmartFolder(id);
    }
  }

  return {
    manualFolders,
    smartFolders,
    hydrated,
    createManualFolder: handleCreateManualFolder,
    renameManualFolder: handleRenameManualFolder,
    deleteManualFolder: handleDeleteManualFolder,
    createSmartFolder: handleCreateSmartFolder,
    deleteSmartFolder: handleDeleteSmartFolder,
  };
}
