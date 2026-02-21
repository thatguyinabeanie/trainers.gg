"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

/**
 * Tracks pageviews on client-side navigation.
 * Next.js App Router doesn't trigger full page loads on navigation,
 * so we capture $pageview events manually when the URL changes.
 *
 * Must be rendered inside <PostHogProvider> and wrapped in <Suspense>
 * because useSearchParams() suspends during static rendering.
 */
export function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (pathname && posthog) {
      try {
        let url = window.origin + pathname;
        const search = searchParams.toString();
        if (search) {
          url = url + "?" + search;
        }
        posthog.capture("$pageview", { $current_url: url });
      } catch (e) {
        console.error("PostHog pageview capture failed:", e);
      }
    }
  }, [pathname, searchParams, posthog]);

  return null;
}
