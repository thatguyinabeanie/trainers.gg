/**
 * Item data utilities for Pokemon team builder.
 * Wraps @pkmn/dex item lookups for name lists and descriptions.
 */

import { Dex } from "@pkmn/dex";

const gen9 = Dex.forGen(9);

/** All Gen 9 item names, sorted alphabetically. */
export function getAllItems(): string[] {
  return gen9.items
    .all()
    .filter((item) => item.exists && item.name)
    .map((item) => item.name)
    .sort();
}

/**
 * Get the short description of an item.
 * Returns null if the item is not found or has no description.
 */
export function getItemShortDesc(itemName: string): string | null {
  const item = gen9.items.get(itemName);
  return item?.shortDesc ?? null;
}
