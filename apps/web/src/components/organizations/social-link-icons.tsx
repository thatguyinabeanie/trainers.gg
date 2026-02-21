import type { SocialLinkPlatform } from "@trainers/validators";
import { socialSvgPaths, socialPlatformLabels } from "@trainers/utils";

// Re-export data from @trainers/utils for backward compatibility
export const SOCIAL_SVG_PATHS = socialSvgPaths;
export const SOCIAL_PLATFORM_LABELS = socialPlatformLabels;

/**
 * Small inline SVG icon for a social platform.
 * Renders at the given size (default 16px). Falls back to a Globe SVG
 * for platforms without a brand icon (website, custom).
 */
export function PlatformIcon({
  platform,
  className = "h-4 w-4",
}: {
  platform: SocialLinkPlatform;
  className?: string;
}) {
  const svgPath = socialSvgPaths[platform];

  if (svgPath) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        aria-hidden="true"
        fill="currentColor"
      >
        <path d={svgPath} />
      </svg>
    );
  }

  // Globe fallback for website / custom / unknown
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
