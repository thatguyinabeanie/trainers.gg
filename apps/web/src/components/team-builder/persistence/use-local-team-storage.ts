"use client";

/**
 * useLocalTeamStorage
 *
 * React hook that manages a local team in localStorage with debounced writes.
 * Used by the public builder (anonymous mode) and as a crash-recovery backup
 * for the dashboard builder.
 */

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { TeamWithPokemon } from "@trainers/supabase";
import { logError } from "@trainers/utils";
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

    // Deduplicate team_pokemon by pokemon.id — previous HMR counter resets
    // could produce entries with colliding IDs at different positions. Keep the
    // last entry per ID (most recently added).
    const team = parsed.team;
    if (team.team_pokemon.length > 0) {
      const seen = new Set<number>();
      const deduped: typeof team.team_pokemon = [];
      // Iterate in reverse so the last-added entry (highest position) wins.
      for (let i = team.team_pokemon.length - 1; i >= 0; i--) {
        const tp = team.team_pokemon[i]!;
        if (!seen.has(tp.pokemon_id)) {
          seen.add(tp.pokemon_id);
          deduped.unshift(tp);
        }
      }
      if (deduped.length !== team.team_pokemon.length) {
        team.team_pokemon = deduped;
      }
    }

    return team;
  } catch (error) {
    logError("localTeamStorage.read", error);
    toast.error(
      "Your saved team data was corrupted and couldn't be loaded. Starting fresh."
    );
    return null;
  }
}

function writeToStorage(team: TeamWithPokemon): void {
  if (typeof window === "undefined") return;
  try {
    // Deduplicate before persisting as defense-in-depth against bugs
    // producing duplicate pokemon_id entries during a session.
    let teamToWrite = team;
    if (team.team_pokemon.length > 0) {
      const seen = new Set<number>();
      const deduped: typeof team.team_pokemon = [];
      for (let i = team.team_pokemon.length - 1; i >= 0; i--) {
        const tp = team.team_pokemon[i]!;
        if (!seen.has(tp.pokemon_id)) {
          seen.add(tp.pokemon_id);
          deduped.unshift(tp);
        }
      }
      if (deduped.length !== team.team_pokemon.length) {
        teamToWrite = { ...team, team_pokemon: deduped };
      }
    }

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
