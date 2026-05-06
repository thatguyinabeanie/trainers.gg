"use client";

/**
 * useLocalTeamStorage
 *
 * React hook that manages a local team in localStorage with debounced writes.
 * Used by the public builder (anonymous mode) and as a crash-recovery backup
 * for the dashboard builder.
 */

import { useState, useEffect, useRef } from "react";
import type { TeamWithPokemon } from "@trainers/supabase";
import type { LocalTeamData } from "./types";

// =============================================================================
// Constants
// =============================================================================

const LOCAL_TEAM_STORAGE_KEY = "trainersgg.builder.localTeam.v1";
const DEBOUNCE_MS = 300;

/** Default format for new local teams — current primary VGC format. */
const DEFAULT_FORMAT = "gen9vgc2026regi";

// =============================================================================
// Helpers
// =============================================================================

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
    return parsed.team;
  } catch {
    return null;
  }
}

function writeToStorage(team: TeamWithPokemon): void {
  if (typeof window === "undefined") return;
  try {
    const data: LocalTeamData = {
      team,
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    localStorage.setItem(LOCAL_TEAM_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded or private mode — non-fatal
  }
}

export function clearLocalTeamStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOCAL_TEAM_STORAGE_KEY);
  } catch {
    // Non-fatal
  }
}

// =============================================================================
// Hook
// =============================================================================

interface UseLocalTeamStorageReturn {
  /** Current local team state (source of truth for local mode). */
  team: TeamWithPokemon;
  /** Update the team — triggers debounced localStorage write. */
  setTeam: (updater: TeamWithPokemon | ((prev: TeamWithPokemon) => TeamWithPokemon)) => void;
  /** Whether the initial hydration from localStorage is complete. */
  hydrated: boolean;
}

export function useLocalTeamStorage(): UseLocalTeamStorageReturn {
  const [team, setTeamState] = useState<TeamWithPokemon>(createEmptyTeam);
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // Schedule debounced write
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        writeToStorage(next);
      }, DEBOUNCE_MS);

      return next;
    });
  }

  return { team, setTeam, hydrated };
}
