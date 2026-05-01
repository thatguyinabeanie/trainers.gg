import { type StatKey } from "@trainers/pokemon";

// Re-export canonical stat keys, ordered array, and labels from @trainers/pokemon.
export { type StatKey, STAT_KEYS, STAT_LABELS } from "@trainers/pokemon";

/** A set of six numeric stat values (EVs, IVs, or base stats). */
export interface StatValues {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

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
