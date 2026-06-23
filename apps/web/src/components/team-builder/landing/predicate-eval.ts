/**
 * predicate-eval.ts
 *
 * Pure, framework-free predicate evaluator for the team-builder landing search.
 * Shared by the live search field and smart-folder criteria evaluation.
 *
 * AND semantics: a draft must satisfy every predicate to appear in results.
 * All string comparisons are case-insensitive substring unless noted otherwise.
 */

import { type LocalDraftRecord } from "../persistence/local-drafts-types";
import {
  type DraftMatch,
  type MatchReason,
  type ParsedQuery,
} from "./search-types";

// =============================================================================
// Internal helpers
// =============================================================================

/** Case-insensitive substring test. */
function containsCI(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Returns the pokemon rows that are "filled" — slot is non-null AND has a
 * truthy species string.
 */
function filledSlots(
  record: LocalDraftRecord
): Array<NonNullable<LocalDraftRecord["team"]["team_pokemon"][number]["pokemon"]> & {
  _species: string;
}> {
  const result: Array<
    NonNullable<LocalDraftRecord["team"]["team_pokemon"][number]["pokemon"]> & {
      _species: string;
    }
  > = [];
  for (const slot of record.team.team_pokemon) {
    if (slot.pokemon !== null && slot.pokemon.species) {
      result.push({ ...slot.pokemon, _species: slot.pokemon.species });
    }
  }
  return result;
}

// =============================================================================
// Flag helpers
// =============================================================================

/**
 * A draft is "complete" when it has exactly 6 filled slots (non-null pokemon
 * with truthy species) and every filled slot has both a truthy ability AND a
 * truthy move1.
 */
function isComplete(record: LocalDraftRecord): boolean {
  const slots = filledSlots(record);
  if (slots.length !== 6) return false;
  return slots.every((p) => !!p.ability && !!p.move1);
}

/**
 * A draft is "illegal" when the team-level format_legal is false, OR when any
 * filled pokemon has format_legal === false.
 */
function isIllegal(record: LocalDraftRecord): boolean {
  if (record.team.format_legal === false) return true;
  return filledSlots(record).some((p) => p.format_legal === false);
}

// =============================================================================
// Per-predicate evaluation
// =============================================================================

interface EvalResult {
  matched: boolean;
  reasons: MatchReason[];
  matchedSpecies: string[];
  score: number;
}

function evalText(record: LocalDraftRecord, value: string): EvalResult {
  const reasons: MatchReason[] = [];
  const matchedSpecies: string[] = [];
  let score = 0;

  // Match on team name
  if (containsCI(record.team.name, value)) {
    reasons.push({ field: "name", snippet: record.team.name });
    score += 10;
  }

  // Match on any filled slot's species
  for (const pkmn of filledSlots(record)) {
    if (containsCI(pkmn._species, value)) {
      reasons.push({ field: "species", snippet: pkmn._species });
      if (!matchedSpecies.includes(pkmn._species)) {
        matchedSpecies.push(pkmn._species);
      }
      score += 5;
    }
  }

  return {
    matched: reasons.length > 0,
    reasons,
    matchedSpecies,
    score,
  };
}

function evalField(
  record: LocalDraftRecord,
  field: string,
  value: string
): EvalResult {
  const reasons: MatchReason[] = [];
  const matchedSpecies: string[] = [];
  let score = 0;

  if (field === "name") {
    if (containsCI(record.team.name, value)) {
      reasons.push({ field: "name", snippet: record.team.name });
      score += 10;
    }
    return { matched: reasons.length > 0, reasons, matchedSpecies, score };
  }

  for (const pkmn of filledSlots(record)) {
    let fieldValue: string | null | undefined;
    let fieldName = field;

    switch (field) {
      case "species":
        fieldValue = pkmn._species;
        break;
      case "ability":
        fieldValue = pkmn.ability;
        break;
      case "item":
        fieldValue = pkmn.held_item;
        fieldName = "item";
        break;
      case "tera":
        fieldValue = pkmn.tera_type;
        break;
      case "move":
        // Match against any of the four move slots
        {
          const moves = [pkmn.move1, pkmn.move2, pkmn.move3, pkmn.move4].filter(Boolean);
          const matchedMove = moves.find((m) => containsCI(m ?? null, value));
          if (matchedMove) {
            reasons.push({ field: "move", snippet: matchedMove });
            if (!matchedSpecies.includes(pkmn._species)) {
              matchedSpecies.push(pkmn._species);
            }
            score += 5;
          }
        }
        continue;
      default:
        continue;
    }

    if (containsCI(fieldValue, value)) {
      reasons.push({ field: fieldName, snippet: fieldValue ?? undefined });
      if (!matchedSpecies.includes(pkmn._species)) {
        matchedSpecies.push(pkmn._species);
      }
      score += 5;
    }
  }

  return { matched: reasons.length > 0, reasons, matchedSpecies, score };
}

function evalFlag(record: LocalDraftRecord, flag: string): EvalResult {
  let matched = false;
  switch (flag) {
    case "complete":
      matched = isComplete(record);
      break;
    case "incomplete":
      matched = !isComplete(record);
      break;
    case "illegal":
      matched = isIllegal(record);
      break;
    case "legal":
      matched = !isIllegal(record);
      break;
    default:
      matched = false;
  }
  return {
    matched,
    reasons: matched ? [{ field: "flag", snippet: flag }] : [],
    matchedSpecies: [],
    score: matched ? 1 : 0,
  };
}

function evalFormat(record: LocalDraftRecord, value: string): EvalResult {
  const matched = containsCI(record.team.format, value);
  return {
    matched,
    reasons: matched
      ? [{ field: "format", snippet: record.team.format ?? undefined }]
      : [],
    matchedSpecies: [],
    score: matched ? 1 : 0,
  };
}

function evalUpdatedWithin(record: LocalDraftRecord, days: number): EvalResult {
  const elapsed = Date.now() - Date.parse(record.updatedAt);
  const matched = elapsed <= days * 86_400_000;
  return {
    matched,
    reasons: matched ? [{ field: "updated_within", snippet: `${days}d` }] : [],
    matchedSpecies: [],
    score: matched ? 1 : 0,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Evaluate a single draft against a parsed query.
 *
 * Returns a `DraftMatch` if the draft satisfies ALL predicates (AND semantics),
 * or `null` if it is excluded by any predicate.
 *
 * An empty query (`predicates: []`, `text: ""`) matches everything with score 0
 * and no reasons.
 */
export function evaluateDraft(
  record: LocalDraftRecord,
  query: ParsedQuery
): DraftMatch | null {
  const { predicates } = query;

  if (predicates.length === 0) {
    return { id: record.id, score: 0, reasons: [], matchedSpecies: [] };
  }

  const allReasons: MatchReason[] = [];
  const allMatchedSpecies: string[] = [];
  let totalScore = 0;

  for (const predicate of predicates) {
    let result: EvalResult;

    switch (predicate.kind) {
      case "text":
        result = evalText(record, predicate.value);
        break;
      case "field":
        result = evalField(record, predicate.field, predicate.value);
        break;
      case "flag":
        result = evalFlag(record, predicate.flag);
        break;
      case "format":
        result = evalFormat(record, predicate.value);
        break;
      case "updated_within":
        result = evalUpdatedWithin(record, predicate.days);
        break;
    }

    if (!result.matched) {
      // AND semantics: one failure excludes the draft
      return null;
    }

    allReasons.push(...result.reasons);
    for (const species of result.matchedSpecies) {
      if (!allMatchedSpecies.includes(species)) {
        allMatchedSpecies.push(species);
      }
    }
    totalScore += result.score;
  }

  return {
    id: record.id,
    score: totalScore,
    reasons: allReasons,
    matchedSpecies: allMatchedSpecies,
  };
}

/**
 * Filter and rank a list of drafts against a parsed query.
 *
 * Returns matched drafts sorted by score descending (stable sort — ties
 * preserve their original order).
 */
export function filterDrafts(
  records: readonly LocalDraftRecord[],
  query: ParsedQuery
): DraftMatch[] {
  const matches: DraftMatch[] = [];
  for (const record of records) {
    const match = evaluateDraft(record, query);
    if (match !== null) {
      matches.push(match);
    }
  }
  // Stable sort: preserve index order among ties via a secondary key
  return matches
    .map((m, i) => ({ m, i }))
    .sort((a, b) => b.m.score - a.m.score || a.i - b.i)
    .map(({ m }) => m);
}
