/**
 * local-folders-store.ts
 *
 * Pure, SSR-safe module for managing team-builder folders in localStorage.
 * Covers both manual folders (hand-curated buckets) and smart folders
 * (saved search criteria that auto-populate).
 *
 * Mirrors the conventions of local-drafts-store.ts:
 * - SSR guard (typeof window === "undefined" → no-op / empty returns)
 * - Corrupt-tolerant read (logs, clears, returns empty store on parse errors)
 * - Versioned envelope (LocalFoldersStoreV1)
 * - local-<base36> id generator (prefix "folder-" for manual, "smart-" for smart)
 *
 * Seeded smart folders are NOT persisted; they are provided by the
 * SEEDED_SMART_FOLDERS constant and merged into listSmartFolders() at read time.
 */

import { logError } from "@trainers/utils";
import { toast } from "sonner";
import {
  type LocalFoldersStoreV1,
  type ManualFolder,
  type SmartFolder,
} from "./local-folders-types";
import { type Predicate } from "../landing/search-types";

// =============================================================================
// Constants
// =============================================================================

/** localStorage key for the v1 folders store. */
export const LOCAL_FOLDERS_STORAGE_KEY = "trainersgg.builder.localFolders.v1";

/**
 * Stable ids for the built-in seeded smart folders.
 * These are well-known so the UI can reference them by id (e.g. to render
 * them as un-deletable in folder management UIs).
 */
export const SEEDED_FOLDER_IDS = {
  INCOMPLETE: "smart-seed-incomplete",
  ILLEGAL: "smart-seed-illegal",
  RECENTLY_EDITED: "smart-seed-recently-edited",
} as const;

/**
 * The built-in smart folders shipped with the app.
 * Always available (merged into listSmartFolders(), not stored in localStorage).
 * Rendered muted at count 0 until they match at least one draft.
 */
export const SEEDED_SMART_FOLDERS: SmartFolder[] = [
  {
    id: SEEDED_FOLDER_IDS.INCOMPLETE,
    name: "Incomplete",
    criteria: [{ kind: "flag", flag: "incomplete" }] satisfies Predicate[],
    isSeeded: true,
  },
  {
    id: SEEDED_FOLDER_IDS.ILLEGAL,
    name: "Illegal",
    criteria: [{ kind: "flag", flag: "illegal" }] satisfies Predicate[],
    isSeeded: true,
  },
  {
    id: SEEDED_FOLDER_IDS.RECENTLY_EDITED,
    name: "Recently edited",
    criteria: [{ kind: "updated_within", days: 7 }] satisfies Predicate[],
    isSeeded: true,
  },
];

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Return an empty store envelope.
 */
function emptyStore(): LocalFoldersStoreV1 {
  return { version: 1, manual: [], smart: [] };
}

/**
 * Read and parse the v1 folders store from localStorage.
 * SSR guard: returns an empty store when window is unavailable.
 * On corruption: logs the error, removes the malformed key, returns empty store.
 */
function readStore(): LocalFoldersStoreV1 {
  if (typeof window === "undefined") {
    return emptyStore();
  }

  const raw = localStorage.getItem(LOCAL_FOLDERS_STORAGE_KEY);
  if (!raw) return emptyStore();

  try {
    const parsed: LocalFoldersStoreV1 = JSON.parse(raw);
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.manual) ||
      !Array.isArray(parsed.smart)
    ) {
      throw new Error("Malformed folders store");
    }
    return parsed;
  } catch (error) {
    logError("localFoldersStore.read", error);
    localStorage.removeItem(LOCAL_FOLDERS_STORAGE_KEY);
    return emptyStore();
  }
}

/**
 * Persist the v1 folders store to localStorage.
 * On quota error: logs and shows a toast. SSR-safe (no-op when window unavailable).
 */
function writeStore(store: LocalFoldersStoreV1): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_FOLDERS_STORAGE_KEY, JSON.stringify(store));
    notify();
  } catch (error) {
    logError("localFoldersStore.write", error);
    toast.error("Could not save your folders locally. Storage may be full.");
  }
}

// =============================================================================
// Subscription / snapshot (useSyncExternalStore support)
// =============================================================================

type Listener = () => void;

/** Module-level subscriber set — shared across all hook instances. */
const listeners = new Set<Listener>();

/**
 * Cached snapshots for manual and smart folders.
 * null means dirty — needs re-read from localStorage on next getSnapshot call.
 * Guarantees referential stability between notifications so that
 * `useSyncExternalStore` does not infinite-loop.
 */
let manualCache: ManualFolder[] | null = null;
let smartCache: SmartFolder[] | null = null;

/**
 * Stable server-side snapshots returned during SSR.
 * Same object references every call — required by `useSyncExternalStore`.
 */
const SERVER_MANUAL_SNAPSHOT: ManualFolder[] = [];
const SERVER_SMART_SNAPSHOT: SmartFolder[] = [...SEEDED_SMART_FOLDERS];

/**
 * Invalidate both caches and notify all subscribers.
 * Called at the end of every write operation so React re-renders consumers.
 * Exported so tests can reset the cache after clearing localStorage.
 */
export function notify(): void {
  manualCache = null;
  smartCache = null;
  for (const l of listeners) l();
}

/**
 * Subscribe a listener to folder-store changes.
 * Also listens for cross-tab `storage` events on this store's key.
 * Returns an unsubscribe function (required by `useSyncExternalStore`).
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_FOLDERS_STORAGE_KEY || e.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Return a referentially stable snapshot of manual folders.
 * Rebuilds from localStorage only when `manualCache` is null (after a `notify()`).
 */
export function getManualSnapshot(): ManualFolder[] {
  if (manualCache === null) manualCache = [...readStore().manual];
  return manualCache;
}

/** Server snapshot for manual folders — always the same empty-array reference. */
export function getManualServerSnapshot(): ManualFolder[] {
  return SERVER_MANUAL_SNAPSHOT;
}

/**
 * Return a referentially stable snapshot of smart folders (seeded + user-created).
 * Rebuilds from localStorage only when `smartCache` is null (after a `notify()`).
 */
export function getSmartSnapshot(): SmartFolder[] {
  if (smartCache === null) smartCache = [...SEEDED_SMART_FOLDERS, ...readStore().smart];
  return smartCache;
}

/** Server snapshot for smart folders — seeded folders only (same reference). */
export function getSmartServerSnapshot(): SmartFolder[] {
  return SERVER_SMART_SNAPSHOT;
}

// =============================================================================
// Id generators
// =============================================================================

/**
 * Generate a unique folder id of the form `folder-xxxx` (4 base36 chars).
 * If `existingIds` is provided, regenerates on collision until unique.
 *
 * @param existingIds - Optional list of ids already in use.
 * @returns A new unique folder id, e.g. `"folder-ab12"`.
 */
export function generateManualFolderId(existingIds?: readonly string[]): string {
  const existing = new Set(existingIds ?? []);
  let id: string;
  do {
    const suffix = Math.random().toString(36).slice(2, 6);
    id = `folder-${suffix}`;
  } while (existing.has(id));
  return id;
}

/**
 * Generate a unique smart folder id of the form `smart-xxxx` (4 base36 chars).
 * If `existingIds` is provided, regenerates on collision until unique.
 *
 * @param existingIds - Optional list of ids already in use.
 * @returns A new unique smart folder id, e.g. `"smart-ab12"`.
 */
export function generateSmartFolderId(existingIds?: readonly string[]): string {
  const existing = new Set(existingIds ?? []);
  let id: string;
  do {
    const suffix = Math.random().toString(36).slice(2, 6);
    id = `smart-${suffix}`;
  } while (existing.has(id));
  return id;
}

// =============================================================================
// Manual folder API
// =============================================================================

/**
 * Return all manual folders, in insertion order (oldest first).
 * SSR-safe: returns `[]` on the server.
 *
 * @returns Array of ManualFolder objects.
 */
export function listManualFolders(): ManualFolder[] {
  const store = readStore();
  return [...store.manual];
}

/**
 * Create a new manual folder, persist it, and return the created record.
 *
 * @param name - Display name for the new folder.
 * @returns The newly-created ManualFolder.
 */
export function createManualFolder(name: string): ManualFolder {
  const store = readStore();
  const existingIds = store.manual.map((f) => f.id);
  const id = generateManualFolderId(existingIds);
  const folder: ManualFolder = {
    id,
    name,
    createdAt: new Date().toISOString(),
  };
  writeStore({ ...store, manual: [...store.manual, folder] });
  return folder;
}

/**
 * Rename an existing manual folder.
 * No-op if the id is not found in the store.
 *
 * @param id   - The folder id to rename.
 * @param name - The new display name.
 */
export function renameManualFolder(id: string, name: string): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  const idx = store.manual.findIndex((f) => f.id === id);
  if (idx === -1) return;
  const updated = store.manual.map((f) => (f.id === id ? { ...f, name } : f));
  writeStore({ ...store, manual: updated });
}

/**
 * Delete a manual folder by id.
 * No-op if the id is not found in the store.
 *
 * @param id - The folder id to remove.
 */
export function deleteManualFolder(id: string): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  const newManual = store.manual.filter((f) => f.id !== id);
  writeStore({ ...store, manual: newManual });
}

// =============================================================================
// Smart folder API
// =============================================================================

/**
 * Return all smart folders: seeded defaults first, then user-created folders.
 * Seeded folders are always present regardless of localStorage state.
 * SSR-safe: returns only the seeded folders on the server (localStorage unavailable).
 *
 * @returns Array of SmartFolder objects (seeded ++ user-created).
 */
export function listSmartFolders(): SmartFolder[] {
  const store = readStore();
  return [...SEEDED_SMART_FOLDERS, ...store.smart];
}

/**
 * Create a new user smart folder with the given name and criteria, persist it,
 * and return the created record.
 *
 * @param name     - Display name for the smart folder.
 * @param criteria - Predicates that define the folder's membership rule.
 * @returns The newly-created SmartFolder.
 */
export function createSmartFolder(
  name: string,
  criteria: Predicate[]
): SmartFolder {
  const store = readStore();
  // Collect all existing ids (seeded + stored) to avoid collisions
  const existingIds = [
    ...SEEDED_SMART_FOLDERS.map((f) => f.id),
    ...store.smart.map((f) => f.id),
  ];
  const id = generateSmartFolderId(existingIds);
  const folder: SmartFolder = { id, name, criteria, isSeeded: false };
  writeStore({ ...store, smart: [...store.smart, folder] });
  return folder;
}

/**
 * Rename an existing user smart folder.
 * No-op for seeded folder ids (seeded folders are not stored, so renaming them
 * would have no persistent effect — the caller should handle this gracefully).
 * No-op if the id is not found in the user store.
 *
 * @param id   - The smart folder id to rename.
 * @param name - The new display name.
 */
export function renameSmartFolder(id: string, name: string): void {
  if (typeof window === "undefined") return;
  // Seeded folders are not in localStorage — silently ignore
  if (SEEDED_SMART_FOLDERS.some((f) => f.id === id)) return;
  const store = readStore();
  const idx = store.smart.findIndex((f) => f.id === id);
  if (idx === -1) return;
  const updated = store.smart.map((f) => (f.id === id ? { ...f, name } : f));
  writeStore({ ...store, smart: updated });
}

/**
 * Delete a user smart folder by id.
 * No-op for seeded folder ids (seeded folders cannot be removed).
 * No-op if the id is not found in the user store.
 *
 * @param id - The smart folder id to remove.
 */
export function deleteSmartFolder(id: string): void {
  if (typeof window === "undefined") return;
  // Seeded folders cannot be deleted — silently ignore
  if (SEEDED_SMART_FOLDERS.some((f) => f.id === id)) return;
  const store = readStore();
  const newSmart = store.smart.filter((f) => f.id !== id);
  writeStore({ ...store, smart: newSmart });
}
