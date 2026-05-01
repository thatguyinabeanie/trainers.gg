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

export type DrawerKey = "matchups" | "speed" | "calc" | null;

interface BuilderState {
  activeIdx: number;
  setActiveIdx: (idx: number) => void;
  drawer: DrawerKey;
  setDrawer: (drawer: DrawerKey) => void;
  panelHeightPct: number;
  setPanelHeightPct: (n: number) => void;
  field: FieldState;
  setField: (field: FieldState) => void;
  defenderOverrides: DefenderOverrides;
  setDefenderOverrides: (overrides: DefenderOverrides) => void;
  // Calc-specific workspace state
  attackerSlot: number | null;
  setAttackerSlot: (idx: number | null) => void;
  faintedYours: number;
  setFaintedYours: (n: number) => void;
  faintedTheirs: number;
  setFaintedTheirs: (n: number) => void;
}

// =============================================================================
// Constants
// =============================================================================

const PANEL_HEIGHT_STORAGE_KEY = "trainersgg.builder.panelHeightPct.v1";

const DEFAULT_PANEL_HEIGHT_PCT = 40;
const MIN_PANEL_HEIGHT_PCT = 20;
const MAX_PANEL_HEIGHT_PCT = 80;

function clampPanelHeight(n: number): number {
  if (Number.isNaN(n)) return DEFAULT_PANEL_HEIGHT_PCT;
  return Math.min(MAX_PANEL_HEIGHT_PCT, Math.max(MIN_PANEL_HEIGHT_PCT, n));
}

// Calc workspace tweaks — persisted alongside panelHeightPct
const ATTACKER_SLOT_STORAGE_KEY = "trainersgg.builder.attackerSlot.v1";
const FAINTED_YOURS_STORAGE_KEY = "trainersgg.builder.faintedYours.v1";
const FAINTED_THEIRS_STORAGE_KEY = "trainersgg.builder.faintedTheirs.v1";

function clampFainted(n: number): number {
  return Math.min(5, Math.max(0, Math.round(n)));
}

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
 * panelHeightPct persists to localStorage; all other state is ephemeral.
 */
export function useBuilderState(): BuilderState {
  const [activeIdx, setActiveIdx] = useState(0);
  const [drawer, setDrawer] = useState<DrawerKey>(null);
  const [panelHeightPct, setPanelHeightPctState] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_PANEL_HEIGHT_PCT;
    try {
      const stored = localStorage.getItem(PANEL_HEIGHT_STORAGE_KEY);
      if (stored !== null) {
        return clampPanelHeight(Number(stored));
      }
    } catch {
      // localStorage unavailable — use default
    }
    return DEFAULT_PANEL_HEIGHT_PCT;
  });
  const [field, setField] = useState<FieldState>(DEFAULT_FIELD);
  const [defenderOverrides, setDefenderOverrides] = useState<DefenderOverrides>(
    {}
  );

  // --- Calc workspace tweaks — persisted to localStorage ---
  const [attackerSlot, setAttackerSlotState] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(ATTACKER_SLOT_STORAGE_KEY);
      if (stored !== null) {
        const parsed = Number(stored);
        return Number.isNaN(parsed) ? null : parsed;
      }
    } catch {
      // localStorage unavailable — use default
    }
    return null;
  });

  const [faintedYours, setFaintedYoursState] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const stored = localStorage.getItem(FAINTED_YOURS_STORAGE_KEY);
      if (stored !== null) return clampFainted(Number(stored));
    } catch {
      // localStorage unavailable — use default
    }
    return 0;
  });

  const [faintedTheirs, setFaintedTheirsState] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const stored = localStorage.getItem(FAINTED_THEIRS_STORAGE_KEY);
      if (stored !== null) return clampFainted(Number(stored));
    } catch {
      // localStorage unavailable — use default
    }
    return 0;
  });

  function setPanelHeightPct(n: number) {
    const clamped = clampPanelHeight(n);
    setPanelHeightPctState(clamped);
    try {
      localStorage.setItem(PANEL_HEIGHT_STORAGE_KEY, String(clamped));
    } catch {
      // Storage write failure is non-fatal — height just won't persist
    }
  }

  function setAttackerSlot(idx: number | null) {
    setAttackerSlotState(idx);
    try {
      if (idx === null) {
        localStorage.removeItem(ATTACKER_SLOT_STORAGE_KEY);
      } else {
        localStorage.setItem(ATTACKER_SLOT_STORAGE_KEY, String(idx));
      }
    } catch {
      // Storage write failure is non-fatal
    }
  }

  function setFaintedYours(n: number) {
    const clamped = clampFainted(n);
    setFaintedYoursState(clamped);
    try {
      localStorage.setItem(FAINTED_YOURS_STORAGE_KEY, String(clamped));
    } catch {
      // Storage write failure is non-fatal
    }
  }

  function setFaintedTheirs(n: number) {
    const clamped = clampFainted(n);
    setFaintedTheirsState(clamped);
    try {
      localStorage.setItem(FAINTED_THEIRS_STORAGE_KEY, String(clamped));
    } catch {
      // Storage write failure is non-fatal
    }
  }

  return {
    activeIdx,
    setActiveIdx,
    drawer,
    setDrawer,
    panelHeightPct,
    setPanelHeightPct,
    field,
    setField,
    defenderOverrides,
    setDefenderOverrides,
    attackerSlot,
    setAttackerSlot,
    faintedYours,
    setFaintedYours,
    faintedTheirs,
    setFaintedTheirs,
  };
}
