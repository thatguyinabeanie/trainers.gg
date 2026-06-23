/**
 * search-parse.ts
 *
 * Pure, framework-free search input parser and suggestion generator for the
 * team-builder landing search subsystem.
 *
 * `parseSearchInput` turns a raw string into a `ParsedQuery` (predicates + text).
 * `getSuggestions` returns grouped, sorted completions for the current input.
 */

import { type LocalDraftRecord } from "../persistence/local-drafts-types";
import {
  type ParsedQuery,
  type Predicate,
  type PredicateField,
  type PredicateFlag,
  type SearchSuggestion,
} from "./search-types";

// =============================================================================
// Constants
// =============================================================================

/** Max suggestions returned per group. */
const MAX_PER_GROUP = 8;

const FIELD_KEYS: readonly PredicateField[] = [
  "name",
  "species",
  "ability",
  "item",
  "move",
  "tera",
] as const;

const FLAG_KEYS: readonly PredicateFlag[] = [
  "complete",
  "incomplete",
  "legal",
  "illegal",
] as const;

// =============================================================================
// Tokenizer
// =============================================================================

/**
 * Split input into tokens, respecting double-quoted values.
 *
 * Examples:
 *   `species:gholdengo` → ["species:gholdengo"]
 *   `"trick room"` → ['"trick room"']
 *   `move:protect name:"Sun Team"` → ["move:protect", 'name:"Sun Team"']
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === " " && !inQuotes) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
}

/** Strip surrounding double-quotes from a value token. */
function unquote(value: string): string {
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value.slice(1, -1);
  }
  return value;
}

// =============================================================================
// Token parser
// =============================================================================

/**
 * Parse a single token into a `Predicate`, or `null` if it falls back to text.
 */
function parseToken(token: string): Predicate {
  // Detect key:value syntax
  const colonIdx = token.indexOf(":");
  if (colonIdx > 0) {
    const key = token.slice(0, colonIdx).toLowerCase();
    const rawValue = token.slice(colonIdx + 1);
    const value = unquote(rawValue);

    // Field predicates: name, species, ability, item, move, tera
    if ((FIELD_KEYS as readonly string[]).includes(key)) {
      return { kind: "field", field: key as PredicateField, value };
    }

    // Format predicate
    if (key === "format") {
      return { kind: "format", value };
    }

    // Flag predicate: is:complete|incomplete|legal|illegal
    if (key === "is") {
      const flag = value.toLowerCase();
      if ((FLAG_KEYS as readonly string[]).includes(flag)) {
        return { kind: "flag", flag: flag as PredicateFlag };
      }
      // Unrecognized is: value → fall through to text
    }

    // updated:<N>d predicate
    if (key === "updated") {
      const match = /^(\d+)d$/i.exec(value);
      if (match?.[1] !== undefined) {
        const days = parseInt(match[1], 10);
        if (!isNaN(days) && days > 0) {
          return { kind: "updated_within", days };
        }
      }
      // Unrecognized updated: value → fall through to text
    }

    // Unknown key: → treat entire token as text
  }

  return { kind: "text", value: unquote(token) };
}

// =============================================================================
// Public: parseSearchInput
// =============================================================================

/**
 * Parse a raw search input string into a structured `ParsedQuery`.
 *
 * Recognised token forms:
 * - `key:value` where key ∈ {name, species, ability, item, move, tera} → field predicate
 * - `format:value` → format predicate
 * - `is:complete|incomplete|legal|illegal` → flag predicate
 * - `updated:<N>d` → updated_within predicate
 * - All other tokens → text predicate; concatenated into `text`
 *
 * Values may be double-quoted to include spaces: `move:"Trick Room"`.
 * Unknown `key:` prefixes fall back to free text.
 */
export function parseSearchInput(input: string): ParsedQuery {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { predicates: [], text: "" };
  }

  const tokens = tokenize(trimmed);
  const predicates: Predicate[] = [];
  const textParts: string[] = [];

  for (const token of tokens) {
    const predicate = parseToken(token);
    predicates.push(predicate);
    if (predicate.kind === "text") {
      textParts.push(predicate.value);
    }
  }

  return {
    predicates,
    text: textParts.join(" "),
  };
}

// =============================================================================
// Public: getSuggestions
// =============================================================================

/**
 * Return grouped, sorted search suggestions based on the current input and the
 * set of local drafts.
 *
 * Groups returned (in order):
 * 1. "Fields" — all field keys (name, species, ability, item, move, tera)
 * 2. "Flags" — all is: flags (complete, incomplete, legal, illegal)
 * 3. "Formats" — distinct format values present in the drafts (sorted, capped)
 * 4. "Species" — distinct species present in any slot of any draft (sorted, capped)
 *
 * The suggestions are deterministic and sorted within each group.
 * Each group is capped at `MAX_PER_GROUP` entries.
 *
 * @param input - The current raw search input (used to determine the last token for context)
 * @param records - The current set of local draft records
 */
export function getSuggestions(
  input: string,
  records: readonly LocalDraftRecord[]
): SearchSuggestion[] {
  const suggestions: SearchSuggestion[] = [];

  // --- Fields group ---
  for (const field of FIELD_KEYS.slice(0, MAX_PER_GROUP)) {
    suggestions.push({
      group: "Fields",
      label: `${field}:`,
      insert: `${field}:`,
    });
  }

  // --- Flags group ---
  for (const flag of FLAG_KEYS.slice(0, MAX_PER_GROUP)) {
    suggestions.push({
      group: "Flags",
      label: `is:${flag}`,
      insert: `is:${flag}`,
    });
  }

  // --- Formats group ---
  const formatSet = new Set<string>();
  for (const record of records) {
    if (record.team.format) {
      formatSet.add(record.team.format);
    }
  }
  const formats = Array.from(formatSet).sort().slice(0, MAX_PER_GROUP);
  for (const fmt of formats) {
    suggestions.push({
      group: "Formats",
      label: `format:${fmt}`,
      insert: `format:${fmt}`,
    });
  }

  // --- Species group ---
  const speciesSet = new Set<string>();
  for (const record of records) {
    for (const slot of record.team.team_pokemon) {
      if (slot.pokemon?.species) {
        speciesSet.add(slot.pokemon.species);
      }
    }
  }
  const speciesList = Array.from(speciesSet).sort().slice(0, MAX_PER_GROUP);
  for (const species of speciesList) {
    suggestions.push({
      group: "Species",
      label: `species:${species}`,
      insert: `species:${species}`,
    });
  }

  return suggestions;
}
