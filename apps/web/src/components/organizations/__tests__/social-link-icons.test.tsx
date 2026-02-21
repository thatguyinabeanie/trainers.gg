import { render } from "@testing-library/react";
import {
  PlatformIcon,
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_SVG_PATHS,
} from "../social-link-icons";
import {
  SOCIAL_LINK_PLATFORMS,
  type SocialLinkPlatform,
} from "@trainers/validators";

// Platforms that have brand SVG paths defined
const PLATFORMS_WITH_ICONS = Object.keys(
  SOCIAL_SVG_PATHS
) as SocialLinkPlatform[];

// Platforms that should render the globe fallback
const PLATFORMS_WITH_GLOBE: SocialLinkPlatform[] = SOCIAL_LINK_PLATFORMS.filter(
  (p) => !SOCIAL_SVG_PATHS[p]
);

describe("social-link-icons", () => {
  describe("SOCIAL_PLATFORM_LABELS", () => {
    it("has a label for every platform in SOCIAL_LINK_PLATFORMS", () => {
      for (const platform of SOCIAL_LINK_PLATFORMS) {
        expect(SOCIAL_PLATFORM_LABELS[platform]).toBeDefined();
        expect(typeof SOCIAL_PLATFORM_LABELS[platform]).toBe("string");
        expect(SOCIAL_PLATFORM_LABELS[platform].length).toBeGreaterThan(0);
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
    ] as [SocialLinkPlatform, string][])(
      "maps %s to '%s'",
      (platform, expected) => {
        expect(SOCIAL_PLATFORM_LABELS[platform]).toBe(expected);
      }
    );
  });

  describe("SOCIAL_SVG_PATHS", () => {
    it.each(PLATFORMS_WITH_ICONS)(
      "has a non-empty SVG path for %s",
      (platform) => {
        expect(typeof SOCIAL_SVG_PATHS[platform]).toBe("string");
        expect(SOCIAL_SVG_PATHS[platform]!.length).toBeGreaterThan(0);
      }
    );

    it.each(PLATFORMS_WITH_GLOBE)(
      "does not have an SVG path for %s (falls back to globe)",
      (platform) => {
        expect(SOCIAL_SVG_PATHS[platform]).toBeUndefined();
      }
    );
  });

  describe("PlatformIcon", () => {
    it.each(PLATFORMS_WITH_ICONS)(
      "renders a brand SVG with fill for %s",
      (platform) => {
        const { container } = render(<PlatformIcon platform={platform} />);
        const svg = container.querySelector("svg");

        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
        expect(svg).toHaveAttribute("fill", "currentColor");
        expect(svg).toHaveAttribute("aria-hidden", "true");

        // Brand icons use a single <path> element with the SVG path data
        const path = svg!.querySelector("path");
        expect(path).toBeInTheDocument();
        expect(path).toHaveAttribute("d", SOCIAL_SVG_PATHS[platform]);
      }
    );

    it.each(PLATFORMS_WITH_GLOBE)(
      "renders the globe fallback SVG for %s",
      (platform) => {
        const { container } = render(<PlatformIcon platform={platform} />);
        const svg = container.querySelector("svg");

        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
        expect(svg).toHaveAttribute("fill", "none");
        expect(svg).toHaveAttribute("stroke", "currentColor");
        expect(svg).toHaveAttribute("aria-hidden", "true");

        // Globe icon contains a <circle> element
        const circle = svg!.querySelector("circle");
        expect(circle).toBeInTheDocument();
      }
    );

    it("applies the default className 'h-4 w-4'", () => {
      const { container } = render(<PlatformIcon platform="discord" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("h-4", "w-4");
    });

    it("applies a custom className", () => {
      const { container } = render(
        <PlatformIcon platform="discord" className="h-6 w-6 text-blue-500" />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("h-6", "w-6", "text-blue-500");
    });
  });
});
