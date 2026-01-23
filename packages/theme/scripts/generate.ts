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
    ])
  ),
  dark: Object.fromEntries(
    Object.entries(semanticTokens.dark).map(([key, value]) => [
      key,
      oklchToHex(value),
    ])
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

// ============================================================================
// Generate Mobile Theme (CJS-compatible JavaScript for NativeWind)
// ============================================================================

// Helper to build color object from semantic tokens
function buildMobileColors(mode: "light" | "dark") {
  const tokens = semanticHex[mode];
  return {
    // Semantic tokens (shadcn/ui naming convention)
    background: tokens.background,
    foreground: tokens.foreground,

    card: {
      DEFAULT: tokens.card,
      foreground: tokens.cardForeground,
    },

    popover: {
      DEFAULT: tokens.popover,
      foreground: tokens.popoverForeground,
    },

    primary: {
      DEFAULT: tokens.primary,
      foreground: tokens.primaryForeground,
    },

    secondary: {
      DEFAULT: tokens.secondary,
      foreground: tokens.secondaryForeground,
    },

    muted: {
      DEFAULT: tokens.muted,
      foreground: tokens.mutedForeground,
    },

    accent: {
      DEFAULT: tokens.accent,
      foreground: tokens.accentForeground,
    },

    destructive: {
      DEFAULT: tokens.destructive,
      foreground: tokens.destructiveForeground,
    },

    border: tokens.border,
    input: tokens.input,
    ring: tokens.ring,

    // Chart colors
    chart: {
      1: tokens.chart1,
      2: tokens.chart2,
      3: tokens.chart3,
      4: tokens.chart4,
      5: tokens.chart5,
    },

    // Sidebar (for mobile drawer)
    sidebar: {
      DEFAULT: tokens.sidebar,
      foreground: tokens.sidebarForeground,
      primary: tokens.sidebarPrimary,
      "primary-foreground": tokens.sidebarPrimaryForeground,
      accent: tokens.sidebarAccent,
      "accent-foreground": tokens.sidebarAccentForeground,
      border: tokens.sidebarBorder,
      ring: tokens.sidebarRing,
    },
  };
}

const mobileColors = buildMobileColors("light");
const mobileDarkColors = buildMobileColors("dark");

const mobileThemeCjsContent = `/**
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Generated from packages/theme/src/tokens/semantic.ts
 * 
 * Mobile theme for NativeWind/Tailwind CSS 3
 * CommonJS format for compatibility with Metro bundler
 */

const colors = ${JSON.stringify(mobileColors, null, 2)};

const borderRadius = {
  DEFAULT: "0.625rem",
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.625rem",
  xl: "0.875rem",
  "2xl": "1rem",
  "3xl": "1.25rem",
  "4xl": "1.5rem",
  full: "9999px",
};

const fontFamily = {
  sans: ["Inter", "System"],
  mono: ["monospace"],
};

module.exports = {
  colors,
  borderRadius,
  fontFamily,
};
`;

writeFileSync(join(generatedDir, "mobile-theme.cjs"), mobileThemeCjsContent);
console.log("✅ Generated mobile-theme.cjs");

// Also generate TypeScript version for use in app code
const mobileThemeTsContent = `/**
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Generated from packages/theme/src/tokens/semantic.ts
 * 
 * Mobile theme colors for use in React Native components
 * Includes both light and dark mode colors
 */

/** Color structure type with string values (for use as function parameter) */
export interface MobileColorScheme {
  background: string;
  foreground: string;
  card: { DEFAULT: string; foreground: string };
  popover: { DEFAULT: string; foreground: string };
  primary: { DEFAULT: string; foreground: string };
  secondary: { DEFAULT: string; foreground: string };
  muted: { DEFAULT: string; foreground: string };
  accent: { DEFAULT: string; foreground: string };
  destructive: { DEFAULT: string; foreground: string };
  border: string;
  input: string;
  ring: string;
  chart: { 1: string; 2: string; 3: string; 4: string; 5: string };
  sidebar: {
    DEFAULT: string;
    foreground: string;
    primary: string;
    "primary-foreground": string;
    accent: string;
    "accent-foreground": string;
    border: string;
    ring: string;
  };
}

export const lightColors: MobileColorScheme = ${JSON.stringify(mobileColors, null, 2)};

export const darkColors: MobileColorScheme = ${JSON.stringify(mobileDarkColors, null, 2)};

/** @deprecated Use lightColors instead */
export const colors = lightColors;

/** @deprecated Use MobileColorScheme instead */
export type MobileColors = MobileColorScheme;
`;

writeFileSync(join(generatedDir, "mobile-theme.ts"), mobileThemeTsContent);
console.log("✅ Generated mobile-theme.ts");

console.log("\n🎉 Theme generation complete!\n");
