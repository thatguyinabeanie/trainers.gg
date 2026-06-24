"use client";

/**
 * use-landing-prefs.ts
 *
 * React hook for reading and updating the builder landing UI preferences.
 *
 * Hydration strategy:
 * - `prefs` is read via `useSyncExternalStore` — server snapshot returns
 *   DEFAULT_LANDING_PREFS; client snapshot returns the live localStorage value.
 * - `hydrated` is derived from `useIsClient()` — true once mounted on the client.
 * - `setPrefs` calls `patchLandingPrefs` which writes to localStorage and calls
 *   `notify()` in the store, driving a re-render via the subscription.
 *
 * No setState-in-effect, no manual re-sync. Per react-patterns.md.
 */

import { useSyncExternalStore } from "react";
import { type LandingPrefs } from "./landing-prefs-types";
import {
  subscribePrefs,
  getPrefsSnapshot,
  getPrefsServerSnapshot,
  patchLandingPrefs,
} from "./landing-prefs-store";
import { useIsClient } from "@/hooks/use-is-client";

// =============================================================================
// Return type
// =============================================================================

/** Return value of `useLandingPrefs`. */
export interface UseLandingPrefsReturn {
  /** Current landing preferences (defaults until hydrated). */
  prefs: LandingPrefs;
  /** True once the initial hydration from localStorage is complete. */
  hydrated: boolean;
  /**
   * Merge a partial update into the current preferences, persist, and
   * trigger a re-render via the store subscription.
   */
  setPrefs: (partial: Partial<LandingPrefs>) => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for reading and updating the builder landing UI preferences.
 *
 * Uses `useSyncExternalStore` against the shared subscription in
 * landing-prefs-store.ts. The server snapshot is DEFAULT_LANDING_PREFS;
 * the client snapshot is the live merged value from localStorage.
 *
 * @returns `{ prefs, hydrated, setPrefs }`
 */
export function useLandingPrefs(): UseLandingPrefsReturn {
  const prefs = useSyncExternalStore(
    subscribePrefs,
    getPrefsSnapshot,
    getPrefsServerSnapshot
  );
  const hydrated = useIsClient();

  function setPrefs(partial: Partial<LandingPrefs>): void {
    // patchLandingPrefs writes to localStorage and calls notify() in the store,
    // which invalidates the cache and triggers a re-render via the subscription.
    patchLandingPrefs(partial);
  }

  return { prefs, hydrated, setPrefs };
}
