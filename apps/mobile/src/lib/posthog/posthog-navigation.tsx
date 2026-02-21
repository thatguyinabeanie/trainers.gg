import { useEffect, useRef } from "react";
import { usePathname, useSegments } from "expo-router";
import { getPostHog } from "@/lib/posthog/client";

/**
 * Tracks screen views in PostHog using Expo Router's navigation state.
 * Captures a `$screen` event on each pathname change.
 */
export function PostHogNavigation() {
  const pathname = usePathname();
  const segments = useSegments();
  const posthog = getPostHog();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    if (!posthog) return;
    if (pathname === previousPathname.current) return;

    previousPathname.current = pathname;

    posthog.screen(pathname, {
      $screen_name: pathname,
      segments: segments.join("/"),
    });
  }, [posthog, pathname, segments]);

  return null;
}
