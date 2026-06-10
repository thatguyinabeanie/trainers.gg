"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Renders the current year for the site footer copyright line.
 *
 * new Date() is a dynamic runtime read — calling it during PPR prerender
 * (even in a Client Component's SSR pass) triggers a
 * next-prerender-current-time build error under cacheComponents.
 * useSyncExternalStore renders an empty server snapshot and fills in the
 * year at hydration.
 */
export function CopyrightYear() {
  const year = useSyncExternalStore(
    emptySubscribe,
    () => String(new Date().getFullYear()),
    () => ""
  );
  return <>{year}</>;
}
