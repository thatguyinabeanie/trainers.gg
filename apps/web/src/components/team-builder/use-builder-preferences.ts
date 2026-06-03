"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  builderPreferencesSchema,
  DEFAULT_BUILDER_PREFERENCES,
  type BuilderPreferences,
} from "@trainers/validators";

import {
  getBuilderPreferencesAction,
  updateBuilderPreferencesAction,
} from "@/actions/builder-preferences";

const STORAGE_KEY = "trainersgg.builder.preferences.v1";

function readLocal(): BuilderPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return builderPreferencesSchema.parse(JSON.parse(raw));
  } catch {
    // Non-fatal — malformed JSON or schema validation failure.
    return null;
  }
}

function writeLocal(prefs: BuilderPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Non-fatal — quota / private mode.
  }
}

export interface UseBuilderPreferences {
  preferences: BuilderPreferences;
  setPreferences: (next: BuilderPreferences) => void;
  /** True until the account fetch (when signed in) has resolved. */
  loading: boolean;
}

/**
 * Resolves the effective builder preferences. Signed in: account wins, with a
 * localStorage mirror. Signed out: localStorage only. On sign-in with no
 * account row, an existing local value is adopted to the account.
 */
export function useBuilderPreferences(
  isAuthenticated: boolean
): UseBuilderPreferences {
  const [preferences, setPreferencesState] = useState<BuilderPreferences>(
    DEFAULT_BUILDER_PREFERENCES
  );
  // Start true for everyone so consumers gating on `loading` (e.g. the
  // builder's load-time auto-open) wait until BOTH the post-mount localStorage
  // hydration and the account reconciliation have run. If this started false
  // for signed-out users, a load-time check could fire against the default
  // preferences before the localStorage value was applied.
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage post-mount (avoid SSR hydration mismatch).
  // This synchronous setState-in-effect is the same blessed pattern as
  // use-builder-state.ts — a lazy useState initializer would reintroduce the
  // hydration mismatch. The eslint-disable is REQUIRED (the rule is error-level)
  // — do not strip it.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const local = readLocal();
    if (local) setPreferencesState(local);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Reconcile with the account when signed in.
  useEffect(() => {
    if (!isAuthenticated) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    let cancelled = false;
    // setState calls below run AFTER an await (not synchronously in the effect
    // body), so set-state-in-effect does not fire.
    void (async () => {
      const result = await getBuilderPreferencesAction();
      if (cancelled) return;
      if (result.success && result.data.preferences) {
        // Account wins.
        setPreferencesState(result.data.preferences);
        writeLocal(result.data.preferences);
      } else if (result.success && !result.data.preferences) {
        // No account row — adopt local if present.
        const local = readLocal();
        if (local) {
          void updateBuilderPreferencesAction(local);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  function setPreferences(next: BuilderPreferences): void {
    setPreferencesState(next);
    writeLocal(next);
    if (isAuthenticated) {
      void updateBuilderPreferencesAction(next).then((r) => {
        if (!r.success) toast.error(r.error ?? "Failed to save settings.");
      });
    }
  }

  return { preferences, setPreferences, loading };
}
