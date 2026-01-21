#!/usr/bin/env node
/**
 * Theme Generation Script
 *
 * Generates:
 * - Hex color values for mobile/NativeWind
 * - CSS variables for web
 * - Dark mode variants
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { colors } from "../src/primitives/colors.oklch.js";
import { semanticTokens } from "../src/tokens/semantic.js";
import {
  oklchToHex,
  oklchToCss,
  paletteToHex,
} from "../src/utils/oklch-to-hex.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedDir = join(__dirname, "../src/generated");

// Ensure generated directory exists
mkdirSync(generatedDir, { recursive: true });

console.log("🎨 Generating theme files...\n");

// ============================================================================
// Generate Hex Colors for Mobile
// ============================================================================

const hexColors = {
  primary: paletteToHex(colors.primary),
  neutral: paletteToHex(colors.neutral),
  destructive: paletteToHex(colors.destructive),
};

const hexColorsContent = `/**
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Generated from packages/theme/src/primitives/colors.oklch.ts
 * 
 * Hex color values for mobile/NativeWind compatibility
 */

export const colors = ${JSON.stringify(hexColors, null, 2)} as const;

export type HexColors = typeof colors;
`;

writeFileSync(join(generatedDir, "colors.hex.ts"), hexColorsContent);
console.log("✅ Generated colors.hex.ts");

// ============================================================================
// Generate CSS Variables
// ============================================================================

function generateCssVars(mode: "light" | "dark"): string {
  const tokens = semanticTokens[mode];
  let css = "";

  for (const [key, value] of Object.entries(tokens)) {
    // Convert camelCase to kebab-case
    const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();

    // Special handling for border and input in dark mode (with alpha)
    if (mode === "dark" && (key === "border" || key === "sidebarBorder")) {
      css += `  --${cssKey}: ${oklchToCss(value, 10)};\n`;
    } else if (mode === "dark" && key === "input") {
      css += `  --${cssKey}: ${oklchToCss(value, 15)};\n`;
    } else {
      css += `  --${cssKey}: ${oklchToCss(value)};\n`;
    }
  }

  return css;
}

const cssContent = `/**
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Generated from packages/theme/src/tokens/semantic.ts
 * 
 * CSS custom properties for Tailwind CSS 4 and web apps
 */

:root {
${generateCssVars("light")}
  --radius: 0.625rem;
}

.dark {
${generateCssVars("dark")}
}
`;

writeFileSync(join(generatedDir, "theme.css"), cssContent);
console.log("✅ Generated theme.css");

// ============================================================================
// Generate Semantic Tokens as Hex for Mobile Dark Mode
// ============================================================================

const semanticHex = {
  light: Object.fromEntries(
    Object.entries(semanticTokens.light).map(([key, value]) => [
      key,
      oklchToHex(value),
    ]),
  ),
  dark: Object.fromEntries(
    Object.entries(semanticTokens.dark).map(([key, value]) => [
      key,
      oklchToHex(value),
    ]),
  ),
};

const semanticHexContent = `/**
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Generated from packages/theme/src/tokens/semantic.ts
 * 
 * Semantic tokens as hex values for mobile
 */

export const semanticColors = ${JSON.stringify(semanticHex, null, 2)} as const;
`;

writeFileSync(join(generatedDir, "semantic.hex.ts"), semanticHexContent);
console.log("✅ Generated semantic.hex.ts");

console.log("\n🎉 Theme generation complete!\n");
