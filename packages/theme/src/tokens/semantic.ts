/**
 * Semantic Token Mappings
 * Maps raw color palettes to semantic tokens for light and dark modes
 */

import type { OklchColor } from "../primitives/colors.oklch";
import { colors } from "../primitives/colors.oklch";

export interface SemanticTokens {
  background: OklchColor;
  foreground: OklchColor;
  card: OklchColor;
  cardForeground: OklchColor;
  popover: OklchColor;
  popoverForeground: OklchColor;
  primary: OklchColor;
  primaryForeground: OklchColor;
  secondary: OklchColor;
  secondaryForeground: OklchColor;
  muted: OklchColor;
  mutedForeground: OklchColor;
  accent: OklchColor;
  accentForeground: OklchColor;
  destructive: OklchColor;
  destructiveForeground: OklchColor;
  border: OklchColor;
  input: OklchColor;
  ring: OklchColor;
  chart1: OklchColor;
  chart2: OklchColor;
  chart3: OklchColor;
  chart4: OklchColor;
  chart5: OklchColor;
  sidebar: OklchColor;
  sidebarForeground: OklchColor;
  sidebarPrimary: OklchColor;
  sidebarPrimaryForeground: OklchColor;
  sidebarAccent: OklchColor;
  sidebarAccentForeground: OklchColor;
  sidebarBorder: OklchColor;
  sidebarRing: OklchColor;
}

export const lightTokens: SemanticTokens = {
  // Base
  background: { l: 1, c: 0, h: 0 },
  foreground: { l: 0.145, c: 0, h: 0 },

  // Card (slightly off-white for separation from background)
  card: colors.neutral[50], // oklch(0.985 0 0)
  cardForeground: { l: 0.145, c: 0, h: 0 },

  // Popover
  popover: { l: 1, c: 0, h: 0 },
  popoverForeground: { l: 0.145, c: 0, h: 0 },

  // Primary (Teal)
  primary: colors.primary[600], // oklch(0.60 0.10 185)
  primaryForeground: { l: 0.98, c: 0.01, h: 181 },

  // Secondary (Neutral)
  secondary: { l: 0.967, c: 0.001, h: 286.375 },
  secondaryForeground: { l: 0.21, c: 0.006, h: 285.885 },

  // Muted
  muted: colors.neutral[100], // oklch(0.97 0 0)
  mutedForeground: colors.neutral[500], // oklch(0.556 0 0)

  // Accent
  accent: colors.neutral[100], // oklch(0.97 0 0)
  accentForeground: colors.neutral[900], // oklch(0.205 0 0)

  // Destructive
  destructive: colors.destructive[500], // oklch(0.58 0.22 27)
  destructiveForeground: { l: 0.985, c: 0, h: 0 },

  // UI Elements
  border: colors.neutral[200], // oklch(0.922 0 0)
  input: colors.neutral[200], // oklch(0.922 0 0)
  ring: colors.neutral[400], // oklch(0.708 0 0)

  // Charts
  chart1: { l: 0.85, c: 0.13, h: 181 },
  chart2: { l: 0.78, c: 0.13, h: 182 },
  chart3: { l: 0.7, c: 0.12, h: 183 },
  chart4: colors.primary[600], // oklch(0.60 0.10 185)
  chart5: { l: 0.51, c: 0.09, h: 186 },

  // Sidebar
  sidebar: { l: 0.985, c: 0, h: 0 },
  sidebarForeground: { l: 0.145, c: 0, h: 0 },
  sidebarPrimary: colors.primary[600],
  sidebarPrimaryForeground: { l: 0.98, c: 0.01, h: 181 },
  sidebarAccent: colors.neutral[100],
  sidebarAccentForeground: colors.neutral[900],
  sidebarBorder: colors.neutral[200],
  sidebarRing: colors.neutral[400],
};

export const darkTokens: SemanticTokens = {
  // Base
  background: colors.neutral[950], // oklch(0.145 0 0)
  foreground: colors.neutral[50], // oklch(0.985 0 0)

  // Card
  card: colors.neutral[900], // oklch(0.205 0 0)
  cardForeground: colors.neutral[50],

  // Popover
  popover: colors.neutral[900],
  popoverForeground: colors.neutral[50],

  // Primary (Lighter teal for dark mode)
  primary: { l: 0.7, c: 0.12, h: 183 },
  primaryForeground: { l: 0.28, c: 0.04, h: 193 },

  // Secondary
  secondary: { l: 0.274, c: 0.006, h: 286.033 },
  secondaryForeground: colors.neutral[50],

  // Muted
  muted: colors.neutral[800], // oklch(0.269 0 0)
  mutedForeground: colors.neutral[400], // oklch(0.708 0 0)

  // Accent
  accent: { l: 0.371, c: 0, h: 0 },
  accentForeground: colors.neutral[50],

  // Destructive
  destructive: { l: 0.704, c: 0.191, h: 22.216 },
  destructiveForeground: colors.neutral[50],

  // UI Elements (with alpha)
  border: { l: 1, c: 0, h: 0 }, // Will be converted to oklch(1 0 0 / 10%)
  input: { l: 1, c: 0, h: 0 }, // Will be converted to oklch(1 0 0 / 15%)
  ring: colors.neutral[500],

  // Charts
  chart1: { l: 0.85, c: 0.13, h: 181 },
  chart2: { l: 0.78, c: 0.13, h: 182 },
  chart3: { l: 0.7, c: 0.12, h: 183 },
  chart4: colors.primary[600],
  chart5: { l: 0.51, c: 0.09, h: 186 },

  // Sidebar
  sidebar: colors.neutral[900],
  sidebarForeground: colors.neutral[50],
  sidebarPrimary: { l: 0.78, c: 0.13, h: 182 },
  sidebarPrimaryForeground: { l: 0.28, c: 0.04, h: 193 },
  sidebarAccent: colors.neutral[800],
  sidebarAccentForeground: colors.neutral[50],
  sidebarBorder: { l: 1, c: 0, h: 0 }, // Will be oklch(1 0 0 / 10%)
  sidebarRing: colors.neutral[500],
};

export const semanticTokens = {
  light: lightTokens,
  dark: darkTokens,
} as const;
