/**
 * Canonical species slug normalizer for usage-stat lookups.
 *
 * WHY this exists: The DB stores `pokemon_usage_stats.species` as lowercase-hyphen
 * slugs (e.g. "ogerpon-hearthflame", "chi-yu") sourced from the raw `team_pokemon`
 * rows written by each import pipeline. The builder's `SpeciesSearchEntry.species`
 * is the title-case dex name (e.g. "Ogerpon-Hearthflame", "Chi-Yu"). Matching
 * requires normalizing both sides to the same form — lowercase with all spaces,
 * apostrophes, and periods stripped. Hyphens are preserved because the DB slugs
 * use them as word separators.
 *
 * Call this on BOTH the dex-name side (from the picker index) AND the DB-side
 * species value (from FormatUsageRow) when building the lookup Map.
 *
 * Examples:
 *   normalizeSpeciesSlug("Ogerpon-Hearthflame") → "ogerpon-hearthflame"
 *   normalizeSpeciesSlug("ogerpon-hearthflame")  → "ogerpon-hearthflame"   (DB value)
 *   normalizeSpeciesSlug("Flabébé")              → "flabebe"               (diacritics stripped)
 *   normalizeSpeciesSlug("Mr. Mime")             → "mr-mime"               (spaces→-,  .→"")
 *   normalizeSpeciesSlug("Farfetch'd")           → "farfetchd"             (apostrophe stripped)
 *   normalizeSpeciesSlug("Type: Null")           → "type-null"             (colon stripped, space→-)
 */
export function normalizeSpeciesSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics (é→e, etc.)
    .replace(/['.,:]/g, "") // strip punctuation the DB omits
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/-+/g, "-"); // collapse consecutive hyphens
}
