"use client";

/**
 * use-local-drafts.ts
 *
 * React hooks for reading and mutating the multi-draft local store.
 *
 * - useLocalDrafts — list/create/delete drafts; hydrates from localStorage on mount.
 * - useLocalDraft  — single-draft read/write with 300ms debounced persistence.
 *
 * Both hooks are SSR-safe: the store module returns empty values on the server,
 * and hydration happens only in the mount effect.
 */

import { useState, useEffect, useRef } from "react";
import { type TeamWithPokemon } from "@trainers/supabase";
import {
  listLocalDrafts,
  getLocalDraft,
  createLocalDraft,
  saveLocalDraftTeam,
  deleteLocalDraft,
  createEmptyTeam,
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
}

/**
 * Hook that manages the list of local drafts.
 * Hydrates from localStorage on mount; exposes create/delete mutations
 * that keep React state in sync with the store.
 */
export function useLocalDrafts(): UseLocalDraftsReturn {
  const [drafts, setDrafts] = useState<LocalDraftRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrate from localStorage after mount to avoid SSR mismatch
    setDrafts(listLocalDrafts());
    setHydrated(true);
  }, []);

  function createDraft(init?: { name?: string; format?: string }): LocalDraftRecord {
    const record = createLocalDraft(init);
    setDrafts((prev) => [record, ...prev]);
    return record;
  }

  function deleteDraft(id: LocalDraftId): void {
    deleteLocalDraft(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  return { drafts, hydrated, createDraft, deleteDraft };
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
 * @param id - The LocalDraftId of the draft to edit.
 */
export function useLocalDraft(id: LocalDraftId): UseLocalDraftReturn {
  const [team, setTeamState] = useState<TeamWithPokemon>(createEmptyTeam);
  const [hydrated, setHydrated] = useState(false);
  const [exists, setExists] = useState(false);

  // Per-instance ref timer — not module-level, so multiple editors don't clobber each other.
  const pendingWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to the latest team value so the flush-on-unmount callback has stable access.
  const latestTeam = useRef<TeamWithPokemon>(team);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const record = getLocalDraft(id);
    if (record) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrate from localStorage after mount to avoid SSR mismatch
      setTeamState(record.team);
      latestTeam.current = record.team;
      setExists(true);
    }
    setHydrated(true);

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
