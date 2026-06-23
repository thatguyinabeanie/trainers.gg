/**
 * local-drafts-store.ts
 *
 * Pure, SSR-safe module for managing multiple local team drafts in localStorage.
 * Generalizes the single-slot localTeam.v1 store into a keyed multi-draft v2 store.
 *
 * Handles one-time migration from the legacy v1 key on first read after upgrade.
 * All functions are SSR-safe: SSR guard returns empty/null where appropriate.
 */

import { toast } from "sonner";
import { type TeamWithPokemon } from "@trainers/supabase";
import { logError } from "@trainers/utils";
import { type LocalDraftId, type LocalDraftRecord, type LocalDraftStoreV2 } from "./local-drafts-types";
import { type LocalTeamData } from "./types";

// =============================================================================
// Constants
// =============================================================================

/** localStorage key for the v2 multi-draft store. */
export const LOCAL_DRAFTS_STORAGE_KEY = "trainersgg.builder.localDrafts.v2";

/** localStorage key for the legacy single-slot v1 store (migration source). */
export const LEGACY_LOCAL_TEAM_KEY = "trainersgg.builder.localTeam.v1";

/** Default format for new drafts — Pokémon Champions (Reg M-A). */
const DEFAULT_FORMAT = "gen9championsvgc2026regma";

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
 * Attempt a one-time migration from the legacy v1 single-slot store.
 * Runs only when the v2 key is absent and the v1 key holds a valid payload.
 * On success: writes v2 store with the migrated draft and removes the legacy key.
 * On any parse/validation error: skips silently.
 */
function maybeMigrateFromLegacy(): LocalDraftStoreV2 | null {
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
    };
    const store: LocalDraftStoreV2 = { version: 2, drafts: [record] };
    localStorage.setItem(LOCAL_DRAFTS_STORAGE_KEY, JSON.stringify(store));
    localStorage.removeItem(LEGACY_LOCAL_TEAM_KEY);
    return store;
  } catch {
    // Silently skip corrupt or missing legacy data
    return null;
  }
}

/**
 * Read and parse the v2 store from localStorage.
 * Performs one-time migration on first call after upgrade.
 * On corruption: logs the error, removes the malformed key, returns empty store.
 * SSR guard: returns empty store when window is unavailable.
 */
function readStore(): LocalDraftStoreV2 {
  if (typeof window === "undefined") {
    return { version: 2, drafts: [] };
  }

  const raw = localStorage.getItem(LOCAL_DRAFTS_STORAGE_KEY);

  // v2 key absent — attempt one-time migration from legacy v1
  if (!raw) {
    const migrated = maybeMigrateFromLegacy();
    return migrated ?? { version: 2, drafts: [] };
  }

  try {
    const parsed: LocalDraftStoreV2 = JSON.parse(raw);
    if (parsed.version !== 2 || !Array.isArray(parsed.drafts)) {
      throw new Error("Malformed store");
    }
    return parsed;
  } catch (error) {
    logError("localDraftsStore.read", error);
    localStorage.removeItem(LOCAL_DRAFTS_STORAGE_KEY);
    return { version: 2, drafts: [] };
  }
}

/**
 * Persist the v2 store to localStorage.
 * On quota error: logs and shows a toast. SSR-safe (no-op when window unavailable).
 */
function writeStore(store: LocalDraftStoreV2): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_DRAFTS_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    logError("localDraftsStore.write", error);
    toast.error("Could not save your team locally. Storage may be full.");
  }
}

// =============================================================================
// Public API
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
 * Runs the one-time v1→v2 migration on first call if needed.
 * SSR-safe: returns `[]` on the server.
 *
 * @returns Array of LocalDraftRecord objects.
 */
export function listLocalDrafts(): LocalDraftRecord[] {
  const store = readStore();
  return [...store.drafts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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
  };

  writeStore({ version: 2, drafts: [record, ...store.drafts] });
  return record;
}

/**
 * Update the team for an existing local draft (upsert on the team field).
 * Deduplicates team_pokemon as defense-in-depth.
 * Bumps `updatedAt` to the current timestamp.
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

  const updated: LocalDraftRecord = {
    ...store.drafts[idx]!,
    team: {
      ...team,
      team_pokemon: dedupeTeamPokemon(team.team_pokemon),
    },
    updatedAt: new Date().toISOString(),
  };

  const newDrafts = [...store.drafts];
  newDrafts[idx] = updated;
  writeStore({ version: 2, drafts: newDrafts });
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
  writeStore({ version: 2, drafts: newDrafts });
  return true;
}
