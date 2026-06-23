"use client";

/**
 * use-folders.ts
 *
 * React hook for reading and mutating the local folders store (manual + smart).
 *
 * useFolders — lists all folders; hydrates from localStorage on mount;
 * exposes create/rename/delete mutations that keep React state in sync with
 * the underlying store module.
 *
 * SSR-safe: the store returns empty values on the server, and hydration happens
 * only in the mount effect (matching the useLocalDrafts pattern).
 */

import { useState, useEffect } from "react";
import {
  listManualFolders,
  listSmartFolders,
  createManualFolder,
  renameManualFolder,
  deleteManualFolder,
  createSmartFolder,
  deleteSmartFolder,
} from "./local-folders-store";
import { SEEDED_SMART_FOLDERS } from "./local-folders-store";
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
   * are constants, not stored in localStorage.
   */
  smartFolders: SmartFolder[];
  /** True once the initial hydration from localStorage is complete. */
  hydrated: boolean;
  /**
   * Create a new manual folder with the given name.
   * Persists immediately and updates state.
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
   * Persists immediately and updates state.
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
 * Hydrates from localStorage on mount; exposes CRUD mutations that keep
 * React state in sync with the store.
 *
 * Smart folders always include the seeded defaults first; user-created smart
 * folders follow in insertion order.
 */
export function useFolders(): UseFoldersReturn {
  const [manualFolders, setManualFolders] = useState<ManualFolder[]>([]);
  // Pre-populate with seeded smart folders so they are available before hydration
  const [smartFolders, setSmartFolders] = useState<SmartFolder[]>(
    SEEDED_SMART_FOLDERS
  );
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrate from localStorage after mount to avoid SSR mismatch
    setManualFolders(listManualFolders());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrate from localStorage after mount to avoid SSR mismatch
    setSmartFolders(listSmartFolders());
    setHydrated(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Manual folder mutations
  // ---------------------------------------------------------------------------

  function handleCreateManualFolder(name: string): ManualFolder {
    const folder = createManualFolder(name);
    setManualFolders((prev) => [...prev, folder]);
    return folder;
  }

  function handleRenameManualFolder(id: string, name: string): void {
    renameManualFolder(id, name);
    setManualFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name } : f))
    );
  }

  function handleDeleteManualFolder(id: string): void {
    deleteManualFolder(id);
    setManualFolders((prev) => prev.filter((f) => f.id !== id));
  }

  // ---------------------------------------------------------------------------
  // Smart folder mutations
  // ---------------------------------------------------------------------------

  function handleCreateSmartFolder(
    name: string,
    criteria: Predicate[]
  ): SmartFolder {
    const folder = createSmartFolder(name, criteria);
    setSmartFolders((prev) => [...prev, folder]);
    return folder;
  }

  function handleDeleteSmartFolder(id: string): void {
    deleteSmartFolder(id);
    // Seeded folders remain in state regardless (deleteSmartFolder is a no-op
    // for seeded ids, so we only remove non-seeded folders from state)
    setSmartFolders((prev) =>
      prev.filter((f) => f.id !== id || f.isSeeded)
    );
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
