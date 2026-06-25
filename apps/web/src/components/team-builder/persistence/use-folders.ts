"use client";

/**
 * use-folders.ts
 *
 * React hook for reading and mutating the local folders store (manual + smart).
 *
 * useFolders — lists all folders using useSyncExternalStore; exposes
 * create/rename/delete mutations. SSR-safe: server snapshots return empty
 * manual folders and seeded-only smart folders.
 *
 * Replaces the old setState-in-effect hydration pattern with
 * useSyncExternalStore + useIsClient() per react-patterns.md.
 */

import { useSyncExternalStore } from "react";
import {
  subscribe,
  getManualSnapshot,
  getManualServerSnapshot,
  getSmartSnapshot,
  getSmartServerSnapshot,
  createManualFolder,
  renameManualFolder,
  deleteManualFolder,
  createSmartFolder,
  deleteSmartFolder,
} from "./local-folders-store";
import { useIsClient } from "@/hooks/use-is-client";
import { type ManualFolder, type SmartFolder } from "./local-folders-types";
import { type Predicate } from "../landing/search-types";

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
   * Persists immediately; subscription drives the re-render.
   *
   * @param name - Display name for the new folder.
   * @returns The created ManualFolder.
   */
  createManualFolder: (name: string) => ManualFolder;
  /**
   * Rename an existing manual folder.
   * No-op for unknown ids.
   *
   * @param id   - Folder id to rename.
   * @param name - New display name.
   */
  renameManualFolder: (id: string, name: string) => void;
  /**
   * Delete an existing manual folder.
   * No-op for unknown ids.
   *
   * @param id - Folder id to remove.
   */
  deleteManualFolder: (id: string) => void;
  /**
   * Create a new user smart folder with the given name and criteria.
   * Persists immediately; subscription drives the re-render.
   *
   * @param name     - Display name for the smart folder.
   * @param criteria - Predicates defining the membership rule.
   * @returns The created SmartFolder.
   */
  createSmartFolder: (name: string, criteria: Predicate[]) => SmartFolder;
  /**
   * Delete a user smart folder by id.
   * No-op for seeded folder ids and unknown ids.
   *
   * @param id - Smart folder id to remove.
   */
  deleteSmartFolder: (id: string) => void;
}

// =============================================================================
// useFolders
// =============================================================================

/**
 * Hook that manages all local folders (manual + smart).
 *
 * Uses `useSyncExternalStore` against the shared subscription in
 * local-folders-store.ts. The server snapshot for manual folders is `[]`;
 * the server snapshot for smart folders contains the seeded defaults.
 * `hydrated` is derived from `useIsClient()`.
 *
 * Mutators call store write fns directly — the store's `notify()` invalidates
 * the cache and triggers a re-render via the subscription.
 */
export function useFolders(): UseFoldersReturn {
  const manualFolders = useSyncExternalStore(
    subscribe,
    getManualSnapshot,
    getManualServerSnapshot
  );
  const smartFolders = useSyncExternalStore(
    subscribe,
    getSmartSnapshot,
    getSmartServerSnapshot
  );
  const hydrated = useIsClient();

  // ---------------------------------------------------------------------------
  // Manual folder mutations
  // ---------------------------------------------------------------------------

  function handleCreateManualFolder(name: string): ManualFolder {
    return createManualFolder(name);
  }

  function handleRenameManualFolder(id: string, name: string): void {
    renameManualFolder(id, name);
  }

  function handleDeleteManualFolder(id: string): void {
    deleteManualFolder(id);
  }

  // ---------------------------------------------------------------------------
  // Smart folder mutations
  // ---------------------------------------------------------------------------

  function handleCreateSmartFolder(
    name: string,
    criteria: Predicate[]
  ): SmartFolder {
    return createSmartFolder(name, criteria);
  }

  function handleDeleteSmartFolder(id: string): void {
    deleteSmartFolder(id);
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
