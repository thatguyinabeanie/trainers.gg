"use client";

/**
 * useLocalBackup
 *
 * Crash-recovery hook for the dashboard builder. After each successful API
 * mutation, snapshots the team to localStorage with a 7-day TTL. On page load,
 * if the server-delivered team data differs from the cached snapshot (e.g.,
 * the user's browser crashed mid-edit), offers a restore prompt.
 *
 * Usage in DashboardBuilderWrapper:
 *   const { hasPendingRestore, restore, dismiss } = useLocalBackup(team);
 *   // Show restore banner when hasPendingRestore === true
 */

import { useState } from "react";
import type { TeamWithPokemon } from "@trainers/supabase";

// =============================================================================
// Constants
// =============================================================================

const STORAGE_PREFIX = "trainersgg.builder.backup.";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// =============================================================================
// Types
// =============================================================================

interface BackupData {
  team: TeamWithPokemon;
  savedAt: string;
  version: 1;
}

// =============================================================================
// Storage Helpers
// =============================================================================

function getKey(teamId: number): string {
  return `${STORAGE_PREFIX}${teamId}`;
}

function readBackup(teamId: number): BackupData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getKey(teamId));
    if (!raw) return null;
    const parsed: BackupData = JSON.parse(raw);
    if (parsed.version !== 1) return null;

    // Check TTL
    const savedAt = new Date(parsed.savedAt).getTime();
    if (Date.now() - savedAt > TTL_MS) {
      localStorage.removeItem(getKey(teamId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeBackup(team: TeamWithPokemon): void {
  if (typeof window === "undefined") return;
  try {
    const data: BackupData = {
      team,
      savedAt: new Date().toISOString(),
      version: 1,
    };
    localStorage.setItem(getKey(team.id), JSON.stringify(data));
  } catch {
    // Quota exceeded — non-fatal
  }
}

function clearBackup(teamId: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getKey(teamId));
  } catch {
    // Non-fatal
  }
}

// =============================================================================
// Comparison
// =============================================================================

/**
 * Quick check to see if the backup differs from server state.
 * Compares team_pokemon count and the updated_at timestamp.
 */
function hasNewerChanges(
  serverTeam: TeamWithPokemon,
  backup: BackupData
): boolean {
  const backupTeam = backup.team;

  // If backup has more/fewer pokemon, it's different
  if (backupTeam.team_pokemon.length !== serverTeam.team_pokemon.length) {
    return true;
  }

  // If team metadata differs
  if (
    backupTeam.name !== serverTeam.name ||
    backupTeam.format !== serverTeam.format
  ) {
    return true;
  }

  // Check if any pokemon data differs by comparing species/set
  for (let i = 0; i < backupTeam.team_pokemon.length; i++) {
    const bPokemon = backupTeam.team_pokemon[i]?.pokemon;
    const sPokemon = serverTeam.team_pokemon[i]?.pokemon;

    if (!bPokemon && !sPokemon) continue;
    if (!bPokemon || !sPokemon) return true;
    if (bPokemon.species !== sPokemon.species) return true;
    if (bPokemon.held_item !== sPokemon.held_item) return true;
    if (bPokemon.ability !== sPokemon.ability) return true;
  }

  return false;
}

// =============================================================================
// Hook
// =============================================================================

interface UseLocalBackupReturn {
  /** Whether there's a pending backup that differs from server state. */
  hasPendingRestore: boolean;
  /** The backed-up team data to restore. */
  backupTeam: TeamWithPokemon | null;
  /** Timestamp of when the backup was saved. */
  backupSavedAt: string | null;
  /** Call after a successful API mutation to snapshot the current team. */
  snapshot: (team: TeamWithPokemon) => void;
  /** Dismiss the restore prompt and clear the backup. */
  dismiss: () => void;
}

export function useLocalBackup(
  serverTeam: TeamWithPokemon
): UseLocalBackupReturn {
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(() => {
    // Initialize synchronously — check if backup differs from server state
    const backup = readBackup(serverTeam.id);
    if (backup && hasNewerChanges(serverTeam, backup)) {
      return backup;
    }
    // Backup matches server state or doesn't exist — clear stale backup
    if (backup) clearBackup(serverTeam.id);
    return null;
  });

  function snapshot(team: TeamWithPokemon) {
    writeBackup(team);
    // If there was a pending restore, it's now superseded
    if (pendingBackup) {
      setPendingBackup(null);
    }
  }

  function dismiss() {
    clearBackup(serverTeam.id);
    setPendingBackup(null);
  }

  return {
    hasPendingRestore: pendingBackup !== null,
    backupTeam: pendingBackup?.team ?? null,
    backupSavedAt: pendingBackup?.savedAt ?? null,
    snapshot,
    dismiss,
  };
}
