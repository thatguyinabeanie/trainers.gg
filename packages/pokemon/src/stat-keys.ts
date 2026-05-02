/** Stat key names matching the Pokemon object field naming convention. */
export type StatKey =
  | "hp"
  | "attack"
  | "defense"
  | "specialAttack"
  | "specialDefense"
  | "speed";

/** Ordered stat keys for iteration. */
export const STAT_KEYS = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
] as const satisfies readonly StatKey[];

/** Display labels for each stat. */
export const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  specialAttack: "SpA",
  specialDefense: "SpD",
  speed: "Spe",
};

// Stat-investment caps. Standard formats use EVs (4 EVs = 1 stat point).
// Champions Reg M-A uses Stat Points (1:1) with a smaller budget.
export const EV_PER_STAT_MAX = 252;
export const EV_TOTAL_MAX = 510;
export const EV_STEP = 4;

export const SP_PER_STAT_MAX = 32;
export const SP_TOTAL_MAX = 66;
export const SP_STEP = 1;
