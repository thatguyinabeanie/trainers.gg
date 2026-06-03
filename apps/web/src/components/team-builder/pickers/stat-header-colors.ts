/**
 * Stat colors used by both the desktop picker headers and the mobile row
 * stat line. Single source of truth — never duplicate these values.
 *
 * Color values match STAT_COLOR_CLASS in team-builder/stat-types.ts.
 * Key names are abbreviated for the picker header (atk/def/spa/spd/spe)
 * and differ from the canonical StatKey in @trainers/pokemon.
 */
export const STAT_HEADER_COLORS: Record<
  "hp" | "atk" | "def" | "spa" | "spd" | "spe" | "bst",
  string
> = {
  hp: "text-rose-500 dark:text-rose-400",
  atk: "text-orange-500 dark:text-orange-400",
  def: "text-amber-500 dark:text-amber-400",
  spa: "text-sky-500 dark:text-sky-400",
  spd: "text-emerald-500 dark:text-emerald-400",
  spe: "text-fuchsia-500 dark:text-fuchsia-400",
  // BST is a derived total, not a stat — uses default text color
  bst: "text-foreground",
};

/** Key names for STAT_HEADER_COLORS (abbreviated picker-header form). */
export type StatHeaderKey = keyof typeof STAT_HEADER_COLORS;
