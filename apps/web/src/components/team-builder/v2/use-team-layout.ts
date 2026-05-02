"use client";

import { useSyncExternalStore } from "react";

import { useIsMobile } from "@/hooks/use-mobile";

// =============================================================================
// Types
// =============================================================================

export type TeamLayoutMode = "1x6" | "2x3" | "3x2-mid" | "3x2-stack";

const STORAGE_KEY = "tg.team-layout";
const DEFAULT_MODE: TeamLayoutMode = "1x6";
const VALID_MODES: readonly TeamLayoutMode[] = [
  "1x6",
  "2x3",
  "3x2-mid",
  "3x2-stack",
];

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
  mode: TeamLayoutMode;
  setMode: (next: TeamLayoutMode) => void;
  persisted: TeamLayoutMode;
  isMobileLocked: boolean;
}

/**
 * Returns the user's team layout preference and a setter that persists to
 * localStorage. On phone viewports the effective mode is forced to
 * `3x2-stack` regardless of the persisted value, but the persisted value
 * is preserved (so toggling back to desktop restores it).
 */
export function useTeamLayout(): UseTeamLayoutResult {
  const isMobile = useIsMobile();
  const persisted = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const mode: TeamLayoutMode = isMobile ? "3x2-stack" : persisted;

  function setMode(next: TeamLayoutMode) {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      emit();
    } catch {
      // localStorage unavailable — graceful degradation, in-memory snapshot
      // won't update either, which is the desired behaviour
    }
  }

  return { mode, setMode, persisted, isMobileLocked: isMobile };
}
