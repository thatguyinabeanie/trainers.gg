/**
 * Local Multi-Draft Types
 *
 * Types for the keyed, multi-draft localStorage store that backs the public
 * (logged-out) team builder landing. Replaces the single-slot LocalTeamData
 * model. Each draft has a stable string id (e.g. "local-ab12") used for routing
 * (/builder/t/[id]) and as its key in the store.
 */

import { type TeamWithPokemon } from "@trainers/supabase";

/** Stable id for a local draft, formatted `local-${base36}` (e.g. "local-ab12"). */
export type LocalDraftId = string;

/** A single local draft: the full team graph plus lifecycle timestamps and Milestone-B attributes. */
export interface LocalDraftRecord {
  /** Stable routing/storage id, e.g. "local-ab12". */
  id: LocalDraftId;
  /** Full team graph (synthetic negative numeric ids inside, as today). */
  team: TeamWithPokemon;
  /** ISO timestamp when the draft was created. */
  createdAt: string;
  /** ISO timestamp of the last edit. */
  updatedAt: string;
  /** Whether this draft is pinned to the top of the landing list. */
  pinned: boolean;
  /** Whether this draft has been archived (hidden from the default list view). */
  archived: boolean;
  /**
   * Manual custom-order position for drag-and-drop sorting.
   * `null` means unset — the sort falls back to `updatedAt` descending.
   */
  sortOrder: number | null;
  /**
   * IDs of the manual folders this draft belongs to.
   * Empty array means the draft is in no folder.
   */
  folderIds: string[];
}

/**
 * Versioned envelope for the v2 store (kept for migration type-safety).
 * @internal - only used inside `local-drafts-store.ts` for the v2→v3 migration.
 */
export interface LocalDraftStoreV2 {
  version: 2;
  drafts: Array<{
    id: LocalDraftId;
    team: TeamWithPokemon;
    createdAt: string;
    updatedAt: string;
  }>;
}

/** Versioned envelope persisted under the multi-draft localStorage key (current). */
export interface LocalDraftStoreV3 {
  version: 3;
  drafts: LocalDraftRecord[];
}
