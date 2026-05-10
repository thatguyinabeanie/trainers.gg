"use client";

/**
 * useLocalTeamStorage
 *
 * React hook that manages a local team in localStorage with debounced writes.
 * Used by the public builder (anonymous mode) and as a crash-recovery backup
 * for the dashboard builder.
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { TeamWithPokemon } from "@trainers/supabase";
import { logError } from "@trainers/utils";
import type { LocalTeamData } from "./types";

// =============================================================================
// Constants
// =============================================================================

const LOCAL_TEAM_STORAGE_KEY = "trainersgg.builder.localTeam.v1";
const DEBOUNCE_MS = 300;

/** Module-level ref to the pending debounce timer so clearLocalTeamStorage can cancel it. */
let pendingWriteTimer: ReturnType<typeof setTimeout> | null = null;

/** Default format for new local teams — current primary VGC format. */
const DEFAULT_FORMAT = "championsvgc2026regma";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Deduplicate team_pokemon entries by pokemon_id.
 * Keeps the last entry per ID (most recently added) by iterating in reverse.
 * Returns the original array reference if no duplicates found.
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

function createEmptyTeam(): TeamWithPokemon {
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
    created_by: -1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    team_pokemon: [],
  };
}

function readFromStorage(): TeamWithPokemon | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_TEAM_STORAGE_KEY);
    if (!raw) return null;
    const parsed: LocalTeamData = JSON.parse(raw);
    if (parsed.version !== 1) return null;

    const team = parsed.team;
    team.team_pokemon = dedupeTeamPokemon(team.team_pokemon);

    return team;
  } catch (error) {
    logError("localTeamStorage.read", error);
    localStorage.removeItem(LOCAL_TEAM_STORAGE_KEY);
    toast.error(
      "Your saved team data was corrupted and couldn't be loaded. Starting fresh."
    );
    return null;
  }
}

function writeToStorage(team: TeamWithPokemon): void {
  if (typeof window === "undefined") return;
  try {
    // Deduplicate before persisting as defense-in-depth
    const teamToWrite = {
      ...team,
      team_pokemon: dedupeTeamPokemon(team.team_pokemon),
    };

    const data: LocalTeamData = {
      team: teamToWrite,
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    localStorage.setItem(LOCAL_TEAM_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    logError("localTeamStorage.write", error);
    toast.error("Could not save your team locally. Storage may be full.");
  }
}

export function clearLocalTeamStorage(): boolean {
  if (typeof window === "undefined") return true;
  try {
    // Cancel any pending debounced write to prevent it from re-creating the key
    if (pendingWriteTimer) {
      clearTimeout(pendingWriteTimer);
      pendingWriteTimer = null;
    }
    localStorage.removeItem(LOCAL_TEAM_STORAGE_KEY);
    return true;
  } catch (error) {
    logError("localTeamStorage.clear", error);
    toast.error(
      "Could not clear local team data. It may reappear on next visit."
    );
    return false;
  }
}

// =============================================================================
// Hook
// =============================================================================

interface UseLocalTeamStorageReturn {
  /** Current local team state (source of truth for local mode). */
  team: TeamWithPokemon;
  /** Update the team — triggers debounced localStorage write. */
  setTeam: (
    updater: TeamWithPokemon | ((prev: TeamWithPokemon) => TeamWithPokemon)
  ) => void;
  /** Whether the initial hydration from localStorage is complete. */
  hydrated: boolean;
}

export function useLocalTeamStorage(): UseLocalTeamStorageReturn {
  const [team, setTeamState] = useState<TeamWithPokemon>(createEmptyTeam);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = readFromStorage();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrate from localStorage after mount to avoid SSR mismatch
      setTeamState(stored);
    }
    setHydrated(true);
  }, []);

  // Debounced write to localStorage
  function setTeam(
    updater: TeamWithPokemon | ((prev: TeamWithPokemon) => TeamWithPokemon)
  ) {
    setTeamState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;

      // Schedule debounced write (module-level so clearLocalTeamStorage can cancel)
      if (pendingWriteTimer) clearTimeout(pendingWriteTimer);
      pendingWriteTimer = setTimeout(() => {
        pendingWriteTimer = null;
        writeToStorage(next);
      }, DEBOUNCE_MS);

      return next;
    });
  }

  return { team, setTeam, hydrated };
}
