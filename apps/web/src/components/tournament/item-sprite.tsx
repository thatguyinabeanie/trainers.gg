"use client";

import { getItemSpriteStyle } from "@trainers/pokemon/sprites";
import { cn } from "@/lib/utils";

interface ItemSpriteProps {
  item: string;
  size?: number;
  className?: string;
}

export function ItemSprite({ item, size = 24, className }: ItemSpriteProps) {
  if (!item) return null;

  const style = getItemSpriteStyle(item);

  return (
    <span
      className={cn("inline-block", className)}
      style={{
        ...parseStyle(style),
        width: size,
        height: size,
      }}
      title={item}
    />
  );
}

/**
 * Parse an inline CSS style string into a React CSSProperties object.
 * @pkmn/img returns a style string like "display:inline-block;width:24px;..."
 */
function parseStyle(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of style.split(";")) {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) continue;
    const key = part.slice(0, colonIdx).trim();
    const value = part.slice(colonIdx + 1).trim();
    if (!key) continue;
    // Convert kebab-case to camelCase
    const camelKey = key.replace(/-([a-z])/g, (_, c: string) =>
      c.toUpperCase()
    );
    result[camelKey] = value;
  }
  return result;
}
