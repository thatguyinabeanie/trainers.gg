"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

import { useIsMobile } from "@/hooks/use-mobile";

// =============================================================================
// Types
// =============================================================================

export type TeamLayoutMode = "single" | "2x3-vertical";

const STORAGE_KEY = "tg.team-layout";
const URL_PARAM = "layout";
const DEFAULT_MODE: TeamLayoutMode = "single";
const VALID_MODES: readonly TeamLayoutMode[] = ["single", "2x3-vertical"];

// URL-friendly aliases. We expose `single` / `grid` in shareable links
// rather than the internal mode names, which are an implementation detail.
// Legacy `compact` alias maps to `single` for back-compat with old shared links.
const MODE_TO_URL: Record<TeamLayoutMode, string> = {
  single: "single",
  "2x3-vertical": "grid",
};
const URL_TO_MODE: Partial<Record<string, TeamLayoutMode>> = {
  single: "single",
  compact: "single", // legacy alias — old shared links used `compact` for the 1x6 mode
  grid: "2x3-vertical",
};

// =============================================================================
// External store — keeps all hook consumers in sync within and across tabs
// =============================================================================

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): TeamLayoutMode {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Migrate old mode names to surviving modes.
    // Old 3-column modes → "2x3-vertical" (our remaining multi-col mode)
    if (
      raw === "3x2-stack" ||
      raw === "3x2-mid" ||
      raw === "3x2" ||
      raw === "3x2-vertical"
    ) {
      window.localStorage.setItem(STORAGE_KEY, "2x3-vertical");
      return "2x3-vertical";
    }
    // Old 2-column mode was removed — collapsed to 1x6 in a prior migration.
    // "1x6" is now retired in favour of "single" (same single-focus layout, new name).
    if (raw === "2x3" || raw === "1x6") {
      window.localStorage.setItem(STORAGE_KEY, "single");
      return "single";
    }
    if (raw && (VALID_MODES as readonly string[]).includes(raw)) {
      return raw as TeamLayoutMode;
    }
  } catch {
    // localStorage unavailable (SSR, private browsing) — fall through to default
  }
  return DEFAULT_MODE;
}

function getServerSnapshot(): TeamLayoutMode {
  return DEFAULT_MODE;
}

// =============================================================================
// Hook
// =============================================================================

interface UseTeamLayoutResult {
  /** The mode actually rendered — accounts for mobile lock. */
  mode: TeamLayoutMode;
  setMode: (next: TeamLayoutMode) => void;
  /** The user's persisted preference, regardless of mobile lock. */
  persisted: TeamLayoutMode;
  /** True when mobile viewport is forcing "single" mode regardless of preference. */
  isMobileLocked: boolean;
}

/**
 * Returns the user's team layout preference and a setter that persists to
 * localStorage and mirrors to the `?layout=` URL parameter. On phone
 * viewports the effective mode is forced to `single`; the persisted value is
 * preserved so widening the viewport restores the user's pick.
 *
 * URL precedence: when `?layout=single|grid` is present it wins over
 * localStorage and is mirrored back to storage so the choice survives a
 * subsequent visit without the param. The legacy `?layout=compact` alias
 * maps to `single` for back-compat with old shared links.
 */
export function useTeamLayout(): UseTeamLayoutResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const persistedFromStorage = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const urlValue = searchParams.get(URL_PARAM);
  const urlMode = urlValue ? URL_TO_MODE[urlValue] : undefined;

  // Mirror a valid URL value into localStorage so the choice persists past
  // the current navigation. Guard on inequality to avoid an infinite emit
  // loop and to skip writes when storage already matches.
  useEffect(() => {
    if (urlMode && urlMode !== persistedFromStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, urlMode);
        emit();
      } catch {
        // localStorage unavailable — silent fallthrough
      }
    }
  }, [urlMode, persistedFromStorage]);

  const persisted: TeamLayoutMode = urlMode ?? persistedFromStorage;
  const mode: TeamLayoutMode = isMobile ? "single" : persisted;

  function setMode(next: TeamLayoutMode) {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      emit();
    } catch {
      // localStorage unavailable — graceful degradation
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set(URL_PARAM, MODE_TO_URL[next]);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return {
    mode,
    setMode,
    persisted,
    isMobileLocked: isMobile,
  };
}

// =============================================================================
// TeamLayoutContext — consumed by IdentityLane (and any other component that
// needs to know the effective grid layout mode without prop-drilling).
//
// Default value: "single". Tests that mount components directly without a
// provider get this default, which matches the persisted-default constant.
// =============================================================================

export const TeamLayoutContext = createContext<TeamLayoutMode>(DEFAULT_MODE);

/**
 * Read the effective team-layout mode from context. Returns "single" when no
 * provider is mounted (the default that matches the persisted default).
 */
export function useTeamLayoutMode(): TeamLayoutMode {
  return useContext(TeamLayoutContext);
}
