/** Short display labels for move damage categories. */
export const CATEGORY_LABELS: Record<string, string> = {
  Physical: "P",
  Special: "S",
  Status: "—",
};

/** Tailwind text color classes for move damage categories. */
export const CATEGORY_COLORS: Record<string, string> = {
  Physical: "text-orange-500",
  Special: "text-blue-500",
  Status: "text-muted-foreground",
};

/**
 * Showdown CDN URLs for the canonical Gen-4+ move category icons
 * (orange burst = Physical, blue swirl = Special, grey oval = Status).
 * Same CDN this project already uses for type icons in @trainers/pokemon/sprites.
 */
export const CATEGORY_ICON_URLS: Record<string, string> = {
  Physical: "https://play.pokemonshowdown.com/sprites/categories/Physical.png",
  Special: "https://play.pokemonshowdown.com/sprites/categories/Special.png",
  Status: "https://play.pokemonshowdown.com/sprites/categories/Status.png",
};
