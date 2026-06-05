import { normalizeSpeciesSlug } from "../usage-slug";

// =============================================================================
// normalizeSpeciesSlug
// =============================================================================

describe("normalizeSpeciesSlug", () => {
  // ---------------------------------------------------------------------------
  // Basic normalization — title-case dex names → lowercase-hyphen slugs
  // ---------------------------------------------------------------------------

  it("lowercases a simple species name", () => {
    expect(normalizeSpeciesSlug("Pikachu")).toBe("pikachu");
  });

  it("preserves hyphens — already-hyphenated dex names pass through unchanged", () => {
    expect(normalizeSpeciesSlug("Ogerpon-Hearthflame")).toBe(
      "ogerpon-hearthflame"
    );
  });

  it("DB slug values (already lowercase-hyphen) round-trip unchanged", () => {
    expect(normalizeSpeciesSlug("ogerpon-hearthflame")).toBe(
      "ogerpon-hearthflame"
    );
  });

  // ---------------------------------------------------------------------------
  // Spaces → hyphens
  // ---------------------------------------------------------------------------

  it("converts spaces to hyphens", () => {
    expect(normalizeSpeciesSlug("Mr. Mime")).toBe("mr-mime");
  });

  it("converts multiple spaces to a single hyphen", () => {
    expect(normalizeSpeciesSlug("Iron  Bundle")).toBe("iron-bundle");
  });

  // ---------------------------------------------------------------------------
  // Punctuation stripping
  // ---------------------------------------------------------------------------

  it("strips apostrophes (Farfetch'd, Sirfetch'd)", () => {
    expect(normalizeSpeciesSlug("Farfetch'd")).toBe("farfetchd");
    expect(normalizeSpeciesSlug("Sirfetch'd")).toBe("sirfetchd");
  });

  it("strips periods from abbreviated names", () => {
    expect(normalizeSpeciesSlug("Mr. Mime")).toBe("mr-mime");
  });

  it("strips colons (Type: Null)", () => {
    expect(normalizeSpeciesSlug("Type: Null")).toBe("type-null");
  });

  it("strips commas", () => {
    // Edge case — no known species uses commas, but the rule is general
    expect(normalizeSpeciesSlug("Foo, Bar")).toBe("foo-bar");
  });

  // ---------------------------------------------------------------------------
  // Hyphen deduplication
  // ---------------------------------------------------------------------------

  it("collapses consecutive hyphens", () => {
    // Stripping a period adjacent to a space would produce double-hyphen without dedup
    expect(normalizeSpeciesSlug("Mr. Rime")).toBe("mr-rime");
  });

  // ---------------------------------------------------------------------------
  // Real species that could have edge cases
  // ---------------------------------------------------------------------------

  it.each([
    ["Chi-Yu", "chi-yu"],
    ["Ting-Lu", "ting-lu"],
    ["Chien-Pao", "chien-pao"],
    ["Wo-Chien", "wo-chien"],
    ["Porygon-Z", "porygon-z"],
    ["Jangmo-o", "jangmo-o"],
    ["Kommo-o", "kommo-o"],
    ["Hakamo-o", "hakamo-o"],
    ["Flabébé", "flabébé"], // accented character — preserved
    ["Mime Jr.", "mime-jr"],
    ["Mr. Rime", "mr-rime"],
  ])("normalizeSpeciesSlug(%s) = %s", (input, expected) => {
    expect(normalizeSpeciesSlug(input)).toBe(expected);
  });

  // ---------------------------------------------------------------------------
  // Both sides normalize to the same key (the core contract)
  // ---------------------------------------------------------------------------

  it("dex name and DB slug both normalize to the same key", () => {
    const dexName = "Ogerpon-Hearthflame";
    const dbSlug = "ogerpon-hearthflame";
    expect(normalizeSpeciesSlug(dexName)).toBe(normalizeSpeciesSlug(dbSlug));
  });
});
