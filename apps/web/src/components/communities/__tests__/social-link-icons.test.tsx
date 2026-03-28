import { render } from "@testing-library/react";
import { PlatformIcon, SOCIAL_SVG_PATHS } from "../social-link-icons";
import { SOCIAL_LINK_PLATFORMS } from "@trainers/validators";
import { socialSvgPaths } from "@trainers/utils";

// Platforms that have brand SVG paths defined
const PLATFORMS_WITH_ICONS = SOCIAL_LINK_PLATFORMS.filter(
  (p) => socialSvgPaths[p]
);

// Platforms that should render the globe fallback
const PLATFORMS_WITH_GLOBE = SOCIAL_LINK_PLATFORMS.filter(
  (p) => !socialSvgPaths[p]
);

describe("PlatformIcon", () => {
  it("re-exports data from @trainers/utils", () => {
    // Verify the re-export works — SOCIAL_SVG_PATHS should reference the same data
    expect(SOCIAL_SVG_PATHS).toBe(socialSvgPaths);
  });

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
      expect(path).toHaveAttribute("d", socialSvgPaths[platform]);
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
