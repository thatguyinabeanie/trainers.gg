"use client";

import { useState } from "react";

export type Weather = "none" | "sun" | "rain" | "sand" | "snow";
export type SortColumn = "base" | "speed";
export type SortDir = "desc" | "asc";
export type NatureToggle = "positive" | "neutral" | "negative";

export interface SideModifiers {
  tailwind: boolean;
  scarf: boolean;
  unburden: boolean;
  stage: number;
  status: "healthy" | "paralyzed";
  evs: number | null;
  nature: NatureToggle;
}

export interface ToggleState {
  yours: SideModifiers;
  theirs: SideModifiers;
  weather: Weather;
  trickRoom: boolean;
  sortBy: SortColumn;
  sortDir: SortDir;
}

const DEFAULT_SIDE: SideModifiers = {
  tailwind: false,
  scarf: false,
  unburden: false,
  stage: 0,
  status: "healthy",
  evs: 0,
  nature: "neutral",
};

export const DEFAULT_TOGGLE: ToggleState = {
  yours: { ...DEFAULT_SIDE },
  theirs: { ...DEFAULT_SIDE },
  weather: "none",
  trickRoom: false,
  sortBy: "speed",
  sortDir: "desc",
};

/**
 * Shared speed-tiers toggle state. Lifted out of the panel so the side pane
 * and dialog presentations operate on one instance — switching presentation
 * (pop-out / collapse-to-sidepane) never resets weather/modifiers/sort.
 */
export function useSpeedTiersToggle() {
  const [toggle, setToggle] = useState<ToggleState>(DEFAULT_TOGGLE);
  return { toggle, setToggle };
}
