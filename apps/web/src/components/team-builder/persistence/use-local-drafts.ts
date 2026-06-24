"use client";

/**
 * use-local-drafts.ts
 *
 * React hooks for reading and mutating the multi-draft local store.
 *
 * - useLocalDrafts — list/create/delete drafts; exposes Milestone-B attribute mutators;
 *   hydrates via useSyncExternalStore (SSR-safe, no setState-in-effect).
 * - useLocalDraft  — single-draft read/write with 300ms debounced persistence.
 *
 * Both hooks are SSR-safe: getServerSnapshot() returns [] on the server,
 * and the real value loads on the first client render via useSyncExternalStore.
 */

import { useSyncExternalStore, useState, useEffect, useRef } from "react";
import { type TeamWithPokemon } from "@trainers/supabase";
import { useIsClient } from "@/hooks/use-is-client";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  getLocalDraft,
  createLocalDraft,
  saveLocalDraftTeam,
  deleteLocalDraft,
  createEmptyTeam,
  setDraftPinned,
  setDraftArchived,
  setDraftSortOrder as storeSortOrder,
  toggleDraftFolder as storeToggleFolder,
} from "./local-drafts-store";
import { type LocalDraftId, type LocalDraftRecord } from "./local-drafts-types";

// =============================================================================
// Constants
// =============================================================================

const DEBOUNCE_MS = 300;

// =============================================================================
// useLocalDrafts
// =============================================================================

interface UseLocalDraftsReturn {
  /** All local drafts sorted by updatedAt descending. Empty until `hydrated`. */
  drafts: LocalDraftRecord[];
  /** True once the initial hydration from localStorage is complete. */
  hydrated: boolean;
  /**
   * Create a new draft, add it to the front of the list, and return it.
   * Safe to call before hydration completes (rare, but guards gracefully).
   */
  createDraft: (init?: { name?: string; format?: string }) => LocalDraftRecord;
  /** Delete a draft by id. Removes it from state and the store. */
  deleteDraft: (id: LocalDraftId) => void;
  /**
   * Pin or unpin a draft.
   * Updates the store; the subscription drives the re-render.
   */
  pinDraft: (id: LocalDraftId, pinned: boolean) => void;
  /**
   * Archive or unarchive a draft.
   * Updates the store; the subscription drives the re-render.
   */
  archiveDraft: (id: LocalDraftId, archived: boolean) => void;
  /**
   * Set the manual sort-order position for a draft.
   * Pass `null` to reset to unset (falls back to `updatedAt` order).
   * Updates the store; the subscription drives the re-render.
   */
  setDraftSortOrder: (id: LocalDraftId, order: number | null) => void;
  /**
   * Toggle membership of a folder id on a draft.
   * Adds the folderId if absent, removes it if present.
   * Updates the store; the subscription drives the re-render.
   */
  toggleDraftFolder: (id: LocalDraftId, folderId: string) => void;
}

/**
 * Hook that manages the list of local drafts.
 *
 * Uses `useSyncExternalStore` against the module-level subscription in
 * local-drafts-store.ts. The server snapshot is `[]`; the client snapshot is
 * the live sorted draft list. `hydrated` is derived from `useIsClient()` —
 * true once the component is mounted on the client.
 *
 * Mutators are thin wrappers that call the store write fn; the store calls
 * `notify()` which invalidates the cache and triggers a re-render via the
 * subscription — no manual setDrafts(...) re-sync calls needed.
 */
export function useLocalDrafts(): UseLocalDraftsReturn {
  const drafts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useIsClient();

  function createDraft(init?: { name?: string; format?: string }): LocalDraftRecord {
    // createLocalDraft writes to the store and calls notify() — subscription
    // drives the re-render automatically.
    return createLocalDraft(init);
  }

  function deleteDraft(id: LocalDraftId): void {
    deleteLocalDraft(id);
  }

  function pinDraft(id: LocalDraftId, pinned: boolean): void {
    setDraftPinned(id, pinned);
  }

  function archiveDraft(id: LocalDraftId, archived: boolean): void {
    setDraftArchived(id, archived);
  }

  function setDraftSortOrder(id: LocalDraftId, order: number | null): void {
    storeSortOrder(id, order);
  }

  function toggleDraftFolder(id: LocalDraftId, folderId: string): void {
    storeToggleFolder(id, folderId);
  }

  return {
    drafts,
    hydrated,
    createDraft,
    deleteDraft,
    pinDraft,
    archiveDraft,
    setDraftSortOrder,
    toggleDraftFolder,
  };
}

// =============================================================================
// useLocalDraft
// =============================================================================

interface UseLocalDraftReturn {
  /** Current team state (source of truth for the draft editor). */
  team: TeamWithPokemon;
  /**
   * Update the team. Accepts a new value or a functional updater.
   * Schedules a debounced write to the store; the write is flushed
   * immediately on unmount to prevent data loss on navigation.
   */
  setTeam: (
    updater: TeamWithPokemon | ((prev: TeamWithPokemon) => TeamWithPokemon)
  ) => void;
  /** True once the initial hydration from localStorage is complete. */
  hydrated: boolean;
  /** True if a LocalDraftRecord was found for this id; false for unknown ids. */
  exists: boolean;
}

/**
 * Hook for reading and writing a single local draft.
 *
 * The consumer must remount when `id` changes (pass `key={id}` on the editor
 * component) — the hook hydrates from the store on mount and does not watch
 * for id changes after that.
 *
 * Debounces localStorage writes by 300ms using a per-instance ref timer.
 * On unmount, flushes any pending write immediately so navigating away
 * never silently drops the final edit.
 *
 * `hydrated` is derived from `useIsClient()` — consistent with useLocalDrafts.
 *
 * @param id - The LocalDraftId of the draft to edit.
 */
export function useLocalDraft(id: LocalDraftId): UseLocalDraftReturn {
  const [team, setTeamState] = useState<TeamWithPokemon>(createEmptyTeam);
  const hydrated = useIsClient();
  const [exists, setExists] = useState(false);

  // Per-instance ref timer — not module-level, so multiple editors don't clobber each other.
  const pendingWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to the latest team value so the flush-on-unmount callback has stable access.
  const latestTeam = useRef<TeamWithPokemon>(team);

  // Hydrate from localStorage on mount.
  // Note: this effect does NOT call setState synchronously — it runs after mount.
  // `hydrated` is already covered by useIsClient(); this effect only loads the
  // team data and sets `exists`. The setTeamState here fires inside the useEffect
  // body, which is the approved pattern for data loading (not derived state).
  useEffect(() => {
    const record = getLocalDraft(id);
    if (record) {
      setTeamState(record.team);
      latestTeam.current = record.team;
      setExists(true);
    }

    // Flush any pending write and cancel the timer on unmount
    return () => {
      if (pendingWriteTimer.current) {
        clearTimeout(pendingWriteTimer.current);
        pendingWriteTimer.current = null;
        saveLocalDraftTeam(id, latestTeam.current);
      }
    };
    // This effect runs once per mount. The consumer passes key={id} to remount
    // when the id changes, so id is intentionally excluded from the deps array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setTeam(
    updater: TeamWithPokemon | ((prev: TeamWithPokemon) => TeamWithPokemon)
  ): void {
    setTeamState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      latestTeam.current = next;

      // Cancel any pending write and schedule a new debounced one
      if (pendingWriteTimer.current) clearTimeout(pendingWriteTimer.current);
      pendingWriteTimer.current = setTimeout(() => {
        pendingWriteTimer.current = null;
        saveLocalDraftTeam(id, next);
      }, DEBOUNCE_MS);

      return next;
    });
  }

  return { team, setTeam, hydrated, exists };
}
