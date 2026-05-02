"use client";

/**
 * TypePill — wordless round type symbol used wherever the editor surfaces
 * a Pokémon type. Backed by `<TypeSymbolIcon>` (lucide glyph on a
 * type-colored background) so the chip is text-free and translates without
 * needing localized assets.
 */

import { TypeSymbolIcon } from "../type-symbol-icon";

interface TypePillProps {
  t: string;
  /** Diameter of the round icon in pixels. Defaults to 24 (h-6 equivalent). */
  size?: number;
}

export function TypePill({ t, size = 24 }: TypePillProps) {
  return (
    <TypeSymbolIcon
      type={t as Parameters<typeof TypeSymbolIcon>[0]["type"]}
      size={size}
    />
  );
}
