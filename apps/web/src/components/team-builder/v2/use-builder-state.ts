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

type DrawerKey = "matchups" | "speed" | null;

interface BuilderState {
  activeIdx: number;
  setActiveIdx: (idx: number) => void;
  calcOpen: boolean;
  setCalcOpen: (updater: boolean | ((prev: boolean) => boolean)) => void;
  drawer: DrawerKey;
  setDrawer: (drawer: DrawerKey) => void;
  panelHeightPct: number;
  setPanelHeightPct: (n: number) => void;
  calcDrawerWidth: number;
  setCalcDrawerWidth: (n: number) => void;
  field: FieldState;
  setField: (field: FieldState) => void;
  defenderOverrides: DefenderOverrides;
  setDefenderOverrides: (overrides: DefenderOverrides) => void;
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

const CALC_DRAWER_WIDTH_STORAGE_KEY = "trainersgg.builder.calcDrawerWidth.v1";

const DEFAULT_CALC_DRAWER_WIDTH = 380;
const MIN_CALC_DRAWER_WIDTH = 320;
const MAX_CALC_DRAWER_WIDTH = 640;

function clampCalcDrawerWidth(n: number): number {
  if (Number.isNaN(n)) return DEFAULT_CALC_DRAWER_WIDTH;
  return Math.min(MAX_CALC_DRAWER_WIDTH, Math.max(MIN_CALC_DRAWER_WIDTH, n));
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
  const [calcOpen, setCalcOpen] = useState(true);
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
  const [calcDrawerWidth, setCalcDrawerWidthState] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_CALC_DRAWER_WIDTH;
    try {
      const stored = localStorage.getItem(CALC_DRAWER_WIDTH_STORAGE_KEY);
      if (stored !== null) {
        return clampCalcDrawerWidth(parseInt(stored, 10));
      }
    } catch {
      // localStorage unavailable — use default
    }
    return DEFAULT_CALC_DRAWER_WIDTH;
  });
  const [field, setField] = useState<FieldState>(DEFAULT_FIELD);
  const [defenderOverrides, setDefenderOverrides] = useState<DefenderOverrides>(
    {}
  );
  function setPanelHeightPct(n: number) {
    const clamped = clampPanelHeight(n);
    setPanelHeightPctState(clamped);
    try {
      localStorage.setItem(PANEL_HEIGHT_STORAGE_KEY, String(clamped));
    } catch {
      // Storage write failure is non-fatal — height just won't persist
    }
  }

  function setCalcDrawerWidth(n: number) {
    const clamped = clampCalcDrawerWidth(n);
    setCalcDrawerWidthState(clamped);
    try {
      localStorage.setItem(CALC_DRAWER_WIDTH_STORAGE_KEY, String(clamped));
    } catch {
      // Storage write failure is non-fatal — width just won't persist
    }
  }

  return {
    activeIdx,
    setActiveIdx,
    calcOpen,
    setCalcOpen,
    drawer,
    setDrawer,
    panelHeightPct,
    setPanelHeightPct,
    calcDrawerWidth,
    setCalcDrawerWidth,
    field,
    setField,
    defenderOverrides,
    setDefenderOverrides,
  };
}
