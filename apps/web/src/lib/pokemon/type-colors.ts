/**
 * Pokemon type color mappings for UI elements (tera badges, type indicators).
 * Uses Tailwind classes with semi-transparent backgrounds matching the trainers.gg design system.
 */

export interface TypeStyle {
  bg: string;
  text: string;
  border: string;
}

export const typeColors: Record<string, TypeStyle> = {
  Normal: {
    bg: "bg-gray-400/20",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-400/30",
  },
  Fire: {
    bg: "bg-red-500/20",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
  },
  Water: {
    bg: "bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
  },
  Electric: {
    bg: "bg-yellow-400/20",
    text: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-400/30",
  },
  Grass: {
    bg: "bg-green-500/20",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-500/30",
  },
  Ice: {
    bg: "bg-cyan-400/20",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-400/30",
  },
  Fighting: {
    bg: "bg-orange-600/20",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-600/30",
  },
  Poison: {
    bg: "bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
  },
  Ground: {
    bg: "bg-amber-600/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-600/30",
  },
  Flying: {
    bg: "bg-indigo-400/20",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-400/30",
  },
  Psychic: {
    bg: "bg-pink-500/20",
    text: "text-pink-600 dark:text-pink-400",
    border: "border-pink-500/30",
  },
  Bug: {
    bg: "bg-lime-500/20",
    text: "text-lime-600 dark:text-lime-400",
    border: "border-lime-500/30",
  },
  Rock: {
    bg: "bg-stone-500/20",
    text: "text-stone-600 dark:text-stone-400",
    border: "border-stone-500/30",
  },
  Ghost: {
    bg: "bg-violet-600/20",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-600/30",
  },
  Dragon: {
    bg: "bg-indigo-600/20",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-600/30",
  },
  Dark: {
    bg: "bg-neutral-700/20",
    text: "text-neutral-700 dark:text-neutral-300",
    border: "border-neutral-700/30",
  },
  Steel: {
    bg: "bg-slate-400/20",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-400/30",
  },
  Fairy: {
    bg: "bg-pink-400/20",
    text: "text-pink-500 dark:text-pink-400",
    border: "border-pink-400/30",
  },
  Stellar: {
    bg: "bg-sky-400/20",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-400/30",
  },
};

/**
 * Get type style for a given Pokemon type name.
 * Falls back to Normal type colors for unknown types.
 */
export function getTypeStyle(typeName: string): TypeStyle {
  return typeColors[typeName] ?? typeColors.Normal!;
}
