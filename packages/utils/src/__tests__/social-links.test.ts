import { socialPlatformLabels, socialSvgPaths } from "../social-links";

/**
 * Canonical list of platforms that should have entries in both maps.
 * Kept in sync with SOCIAL_LINK_PLATFORMS from @trainers/validators.
 */
const ALL_PLATFORMS = [
  "discord",
  "twitter",
  "youtube",
  "twitch",
  "tiktok",
  "instagram",
  "facebook",
  "reddit",
  "github",
  "bluesky",
  "threads",
  "mastodon",
  "linkedin",
  "patreon",
  "kofi",
  "website",
  "custom",
];

// Platforms that intentionally have no SVG path (use globe fallback)
const PLATFORMS_WITHOUT_SVG = ["website", "custom"];
const PLATFORMS_WITH_SVG = ALL_PLATFORMS.filter(
  (p) => !PLATFORMS_WITHOUT_SVG.includes(p)
);

describe("socialPlatformLabels", () => {
  it("has a non-empty label for every platform", () => {
    for (const platform of ALL_PLATFORMS) {
      const label = socialPlatformLabels[platform];
      expect(label).toBeDefined();
      expect(typeof label).toBe("string");
      expect(label!.length).toBeGreaterThan(0);
    }
  });

  it.each([
    ["discord", "Discord"],
    ["twitter", "X (Twitter)"],
    ["youtube", "YouTube"],
    ["twitch", "Twitch"],
    ["tiktok", "TikTok"],
    ["instagram", "Instagram"],
    ["facebook", "Facebook"],
    ["reddit", "Reddit"],
    ["github", "GitHub"],
    ["bluesky", "Bluesky"],
    ["threads", "Threads"],
    ["mastodon", "Mastodon"],
    ["linkedin", "LinkedIn"],
    ["patreon", "Patreon"],
    ["kofi", "Ko-fi"],
    ["website", "Website"],
    ["custom", "Custom"],
  ])("maps %s to '%s'", (platform, expected) => {
    expect(socialPlatformLabels[platform]).toBe(expected);
  });
});

describe("socialSvgPaths", () => {
  it.each(PLATFORMS_WITH_SVG)("has a non-empty SVG path for %s", (platform) => {
    const path = socialSvgPaths[platform];
    expect(typeof path).toBe("string");
    expect(path!.length).toBeGreaterThan(0);
  });

  it.each(PLATFORMS_WITHOUT_SVG)(
    "does not have an SVG path for %s (falls back to globe)",
    (platform) => {
      expect(socialSvgPaths[platform]).toBeUndefined();
    }
  );
});
