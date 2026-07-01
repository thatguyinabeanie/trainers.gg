/**
 * builder-drafts.ts
 *
 * Reusable helpers for seeding the builder-landing v3 localStorage store in
 * Playwright E2E tests. All tests in the builder-landing suite are guest-only
 * (no auth) and fully localStorage-driven — this fixture is the single source
 * of truth for the v3 schema used in the E2E layer.
 *
 * v3 LocalDraftRecord shape:
 *   id, team (TeamWithPokemon), createdAt, updatedAt,
 *   pinned, archived, sortOrder, folderIds
 */

import type { Page } from "@playwright/test";

// =============================================================================
// Constants
// =============================================================================

/** localStorage key for the v3 multi-draft store. */
export const BUILDER_LS_KEY = "trainersgg.builder.localDrafts.v3";

/** Default format used for newly created draft records. */
const DEFAULT_FORMAT = "gen9championsvgc2026regma";

// =============================================================================
// Types
// =============================================================================

/**
 * A minimal TeamWithPokemon shape sufficient for the landing-page E2E tests.
 * Full team_pokemon entries are not required — the landing only uses
 * species/isShiny from each slot.
 */
export interface TeamPokemonSlot {
  id: number;
  team_id: number;
  pokemon_id: number;
  species: string;
  isShiny?: boolean;
  slot: number;
}

export interface DraftTeam {
  id: number;
  name: string;
  format: string;
  format_legal: null | string;
  description: null | string;
  notes: null | string;
  tags: null | string[];
  is_public: null | boolean;
  parent_team_id: null | number;
  created_by: number;
  created_at: string;
  updated_at: string;
  team_pokemon: TeamPokemonSlot[];
}

export interface DraftRecord {
  id: string;
  team: DraftTeam;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  archived: boolean;
  sortOrder: number | null;
  folderIds: string[];
}

// =============================================================================
// Factory
// =============================================================================

let _seq = 0;

/**
 * Build a valid v3 LocalDraftRecord with sensible defaults.
 *
 * @param overrides - Partial overrides for any top-level draft field.
 *   To override nested team fields use `{ team: { name: "..." } }` — it will
 *   be shallowly merged with the default team.
 */
export function makeDraftRecord(
  overrides: Omit<Partial<DraftRecord>, "team"> & { team?: Partial<DraftTeam> } = {}
): DraftRecord {
  _seq += 1;
  const now = new Date().toISOString();
  const id = overrides.id ?? `local-test${_seq.toString(16).padStart(2, "0")}`;

  const defaultTeam: DraftTeam = {
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
    created_at: now,
    updated_at: now,
    team_pokemon: [],
  };

  const { team: teamOverride, ...topLevelOverrides } = overrides;

  return {
    id,
    team: { ...defaultTeam, ...(teamOverride ?? {}) },
    createdAt: now,
    updatedAt: now,
    pinned: false,
    archived: false,
    sortOrder: null,
    folderIds: [],
    ...topLevelOverrides,
  };
}

// =============================================================================
// Seed helpers
// =============================================================================

/**
 * Seed the v3 store via `page.addInitScript` (runs before first paint).
 *
 * Use this as the preferred mechanism — call it BEFORE `page.goto()` so the
 * React component sees the data on its first render and doesn't flash an empty
 * state before hydration corrects it.
 *
 * MUST be awaited: `page.addInitScript` is an async CDP round-trip that
 * registers the script on the browser context. Without awaiting it, the
 * following `page.goto()` can commit its navigation before the script is
 * actually registered, so the init script never fires and the seed is
 * silently lost — the exact "seeded value is gone after navigation" symptom.
 */
export async function seedDraftsBeforeLoad(
  page: Page,
  records: DraftRecord[]
): Promise<void> {
  await page.addInitScript(
    ({ key, store }) => {
      localStorage.setItem(key, JSON.stringify(store));
    },
    { key: BUILDER_LS_KEY, store: { version: 3, drafts: records } }
  );
}

/**
 * Seed the v3 store via `page.evaluate` (runs after navigation).
 *
 * Use this when you need to update the store after `page.goto()` and then
 * trigger a reload to pick up the new data.
 *
 * @example
 * await page.goto("/builder");
 * await seedDrafts(page, [makeDraftRecord({ team: { name: "My Team" } })]);
 * await page.reload();
 */
export async function seedDrafts(
  page: Page,
  records: DraftRecord[]
): Promise<void> {
  await page.evaluate(
    ({ key, store }) => {
      localStorage.setItem(key, JSON.stringify(store));
    },
    { key: BUILDER_LS_KEY, store: { version: 3, drafts: records } }
  );
}

/**
 * Remove the v3 store key from localStorage (post-navigation).
 *
 * Use this to reset state to empty between tests. Must be called after an
 * initial `page.goto()` so localStorage is accessible.
 */
export async function clearDrafts(page: Page): Promise<void> {
  await page.evaluate((key) => {
    localStorage.removeItem(key);
  }, BUILDER_LS_KEY);
}
