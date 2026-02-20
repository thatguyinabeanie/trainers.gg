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
type DtcgGroup = Record<string, DtcgColorToken>;

function toToken(color: OklchColor): DtcgColorToken {
  return { $value: oklchToHex(color), $type: "color" };
}

function paletteToGroup(palette: Record<string, OklchColor>): DtcgGroup {
  return Object.fromEntries(
    Object.entries(palette).map(([key, value]) => [key, toToken(value)])
  );
}

const output = {
  color: {
    primary: paletteToGroup(colors.primary),
    neutral: paletteToGroup(colors.neutral),
    destructive: paletteToGroup(colors.destructive),
  },
  semantic: {
    light: paletteToGroup(semanticTokens.light),
    dark: paletteToGroup(semanticTokens.dark),
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
