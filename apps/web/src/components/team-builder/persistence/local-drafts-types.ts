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

/** A single local draft: the full team graph plus lifecycle timestamps. */
export interface LocalDraftRecord {
  /** Stable routing/storage id, e.g. "local-ab12". */
  id: LocalDraftId;
  /** Full team graph (synthetic negative numeric ids inside, as today). */
  team: TeamWithPokemon;
  /** ISO timestamp when the draft was created. */
  createdAt: string;
  /** ISO timestamp of the last edit. */
  updatedAt: string;
}

/** Versioned envelope persisted under the multi-draft localStorage key. */
export interface LocalDraftStoreV2 {
  version: 2;
  drafts: LocalDraftRecord[];
}
