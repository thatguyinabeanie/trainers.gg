/**
 * Shared color palette for trainers.gg
 * Used by both web (Tailwind CSS 4) and mobile (NativeWind/Tailwind 3)
 */

export const colors = {
  // Primary - Teal
  primary: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    200: "#99f6e4",
    300: "#5eead4",
    400: "#2dd4bf",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    800: "#115e59",
    900: "#134e4a",
    950: "#042f2e",
    DEFAULT: "#14b8a6",
    foreground: "#ffffff",
  },

  // Secondary - Neutral
  secondary: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#e5e5e5",
    300: "#d4d4d4",
    400: "#a3a3a3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
    950: "#0a0a0a",
    DEFAULT: "#f5f5f5",
    foreground: "#171717",
  },

  // Accent - same as primary for consistency
  accent: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    200: "#99f6e4",
    300: "#5eead4",
    400: "#2dd4bf",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    800: "#115e59",
    900: "#134e4a",
    950: "#042f2e",
    DEFAULT: "#f5f5f5",
    foreground: "#171717",
  },

  // Destructive - Red for errors/danger
  destructive: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
    950: "#450a0a",
    DEFAULT: "#ef4444",
    foreground: "#ffffff",
  },

  // Muted - for subtle elements
  muted: {
    DEFAULT: "#f5f5f5",
    foreground: "#737373",
  },

  // Semantic colors
  background: "#ffffff",
  foreground: "#171717",
  border: "#e5e5e5",
  input: "#e5e5e5",
  ring: "#14b8a6",

  // Card
  card: {
    DEFAULT: "#ffffff",
    foreground: "#171717",
  },

  // Popover
  popover: {
    DEFAULT: "#ffffff",
    foreground: "#171717",
  },
} as const;

// Dark mode overrides
export const darkColors = {
  background: "#171717",
  foreground: "#fafafa",
  border: "rgba(255, 255, 255, 0.1)",
  input: "rgba(255, 255, 255, 0.15)",
  ring: "#2dd4bf",

  primary: {
    ...colors.primary,
    DEFAULT: "#2dd4bf",
    foreground: "#171717",
  },

  secondary: {
    ...colors.secondary,
    DEFAULT: "#262626",
    foreground: "#fafafa",
  },

  accent: {
    ...colors.accent,
    DEFAULT: "#262626",
    foreground: "#fafafa",
  },

  muted: {
    DEFAULT: "#262626",
    foreground: "#a3a3a3",
  },

  card: {
    DEFAULT: "#262626",
    foreground: "#fafafa",
  },

  popover: {
    DEFAULT: "#262626",
    foreground: "#fafafa",
  },
} as const;

export type Colors = typeof colors;
export type DarkColors = typeof darkColors;
