export const LIMITLESS_TO_FORMAT: Record<string, string> = {
  "M-A": "gen9championsvgc2026regma",
  SVI: "gen9vgc2025regi",
  SVH: "gen9vgc2024regh",
  SVG: "gen9vgc2024regg",
  SVF: "gen9vgc2024regf",
  SVE: "gen9vgc2024rege",
  VGC23: "gen9vgc2023regd",
  "23S3": "gen9vgc2023regc",
  "23S2": "gen9vgc2023regb",
  "23S1": "gen9vgc2023rega",
  VGC22: "gen8vgc2022",
};

export const KNOWN_FORMATS = new Set(Object.keys(LIMITLESS_TO_FORMAT));

export const ALL_VALID_FORMATS = new Set([
  ...KNOWN_FORMATS,
  ...Object.values(LIMITLESS_TO_FORMAT),
]);

/**
 * Limitless format codes we never want to import — bespoke tournaments that
 * don't map to any Showdown format. Treated like an empty format code at sync
 * time and filtered out at queue-pick time so they never spam the import logs.
 */
export const SKIP_FORMATS = new Set(["CUSTOM"]);
