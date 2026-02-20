#!/usr/bin/env node
/**
 * Penpot Token Export Script
 *
 * Converts trainers.gg OKLCH design tokens to W3C Design Tokens Community
 * Group (DTCG) format for import into Penpot.
 *
 * Run: pnpm --filter @trainers/theme export:penpot
 * Output: design/tokens/tokens.json (relative to monorepo root)
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { colors } from "../src/primitives/colors.oklch.js";
import { semanticTokens } from "../src/tokens/semantic.js";
import { oklchToHex } from "../src/utils/oklch-to-hex.js";
import type { OklchColor } from "../src/primitives/colors.oklch.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/ is at packages/theme/scripts/ — three levels up reaches monorepo root
const outputDir = join(__dirname, "../../../design/tokens");
const outputFile = join(outputDir, "tokens.json");

type DtcgColorToken = { $value: string; $type: "color" };

function toToken(color: OklchColor): DtcgColorToken {
  return { $value: oklchToHex(color), $type: "color" };
}

function paletteToGroup(
  palette: Record<string, OklchColor>
): Record<string, DtcgColorToken> {
  return Object.fromEntries(
    Object.entries(palette).map(([key, value]) => [key, toToken(value)])
  );
}

// Alpha overrides for dark mode tokens (match generate.ts special cases)
const DARK_ALPHA_OVERRIDES: Record<string, number> = {
  border: 10,
  sidebarBorder: 10,
  input: 15,
};

function semanticGroupToTokens(
  tokens: Record<string, OklchColor>,
  alphaOverrides?: Record<string, number>
): Record<string, DtcgColorToken> {
  return Object.fromEntries(
    Object.entries(tokens).map(([key, color]) => {
      const alpha = alphaOverrides?.[key];
      if (alpha !== undefined) {
        // oklchToHex drops alpha; use rgba format for alpha tokens
        const [r, g, b] = hexToRgb(oklchToHex(color));
        return [
          key,
          {
            $value: `rgba(${r}, ${g}, ${b}, ${alpha / 100})`,
            $type: "color" as const,
          },
        ];
      }
      return [key, toToken(color)];
    })
  );
}

function hexToRgb(hex: string): [number, number, number] {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    throw new Error(`hexToRgb: expected #rrggbb, got "${hex}"`);
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

const output = {
  color: {
    primary: paletteToGroup(colors.primary),
    neutral: paletteToGroup(colors.neutral),
    destructive: paletteToGroup(colors.destructive),
  },
  semantic: {
    light: paletteToGroup(
      semanticTokens.light as unknown as Record<string, OklchColor>
    ),
    dark: semanticGroupToTokens(
      semanticTokens.dark as unknown as Record<string, OklchColor>,
      DARK_ALPHA_OVERRIDES
    ),
  },
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputFile, JSON.stringify(output, null, 2) + "\n");

const tokenCount =
  Object.values(output.color).reduce(
    (sum, g) => sum + Object.keys(g).length,
    0
  ) +
  Object.values(output.semantic).reduce(
    (sum, g) => sum + Object.keys(g).length,
    0
  );

console.log(`✅ Exported ${tokenCount} tokens to ${outputFile}`);
