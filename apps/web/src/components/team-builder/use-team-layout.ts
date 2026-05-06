"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

import { useIsMobile } from "@/hooks/use-mobile";

// =============================================================================
// Types
// =============================================================================

export type TeamLayoutMode = "1x6" | "2x3-vertical";

const STORAGE_KEY = "tg.team-layout";
const DEFAULT_MODE: TeamLayoutMode = "1x6";
const VALID_MODES: readonly TeamLayoutMode[] = [
  "1x6",
  "2x3-vertical",
];

// Viewport thresholds for auto-degrading the persisted grid mode. The
// numbers are total viewport widths (not slot widths) — the choice of
// columns has to happen before the slots can know their own width. Each
// threshold corresponds to ~700px per cell after sidebar + padding.
const MIN_VIEWPORT_FOR_3_COLS = 2200;

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
    if (raw === "3x2-stack" || raw === "3x2-mid" || raw === "3x2" || raw === "3x2-vertical") {
      window.localStorage.setItem(STORAGE_KEY, "2x3-vertical");
      return "2x3-vertical";
    }
    // Old 2-column mode was removed — collapse to 1x6.
    if (raw === "2x3") {
      window.localStorage.setItem(STORAGE_KEY, "1x6");
      return "1x6";
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
// Viewport-width store — drives auto-degrade based on browser width
// =============================================================================

function subscribeToViewport(callback: () => void) {
  // rAF-coalesce burst resize events into one notification per frame so
  // every IdentityLane consumer of useTeamLayoutMode doesn't re-render at
  // browser-resize cadence (~60Hz) while the user is dragging the window.
  let rafId = 0;
  const handler = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(callback);
  };
  window.addEventListener("resize", handler);
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("resize", handler);
  };
}

function getViewportSnapshot(): number {
  return window.innerWidth;
}

function getServerViewportSnapshot(): number {
  // SSR fallback — pick a wide value so the persisted preference renders
  // as-is on the server (no degrade). Hydration corrects to actual width.
  return MIN_VIEWPORT_FOR_3_COLS;
}

// =============================================================================
// Auto-degrade
// =============================================================================

/**
 * Reduce a persisted layout to one that fits the viewport. 3-column modes
 * step down to 2 columns at 1500–2199, then to 1 column under 1500.
 * 2-column modes step down to 1 column under 1500. 1-column modes pass
 * through.
 */
function degradeForViewport(
  persisted: TeamLayoutMode,
  viewportWidth: number
): TeamLayoutMode {
  if (persisted === "2x3-vertical" && viewportWidth < MIN_VIEWPORT_FOR_3_COLS) {
    return "1x6";
  }
  return persisted;
}

// =============================================================================
// Hook
// =============================================================================

interface UseTeamLayoutResult {
  /** The mode actually rendered — accounts for mobile + viewport degrade. */
  mode: TeamLayoutMode;
  setMode: (next: TeamLayoutMode) => void;
  /** The user's persisted preference, regardless of overrides. */
  persisted: TeamLayoutMode;
  /** True when mobile viewport is forcing 1×6 regardless of preference. */
  isMobileLocked: boolean;
  /** True when the viewport is too narrow to honour persisted column count. */
  isAutoDegraded: boolean;
}

/**
 * Returns the user's team layout preference and a setter that persists to
 * localStorage. On phone viewports the effective mode is forced to `1x6`.
 * On non-mobile viewports the effective mode is auto-degraded when the
 * viewport is too narrow for the persisted column count to render with
 * usable cell widths — the persisted value is preserved so widening the
 * viewport restores the user's pick.
 */
export function useTeamLayout(): UseTeamLayoutResult {
  const isMobile = useIsMobile();
  const persisted = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const viewportWidth = useSyncExternalStore(
    subscribeToViewport,
    getViewportSnapshot,
    getServerViewportSnapshot
  );

  let mode: TeamLayoutMode;
  let isAutoDegraded = false;

  if (isMobile) {
    mode = "1x6";
  } else {
    const degraded = degradeForViewport(persisted, viewportWidth);
    mode = degraded;
    isAutoDegraded = degraded !== persisted;
  }

  function setMode(next: TeamLayoutMode) {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      emit();
    } catch {
      // localStorage unavailable — graceful degradation, in-memory snapshot
      // won't update either, which is the desired behaviour
    }
  }

  return {
    mode,
    setMode,
    persisted,
    isMobileLocked: isMobile,
    isAutoDegraded,
  };
}

// =============================================================================
// TeamLayoutContext — consumed by IdentityLane (and any other component that
// needs to know the effective grid layout mode without prop-drilling).
//
// Default value: "1x6". Tests that mount components directly without a
// provider get this default, which matches the persisted-default constant.
// =============================================================================

export const TeamLayoutContext = createContext<TeamLayoutMode>("1x6");

/**
 * Read the effective team-layout mode from context. Returns "1x6" when no
 * provider is mounted (the default that matches the persisted default).
 */
export function useTeamLayoutMode(): TeamLayoutMode {
  return useContext(TeamLayoutContext);
}
