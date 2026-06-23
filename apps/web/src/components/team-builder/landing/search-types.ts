/**
 * search-types.ts
 *
 * Shared type contracts for the team-builder landing search subsystem.
 * Used by both the live search field and smart-folder criteria evaluation.
 * Pure types only — no runtime logic in this module.
 */

// =============================================================================
// Predicate types
// =============================================================================

/** A per-pokemon field that a field predicate can match against. */
export type PredicateField =
  | "name"
  | "species"
  | "ability"
  | "item"
  | "move"
  | "tera";

/** A boolean flag that tests a structural property of the draft. */
export type PredicateFlag = "complete" | "incomplete" | "legal" | "illegal";

/**
 * A single search predicate. Multiple predicates are AND-ed together.
 * The parsedQuery text field holds any remaining free-text tokens.
 */
export type Predicate =
  | { kind: "text"; value: string }
  | { kind: "field"; field: PredicateField; value: string }
  | { kind: "flag"; flag: PredicateFlag }
  | { kind: "format"; value: string }
  | { kind: "updated_within"; days: number };

// =============================================================================
// Query / result types
// =============================================================================

/** The result of parsing a raw search input string. */
export interface ParsedQuery {
  /** Structured predicates extracted from the input. */
  predicates: Predicate[];
  /**
   * Remaining free-text after extracting predicates.
   * This is the concatenated value of all `kind: "text"` predicates — kept
   * here for convenience so callers do not need to filter predicates.
   */
  text: string;
}

/** Describes why a draft matched a query — surfaced in the results UI. */
export interface MatchReason {
  /** Human-readable field label, e.g. "species", "move", "name". */
  field: string;
  /**
   * Snippet from the matched value, for display in the results row.
   * Optional — may be omitted for flag/format matches.
   */
  snippet?: string;
}

/** A draft that satisfied all predicates in a query. */
export interface DraftMatch {
  /** The draft's stable routing id. */
  id: string;
  /**
   * Relevance score — higher is more relevant.
   * 0 for an empty-query match. Used for result ordering.
   */
  score: number;
  /** Reasons the draft matched — surfaces in the results UI. */
  reasons: MatchReason[];
  /**
   * Species strings for slots that contributed a match.
   * Used by the sprite strip to highlight which pokemon matched.
   */
  matchedSpecies: string[];
}

/** A suggestion shown in the search dropdown while the user is typing. */
export interface SearchSuggestion {
  /** Group label, e.g. "Fields", "Flags", "Formats", "Species". */
  group: string;
  /** Human-readable display label for the suggestion. */
  label: string;
  /** Text to insert into the search field when the user picks this suggestion. */
  insert: string;
}
