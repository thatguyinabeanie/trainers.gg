"use client";

/**
 * use-landing-prefs.ts
 *
 * React hook for reading and updating the builder landing UI preferences.
 *
 * Hydration strategy (mirrors use-local-drafts.ts):
 * - Starts with `DEFAULT_LANDING_PREFS` as initial state and `hydrated: false`
 *   to avoid SSR/hydration mismatches (the server has no access to localStorage).
 * - After mount, reads the stored value from localStorage and updates state.
 * - `hydrated` flips to `true` after the first mount effect completes.
 *
 * `setPrefs` calls `patchLandingPrefs` to merge + persist, then updates React
 * state so the UI reflects the change immediately without a re-read.
 */

import { useState, useEffect } from "react";
import { DEFAULT_LANDING_PREFS, type LandingPrefs } from "./landing-prefs-types";
import { readLandingPrefs, patchLandingPrefs } from "./landing-prefs-store";

// =============================================================================
// Return type
// =============================================================================

/** Return value of `useLandingPrefs`. */
export interface UseLandingPrefsReturn {
  /** Current landing preferences (starts as defaults until hydrated). */
  prefs: LandingPrefs;
  /** True once the initial hydration from localStorage is complete. */
  hydrated: boolean;
  /**
   * Merge a partial update into the current preferences, persist, and
   * update state immediately. Safe to call before hydration (rare edge case).
   */
  setPrefs: (partial: Partial<LandingPrefs>) => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for reading and updating the builder landing UI preferences.
 *
 * Initialises from `DEFAULT_LANDING_PREFS` to avoid SSR/hydration mismatches,
 * then hydrates from localStorage on mount.
 *
 * @returns `{ prefs, hydrated, setPrefs }`
 */
export function useLandingPrefs(): UseLandingPrefsReturn {
  const [prefs, setPrefsState] = useState<LandingPrefs>(DEFAULT_LANDING_PREFS);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrate from localStorage after mount to avoid SSR mismatch
    setPrefsState(readLandingPrefs());
    setHydrated(true);
  }, []);

  function setPrefs(partial: Partial<LandingPrefs>): void {
    const next = patchLandingPrefs(partial);
    setPrefsState(next);
  }

  return { prefs, hydrated, setPrefs };
}
