/** Stat key names matching the Pokemon object field naming convention. */
export type StatKey =
  | "hp"
  | "attack"
  | "defense"
  | "specialAttack"
  | "specialDefense"
  | "speed";

/** A set of six numeric stat values (EVs, IVs, or base stats). */
export interface StatValues {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

/** Ordered stat keys for iteration. */
export const STAT_KEYS: readonly StatKey[] = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];

/** Display labels for each stat. */
export const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  specialAttack: "SpA",
  specialDefense: "SpD",
  speed: "Spe",
};

/**
 * Tailwind text-color classes for each stat — HP=red, Atk=orange, Def=amber,
 * SpA=blue, SpD=green, Spe=pink. Applied as `text-*` so bar fills (via
 * `bg-current`), slider thumbs and bump rings all inherit via `currentColor`.
 */
export const STAT_COLOR_CLASS: Record<StatKey, string> = {
  hp: "text-rose-500 dark:text-rose-400",
  attack: "text-orange-500 dark:text-orange-400",
  defense: "text-amber-500 dark:text-amber-400",
  specialAttack: "text-sky-500 dark:text-sky-400",
  specialDefense: "text-emerald-500 dark:text-emerald-400",
  speed: "text-fuchsia-500 dark:text-fuchsia-400",
};
