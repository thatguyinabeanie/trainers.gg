/**
 * local-folders-types.ts
 *
 * Types for the localStorage-backed folders store that backs the team-builder
 * landing (Milestone B foundation). Covers both manual folders (hand-curated
 * buckets) and smart folders (saved search criteria that auto-populate).
 *
 * Pure types only — no runtime logic in this module.
 */

import { type Predicate } from "../landing/search-types";

// =============================================================================
// Folder types
// =============================================================================

/**
 * A hand-curated folder the user creates and names.
 * Teams are filed into manual folders explicitly (via drag or menu).
 */
export interface ManualFolder {
  /** Stable id, e.g. "folder-ab12". */
  id: string;
  /** User-supplied name. */
  name: string;
  /** ISO timestamp when the folder was created. */
  createdAt: string;
}

/**
 * A saved search that auto-populates with any draft matching its criteria.
 * Criteria are AND-ed at evaluation time (same semantics as ParsedQuery predicates).
 */
export interface SmartFolder {
  /** Stable id. Seeded folders use well-known ids like "smart-seed-incomplete". */
  id: string;
  /** Display name. */
  name: string;
  /**
   * Predicates that define this folder's membership rule.
   * An empty array matches every draft.
   */
  criteria: Predicate[];
  /**
   * True for the built-in seeded defaults shipped with the app.
   * Seeded folders cannot be deleted and their criteria cannot be mutated;
   * only their name can be changed (user preference).
   * Actually we preserve the seeded id as a no-op for delete/rename — see store.
   */
  isSeeded: boolean;
}

// =============================================================================
// Persisted envelope
// =============================================================================

/**
 * Versioned envelope persisted under the localStorage key.
 * Only user-created (non-seeded) smart folders are persisted.
 * Seeded smart folders are always provided by the SEEDED_SMART_FOLDERS constant.
 */
export interface LocalFoldersStoreV1 {
  version: 1;
  /** User-created manual folders. */
  manual: ManualFolder[];
  /**
   * User-created smart folders only (no seeded entries).
   * Seeded folders are always merged in at read time.
   */
  smart: SmartFolder[];
}
