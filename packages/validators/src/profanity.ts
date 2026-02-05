import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
  pattern,
  type Matcher,
} from "obscenity";

// ---------------------------------------------------------------------------
// Matcher Configuration
// ---------------------------------------------------------------------------

/**
 * Creates a profanity matcher with English dataset and recommended transformers.
 * Detects profanity, slurs, hate speech, and leetspeak obfuscation.
 */
function createMatcher(): Matcher {
  return new RegExpMatcher({
    ...englishDataset.build(),
    ...englishRecommendedTransformers,
  });
}

// Singleton matcher instance
let matcher: Matcher | null = null;

/**
 * Gets or creates the singleton matcher instance.
 */
function getMatcher(): Matcher {
  if (!matcher) {
    matcher = createMatcher();
  }
  return matcher;
}

// ---------------------------------------------------------------------------
// Profanity Detection
// ---------------------------------------------------------------------------

/**
 * Checks if text contains profanity, slurs, or hate speech.
 *
 * @param text - Text to check
 * @returns true if profanity is detected, false otherwise
 *
 * @example
 * ```typescript
 * containsProfanity("hello world"); // false
 * containsProfanity("f***"); // true
 * ```
 */
export function containsProfanity(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }
  return getMatcher().hasMatch(text);
}

/**
 * Gets all profanity matches in the text with position information.
 *
 * @param text - Text to analyze
 * @returns Array of match objects with start/end positions
 *
 * @example
 * ```typescript
 * const matches = getProfanityMatches("hello bad word");
 * // matches will contain position and match information
 * ```
 */
export function getProfanityMatches(text: string) {
  if (!text || text.trim().length === 0) {
    return [];
  }
  return getMatcher().getAllMatches(text);
}

/**
 * Censors profanity in text by replacing it with asterisks.
 *
 * @param text - Text to censor
 * @returns Text with profanity replaced by asterisks
 *
 * @example
 * ```typescript
 * censorProfanity("hello bad"); // "hello ***"
 * ```
 */
export function censorProfanity(text: string): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  const matches = getProfanityMatches(text);
  if (matches.length === 0) {
    return text;
  }

  // Sort matches in reverse order to maintain string indices while replacing
  const sortedMatches = [...matches].sort(
    (a, b) => b.startIndex - a.startIndex
  );

  let censored = text;
  for (const match of sortedMatches) {
    const length = match.endIndex - match.startIndex;
    const replacement = "*".repeat(length);
    censored =
      censored.slice(0, match.startIndex) +
      replacement +
      censored.slice(match.endIndex);
  }

  return censored;
}

// ---------------------------------------------------------------------------
// Common Profanity Patterns (for custom filtering)
// ---------------------------------------------------------------------------

/**
 * Additional patterns for context-specific filtering beyond the base dataset.
 * These can be used to extend the matcher if needed.
 */
export const CUSTOM_PATTERNS = {
  // Pokemon-specific slurs or inappropriate nicknames could be added here
  // For now, we rely on the comprehensive obscenity dataset
};

/**
 * Error message to show users when profanity is detected.
 * Does not repeat the blocked word back to the user.
 */
export const PROFANITY_ERROR_MESSAGE =
  "This text contains inappropriate content. Please remove any profanity, slurs, or offensive language.";
