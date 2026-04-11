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
