/**
 * local-drafts-store.ts
 *
 * Pure, SSR-safe module for managing multiple local team drafts in localStorage.
 * Generalizes the single-slot localTeam.v1 store into a keyed multi-draft v3 store.
 *
 * Handles one-time migrations:
 *   (a) legacy v1 key → v3 (first call after Phase 1 upgrade)
 *   (b) existing v2 store → v3 (Milestone B upgrade: new attribute fields)
 *
 * All functions are SSR-safe: SSR guard returns empty/null where appropriate.
 */

import { toast } from "sonner";
import { type TeamWithPokemon } from "@trainers/supabase";
import { logError } from "@trainers/utils";
import {
  type LocalDraftId,
  type LocalDraftRecord,
  type LocalDraftStoreV2,
  type LocalDraftStoreV3,
} from "./local-drafts-types";
import { type LocalTeamData } from "./types";

// =============================================================================
// Subscription / snapshot (useSyncExternalStore support)
// =============================================================================

type Listener = () => void;

/** Module-level subscriber set — shared across all hook instances. */
const listeners = new Set<Listener>();

/**
 * Cached snapshot — null means dirty (needs re-read from localStorage).
 * `getSnapshot` returns the cached value when clean; sets it when dirty.
 * This guarantees referential stability between notifications so that
 * `useSyncExternalStore` does not infinite-loop.
 */
let cache: LocalDraftRecord[] | null = null;

/** Read fresh from localStorage (uncached). Used by non-React callers. */
function readFresh(): LocalDraftRecord[] {
  const store = readStore();
  return [...store.drafts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Return a referentially stable snapshot of the draft list.
 * Rebuilds from localStorage only when `cache` is null (after a `notify()`).
 */
export function getSnapshot(): LocalDraftRecord[] {
  if (cache === null) cache = readFresh();
  return cache;
}

/** Stable empty array returned on the server (SSR). Same reference every call. */
const SERVER_SNAPSHOT: LocalDraftRecord[] = [];

/** Server snapshot — always returns the same empty-array reference. */
export function getServerSnapshot(): LocalDraftRecord[] {
  return SERVER_SNAPSHOT;
}

/**
 * Invalidate the cache and notify all subscribers.
 * Called at the end of every write operation so React re-renders consumers.
 * Exported so tests can reset the cache after clearing localStorage.
 */
export function notify(): void {
  cache = null;
  for (const l of listeners) l();
}

/**
 * Subscribe a listener to draft-store changes.
 * Also listens for cross-tab `storage` events on this store's key.
 * Returns an unsubscribe function (required by `useSyncExternalStore`).
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_DRAFTS_STORAGE_KEY || e.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// =============================================================================
// Constants
// =============================================================================

/** localStorage key for the v3 multi-draft store. */
export const LOCAL_DRAFTS_STORAGE_KEY = "trainersgg.builder.localDrafts.v3";

/** localStorage key for the legacy single-slot v1 store (migration source). */
export const LEGACY_LOCAL_TEAM_KEY = "trainersgg.builder.localTeam.v1";

/** Default format for new drafts — Pokémon Champions (Reg M-A). */
const DEFAULT_FORMAT = "gen9championsvgc2026regma";

/** Default values for the Milestone-B attributes added in v3. */
const V3_DEFAULTS = {
  pinned: false,
  archived: false,
  sortOrder: null,
  folderIds: [],
} as const;

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Build a fresh empty TeamWithPokemon with synthetic negative IDs.
 * Canonical empty-team factory for local drafts — imported by use-local-drafts.ts.
 */
export function createEmptyTeam(): TeamWithPokemon {
  return {
    id: -1,
    name: "Untitled Team",
    format: DEFAULT_FORMAT,
    format_legal: null,
    description: null,
    notes: null,
    tags: null,
    is_public: null,
    parent_team_id: null,
    pinned: false,
    archived: false,
    sort_order: null,
    created_by: -1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    team_pokemon: [],
  };
}

/**
 * Deduplicate team_pokemon entries by pokemon_id.
 * Keeps the last entry per ID by iterating in reverse.
 * Returns the original array reference when no duplicates are found.
 */
function dedupeTeamPokemon(
  teamPokemon: TeamWithPokemon["team_pokemon"]
): TeamWithPokemon["team_pokemon"] {
  if (teamPokemon.length === 0) return teamPokemon;
  const seen = new Set<number>();
  const deduped: typeof teamPokemon = [];
  for (let i = teamPokemon.length - 1; i >= 0; i--) {
    const tp = teamPokemon[i]!;
    if (!seen.has(tp.pokemon_id)) {
      seen.add(tp.pokemon_id);
      deduped.unshift(tp);
    }
  }
  return deduped.length === teamPokemon.length ? teamPokemon : deduped;
}

/**
 * Upgrade a v2 draft object (missing Milestone-B fields) to a full v3 record
 * by defaulting all new fields.
 */
function upgradeV2DraftToV3(draft: LocalDraftStoreV2["drafts"][number]): LocalDraftRecord {
  return {
    ...draft,
    ...V3_DEFAULTS,
    folderIds: [], // ensure a fresh array, not a shared reference
  };
}

/**
 * Attempt a one-time migration from the legacy v1 single-slot store.
 * Runs only when the v3 key is absent and the v1 key holds a valid payload.
 * On success: writes v3 store with the migrated draft (with v3 defaults) and removes
 * the legacy key.
 * On any parse/validation error: skips silently.
 */
function maybeMigrateFromLegacy(): LocalDraftStoreV3 | null {
  try {
    const raw = localStorage.getItem(LEGACY_LOCAL_TEAM_KEY);
    if (!raw) return null;
    const parsed: LocalTeamData = JSON.parse(raw);
    if (parsed.version !== 1 || !parsed.team) return null;

    const id = generateLocalDraftId();
    const now = new Date().toISOString();
    const record: LocalDraftRecord = {
      id,
      team: {
        ...parsed.team,
        team_pokemon: dedupeTeamPokemon(parsed.team.team_pokemon),
      },
      createdAt: now,
      updatedAt: parsed.updatedAt ?? now,
      ...V3_DEFAULTS,
      folderIds: [],
    };
    const store: LocalDraftStoreV3 = { version: 3, drafts: [record] };
    localStorage.setItem(LOCAL_DRAFTS_STORAGE_KEY, JSON.stringify(store));
    localStorage.removeItem(LEGACY_LOCAL_TEAM_KEY);
    return store;
  } catch {
    // Silently skip corrupt or missing legacy data
    return null;
  }
}

/**
 * Read and parse the v3 store from localStorage.
 * Performs one-time migrations on first call after upgrade:
 *   - v1 legacy key → v3 (first call after Phase 1 upgrade)
 *   - v2 store → v3 (adds Milestone-B attribute fields with defaults)
 * On corruption or unknown version: logs the error, removes the malformed key,
 * returns empty store.
 * SSR guard: returns empty store when window is unavailable.
 */
function readStore(): LocalDraftStoreV3 {
  if (typeof window === "undefined") {
    return { version: 3, drafts: [] };
  }

  // One-time storage-key migration: if the old v2 key exists but the new v3 key
  // is absent, copy the raw value over and delete the stale key. The in-payload
  // version upgrade (v2 → v3) runs below after the raw value is parsed.
  const OLD_KEY = "trainersgg.builder.localDrafts.v2";
  if (!localStorage.getItem(LOCAL_DRAFTS_STORAGE_KEY)) {
    const oldRaw = localStorage.getItem(OLD_KEY);
    if (oldRaw) {
      localStorage.setItem(LOCAL_DRAFTS_STORAGE_KEY, oldRaw);
      localStorage.removeItem(OLD_KEY);
    }
  }

  const raw = localStorage.getItem(LOCAL_DRAFTS_STORAGE_KEY);

  // Key absent — attempt one-time migration from legacy v1
  if (!raw) {
    const migrated = maybeMigrateFromLegacy();
    return migrated ?? { version: 3, drafts: [] };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional: parsing unknown version for migration
    const parsed: any = JSON.parse(raw);

    // v2 → v3 migration: upgrade each draft with the new attribute defaults
    if (parsed.version === 2 && Array.isArray(parsed.drafts)) {
      const upgraded: LocalDraftStoreV3 = {
        version: 3,
        drafts: (parsed as LocalDraftStoreV2).drafts.map(upgradeV2DraftToV3),
      };
      localStorage.setItem(LOCAL_DRAFTS_STORAGE_KEY, JSON.stringify(upgraded));
      return upgraded;
    }

    // v3 — validate and return
    if (parsed.version === 3 && Array.isArray(parsed.drafts)) {
      return parsed as LocalDraftStoreV3;
    }

    // Unknown version or malformed — treat as corrupt
    throw new Error("Malformed store");
  } catch (error) {
    logError("localDraftsStore.read", error);
    localStorage.removeItem(LOCAL_DRAFTS_STORAGE_KEY);
    return { version: 3, drafts: [] };
  }
}

/**
 * Persist the v3 store to localStorage.
 * On quota error: logs and shows a toast. SSR-safe (no-op when window unavailable).
 */
function writeStore(store: LocalDraftStoreV3): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_DRAFTS_STORAGE_KEY, JSON.stringify(store));
    notify();
  } catch (error) {
    logError("localDraftsStore.write", error);
    toast.error("Could not save your team locally. Storage may be full.");
  }
}

// =============================================================================
// Public API — core CRUD
// =============================================================================

/**
 * Generate a unique local draft id of the form `local-xxxx` (4 base36 chars).
 * If `existingIds` is provided, regenerates on collision until a unique id is found.
 *
 * @param existingIds - Optional list of ids already in use.
 * @returns A new unique LocalDraftId, e.g. `"local-ab12"`.
 */
export function generateLocalDraftId(existingIds?: readonly string[]): LocalDraftId {
  const existing = new Set(existingIds ?? []);
  let id: LocalDraftId;
  do {
    const suffix = Math.random().toString(36).slice(2, 6);
    id = `local-${suffix}`;
  } while (existing.has(id));
  return id;
}

/**
 * Return all local drafts, sorted by `updatedAt` descending (most recent first).
 * Runs the one-time migrations on first call if needed.
 * SSR-safe: returns `[]` on the server.
 *
 * Note: archived drafts are returned — callers decide whether to filter them.
 * Archived filtering happens in the UI layer, not here.
 *
 * @returns Array of LocalDraftRecord objects.
 */
export function listLocalDrafts(): LocalDraftRecord[] {
  return readFresh();
}

/**
 * Retrieve a single local draft by id.
 *
 * @param id - The LocalDraftId to look up.
 * @returns The matching LocalDraftRecord, or `null` if not found.
 */
export function getLocalDraft(id: LocalDraftId): LocalDraftRecord | null {
  if (typeof window === "undefined") return null;
  const store = readStore();
  return store.drafts.find((d) => d.id === id) ?? null;
}

/**
 * Create a new local draft, persist it to the front of the store, and return it.
 * The draft's team starts as a fresh empty team, optionally overridden by `init`.
 * New drafts are created with the v3 attribute defaults:
 *   `pinned: false`, `archived: false`, `sortOrder: null`, `folderIds: []`.
 *
 * @param init - Optional overrides for name and/or format.
 * @returns The newly-created LocalDraftRecord.
 */
export function createLocalDraft(init?: { name?: string; format?: string }): LocalDraftRecord {
  const store = readStore();
  const existingIds = store.drafts.map((d) => d.id);
  const id = generateLocalDraftId(existingIds);
  const now = new Date().toISOString();

  const baseTeam = createEmptyTeam();
  const team: TeamWithPokemon = {
    ...baseTeam,
    ...(init?.name !== undefined ? { name: init.name } : {}),
    ...(init?.format !== undefined ? { format: init.format } : {}),
  };

  const record: LocalDraftRecord = {
    id,
    team,
    createdAt: now,
    updatedAt: now,
    ...V3_DEFAULTS,
    folderIds: [],
  };

  writeStore({ version: 3, drafts: [record, ...store.drafts] });
  return record;
}

/**
 * Update the team for an existing local draft (upsert on the team field).
 * Deduplicates team_pokemon as defense-in-depth.
 * Bumps `updatedAt` to the current timestamp.
 * Preserves all Milestone-B attribute fields (pinned, archived, sortOrder, folderIds).
 * No-op if the id does not exist in the store.
 *
 * @param id  - The LocalDraftId to update.
 * @param team - The new TeamWithPokemon to store.
 */
export function saveLocalDraftTeam(id: LocalDraftId, team: TeamWithPokemon): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  const idx = store.drafts.findIndex((d) => d.id === id);
  if (idx === -1) return; // unknown id — no-op

  const existing = store.drafts[idx]!;
  const updated: LocalDraftRecord = {
    // Preserve all existing fields (including Milestone-B attributes)
    ...existing,
    // Only replace team and updatedAt
    team: {
      ...team,
      team_pokemon: dedupeTeamPokemon(team.team_pokemon),
    },
    updatedAt: new Date().toISOString(),
  };

  const newDrafts = [...store.drafts];
  newDrafts[idx] = updated;
  writeStore({ version: 3, drafts: newDrafts });
}

/**
 * Delete a local draft by id.
 *
 * @param id - The LocalDraftId to remove.
 * @returns `true` if a record was removed, `false` if the id was not found.
 */
export function deleteLocalDraft(id: LocalDraftId): boolean {
  if (typeof window === "undefined") return false;
  const store = readStore();
  const before = store.drafts.length;
  const newDrafts = store.drafts.filter((d) => d.id !== id);
  if (newDrafts.length === before) return false;
  writeStore({ version: 3, drafts: newDrafts });
  return true;
}

// =============================================================================
// Public API — Milestone-B attribute mutators
// =============================================================================

/**
 * Set the `pinned` state for an existing local draft.
 * No-op if the id does not exist in the store.
 *
 * @param id - The LocalDraftId to update.
 * @param pinned - Whether the draft should be pinned.
 */
export function setDraftPinned(id: LocalDraftId, pinned: boolean): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  const idx = store.drafts.findIndex((d) => d.id === id);
  if (idx === -1) return;

  const newDrafts = [...store.drafts];
  newDrafts[idx] = { ...store.drafts[idx]!, pinned };
  writeStore({ version: 3, drafts: newDrafts });
}

/**
 * Set the `archived` state for an existing local draft.
 * No-op if the id does not exist in the store.
 *
 * @param id - The LocalDraftId to update.
 * @param archived - Whether the draft should be archived.
 */
export function setDraftArchived(id: LocalDraftId, archived: boolean): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  const idx = store.drafts.findIndex((d) => d.id === id);
  if (idx === -1) return;

  const newDrafts = [...store.drafts];
  newDrafts[idx] = { ...store.drafts[idx]!, archived };
  writeStore({ version: 3, drafts: newDrafts });
}

/**
 * Set the `sortOrder` for an existing local draft.
 * No-op if the id does not exist in the store.
 *
 * @param id - The LocalDraftId to update.
 * @param sortOrder - The new sort position, or `null` to reset to unset.
 */
export function setDraftSortOrder(id: LocalDraftId, sortOrder: number | null): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  const idx = store.drafts.findIndex((d) => d.id === id);
  if (idx === -1) return;

  const newDrafts = [...store.drafts];
  newDrafts[idx] = { ...store.drafts[idx]!, sortOrder };
  writeStore({ version: 3, drafts: newDrafts });
}

/**
 * Replace the `folderIds` array for an existing local draft.
 * No-op if the id does not exist in the store.
 *
 * @param id - The LocalDraftId to update.
 * @param folderIds - The new complete set of folder IDs for this draft.
 */
export function setDraftFolders(id: LocalDraftId, folderIds: string[]): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  const idx = store.drafts.findIndex((d) => d.id === id);
  if (idx === -1) return;

  const newDrafts = [...store.drafts];
  newDrafts[idx] = { ...store.drafts[idx]!, folderIds: [...folderIds] };
  writeStore({ version: 3, drafts: newDrafts });
}

/**
 * Toggle membership of a single folder id for an existing local draft.
 * If the draft already belongs to the folder, removes it; otherwise adds it.
 * No-op if the draft id does not exist in the store.
 *
 * @param id - The LocalDraftId to update.
 * @param folderId - The folder ID to add or remove.
 */
export function toggleDraftFolder(id: LocalDraftId, folderId: string): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  const idx = store.drafts.findIndex((d) => d.id === id);
  if (idx === -1) return;

  const draft = store.drafts[idx]!;
  const hasMembership = draft.folderIds.includes(folderId);
  const newFolderIds = hasMembership
    ? draft.folderIds.filter((f) => f !== folderId)
    : [...draft.folderIds, folderId];

  const newDrafts = [...store.drafts];
  newDrafts[idx] = { ...draft, folderIds: newFolderIds };
  writeStore({ version: 3, drafts: newDrafts });
}
