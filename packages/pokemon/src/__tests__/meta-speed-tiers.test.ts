import {
  getMetaSpeedTiers,
  type MetaSpeedEntry,
  type SpeedAbility,
} from "../meta-speed-tiers";

const VALID_ABILITIES: ReadonlySet<SpeedAbility> = new Set<SpeedAbility>([
  "chlorophyll",
  "swift-swim",
  "sand-rush",
  "slush-rush",
  "speed-boost",
  "unburden",
  "quick-feet",
]);

describe("getMetaSpeedTiers — championsvgc2026regma", () => {
  let entries: MetaSpeedEntry[];

  beforeAll(() => {
    entries = getMetaSpeedTiers("championsvgc2026regma");
  });

  it("returns a curated list (target ~30, must be 20–40)", () => {
    expect(entries.length).toBeGreaterThanOrEqual(20);
    expect(entries.length).toBeLessThanOrEqual(40);
  });

  it("populates required fields on every entry", () => {
    for (const e of entries) {
      expect(e.species.length).toBeGreaterThan(0);
      expect(e.displayName.length).toBeGreaterThan(0);
      expect(e.base).toBeGreaterThanOrEqual(1);
      expect(e.fastSpread).toBeGreaterThanOrEqual(e.slowSpread);
    }
  });

  it("uses lowercase, no-space species ids (Showdown convention)", () => {
    for (const e of entries) {
      // Showdown ids are alphanumeric (with hyphens for forms like indeedee-f).
      // Forbid uppercase, underscores, and spaces.
      expect(e.species).toBe(e.species.toLowerCase());
      expect(e.species).not.toMatch(/_/);
      expect(e.species).not.toMatch(/\s/);
    }
  });

  it("does not contain duplicate species ids", () => {
    const ids = entries.map((e) => e.species);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes a sensible spread of fast / mid / slow species", () => {
    expect(entries.some((e) => e.base >= 130)).toBe(true);
    expect(entries.some((e) => e.base >= 80 && e.base < 130)).toBe(true);
    expect(entries.some((e) => e.base < 60)).toBe(true);
  });

  it("entries with speedAbility use a valid ability id", () => {
    const withAbility = entries.filter((e) => e.speedAbility !== undefined);
    expect(withAbility.length).toBeGreaterThan(0);
    for (const e of withAbility) {
      expect(VALID_ABILITIES.has(e.speedAbility!)).toBe(true);
    }
  });
});

describe("getMetaSpeedTiers — unknown formats", () => {
  it("returns an empty array for an unknown format id", () => {
    expect(getMetaSpeedTiers("nonexistent-format-xyz")).toEqual([]);
  });

  it("returns an empty array for the empty string", () => {
    expect(getMetaSpeedTiers("")).toEqual([]);
  });
});
