"use client";

import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

type Weather = "sun" | "rain" | "sand" | "snow" | null;
type Terrain = "grassy" | "electric" | "psychic" | "misty" | null;
type DefStatus = "healthy" | "paralyzed";

export interface FieldState {
  doubles: boolean;
  weather: Weather;
  terrain: Terrain;
  screens: boolean;
  helpingHand: boolean;
  tailwind: boolean;
  stealthRock: boolean;
  defStage: StatStage;
  atkStage: StatStage;
  defStatus: DefStatus;
  foesAlive: 1 | 2;
  allyAlive: boolean;
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
  setField: (patch: Partial<FieldState>) => void;
  // Calc-specific workspace state
  attackerSlot: number | null;
  setAttackerSlot: (idx: number | null) => void;
  faintedYours: number;
  setFaintedYours: (n: number) => void;
  faintedTheirs: number;
  setFaintedTheirs: (n: number) => void;
}

// =============================================================================
// localStorage helpers
// =============================================================================

function readPersisted<T>(
  key: string,
  parse: (raw: string) => T | null
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return parse(raw);
  } catch {
    return null;
  }
}

function writePersisted(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // Storage write failure is non-fatal — quota / private mode.
  }
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

function clampSlot(n: number): number {
  return Math.max(0, Math.min(5, Math.round(n)));
}

export type StatStage = -6 | -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function clampStatStage(n: number): StatStage {
  const clamped = Math.max(-6, Math.min(6, Math.round(n)));
  return clamped as StatStage;
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
  const [panelHeightPct, setPanelHeightPctState] = useState<number>(
    () =>
      readPersisted(PANEL_HEIGHT_STORAGE_KEY, (raw) => {
        const n = clampPanelHeight(Number(raw));
        return Number.isNaN(Number(raw)) ? null : n;
      }) ?? DEFAULT_PANEL_HEIGHT_PCT
  );
  const [field, setFieldState] = useState<FieldState>(DEFAULT_FIELD);

  function setField(patch: Partial<FieldState>): void {
    setFieldState((prev) => ({ ...prev, ...patch }));
  }

  // --- Calc workspace tweaks — persisted to localStorage ---
  const [attackerSlot, setAttackerSlotState] = useState<number | null>(() =>
    readPersisted(ATTACKER_SLOT_STORAGE_KEY, (raw) => {
      const parsed = Number(raw);
      return Number.isNaN(parsed) ? null : clampSlot(parsed);
    })
  );

  const [faintedYours, setFaintedYoursState] = useState<number>(
    () =>
      readPersisted(FAINTED_YOURS_STORAGE_KEY, (raw) => {
        const n = Number(raw);
        return Number.isNaN(n) ? null : clampFainted(n);
      }) ?? 0
  );

  const [faintedTheirs, setFaintedTheirsState] = useState<number>(
    () =>
      readPersisted(FAINTED_THEIRS_STORAGE_KEY, (raw) => {
        const n = Number(raw);
        return Number.isNaN(n) ? null : clampFainted(n);
      }) ?? 0
  );

  function setPanelHeightPct(n: number) {
    const clamped = clampPanelHeight(n);
    setPanelHeightPctState(clamped);
    writePersisted(PANEL_HEIGHT_STORAGE_KEY, String(clamped));
  }

  function setAttackerSlot(idx: number | null) {
    if (idx === null) {
      setAttackerSlotState(null);
      writePersisted(ATTACKER_SLOT_STORAGE_KEY, null);
      return;
    }
    const clamped = clampSlot(idx);
    setAttackerSlotState(clamped);
    writePersisted(ATTACKER_SLOT_STORAGE_KEY, String(clamped));
  }

  function setFaintedYours(n: number) {
    const clamped = clampFainted(n);
    setFaintedYoursState(clamped);
    writePersisted(FAINTED_YOURS_STORAGE_KEY, String(clamped));
  }

  function setFaintedTheirs(n: number) {
    const clamped = clampFainted(n);
    setFaintedTheirsState(clamped);
    writePersisted(FAINTED_THEIRS_STORAGE_KEY, String(clamped));
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
    attackerSlot,
    setAttackerSlot,
    faintedYours,
    setFaintedYours,
    faintedTheirs,
    setFaintedTheirs,
  };
}
