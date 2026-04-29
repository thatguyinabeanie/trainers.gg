"use client";

import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

type Weather = "sun" | "rain" | "sand" | "snow" | null;
type Terrain = "grassy" | "electric" | "psychic" | "misty" | null;
type DefStatus = "healthy" | "paralyzed";
type StatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

export interface FieldState {
  doubles: boolean;
  weather: Weather;
  terrain: Terrain;
  screens: boolean;
  helpingHand: boolean;
  tailwind: boolean;
  stealthRock: boolean;
  defStage: number;
  atkStage: number;
  defStatus: DefStatus;
  atkTera: boolean;
  foesAlive: 1 | 2;
  allyAlive: boolean;
}

interface DefenderOverrides {
  nature?: string;
  item?: string;
  ability?: string;
  evs?: Partial<Record<StatKey, number>>;
  ivs?: Partial<Record<StatKey, number>>;
  hpPct?: number;
  status?: string;
}

type Density = "comfy" | "compact";
type ExpandMode = "active" | "all";

export interface Tweaks {
  density: Density;
  expandMode: ExpandMode;
  showCalc: boolean;
}

interface BuilderState {
  activeIdx: number;
  setActiveIdx: (idx: number) => void;
  calcOpen: boolean;
  setCalcOpen: (updater: boolean | ((prev: boolean) => boolean)) => void;
  drawer: "matchups" | "speed" | null;
  setDrawer: (drawer: "matchups" | "speed" | null) => void;
  field: FieldState;
  setField: (field: FieldState) => void;
  defenderOverrides: DefenderOverrides;
  setDefenderOverrides: (overrides: DefenderOverrides) => void;
  tweaks: Tweaks;
  setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
}

// =============================================================================
// Constants
// =============================================================================

const TWEAKS_STORAGE_KEY = "trainersgg.builder.tweaks.v2";

const DEFAULT_TWEAKS: Tweaks = {
  density: "comfy",
  expandMode: "active",
  showCalc: true,
};

const DEFAULT_FIELD: FieldState = {
  doubles: true,
  weather: null,
  terrain: null,
  screens: false,
  helpingHand: false,
  tailwind: false,
  stealthRock: false,
  defStage: 0,
  atkStage: 0,
  defStatus: "healthy",
  atkTera: false,
  foesAlive: 2,
  allyAlive: true,
};

// =============================================================================
// useBuilderState
// =============================================================================

/**
 * Bundles all workspace-level state for the v2 team builder.
 * Tweaks persist to localStorage; all other state is ephemeral per session.
 */
export function useBuilderState(): BuilderState {
  const [activeIdx, setActiveIdx] = useState(0);
  const [calcOpen, setCalcOpen] = useState(true);
  const [drawer, setDrawer] = useState<"matchups" | "speed" | null>(null);
  const [field, setField] = useState<FieldState>(DEFAULT_FIELD);
  const [defenderOverrides, setDefenderOverrides] = useState<DefenderOverrides>(
    {}
  );
  // Lazy initializer runs once on mount (client-only — useState initializer
  // never runs during SSR). Reads persisted tweaks from localStorage and merges
  // them with defaults so any new keys added in future versions get a fallback.
  const [tweaks, setTweaks] = useState<Tweaks>(() => {
    if (typeof window === "undefined") return DEFAULT_TWEAKS;
    try {
      const stored = localStorage.getItem(TWEAKS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Tweaks>;
        return { ...DEFAULT_TWEAKS, ...parsed };
      }
    } catch {
      // localStorage unavailable (private mode, storage quota) — use defaults
    }
    return DEFAULT_TWEAKS;
  });

  function setTweak<K extends keyof Tweaks>(key: K, value: Tweaks[K]) {
    setTweaks((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(TWEAKS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage write failure is non-fatal — tweaks just won't persist
      }
      return next;
    });
  }

  return {
    activeIdx,
    setActiveIdx,
    calcOpen,
    setCalcOpen,
    drawer,
    setDrawer,
    field,
    setField,
    defenderOverrides,
    setDefenderOverrides,
    tweaks,
    setTweak,
  };
}
