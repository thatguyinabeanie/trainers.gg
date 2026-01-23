/**
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

export const lightColors: MobileColorScheme = {
  "background": "#ffffff",
  "foreground": "#0a0a0a",
  "card": {
    "DEFAULT": "#ffffff",
    "foreground": "#0a0a0a"
  },
  "popover": {
    "DEFAULT": "#ffffff",
    "foreground": "#0a0a0a"
  },
  "primary": {
    "DEFAULT": "#1b9388",
    "foreground": "#f2fbf9"
  },
  "secondary": {
    "DEFAULT": "#f4f4f5",
    "foreground": "#18181b"
  },
  "muted": {
    "DEFAULT": "#f5f5f5",
    "foreground": "#737373"
  },
  "accent": {
    "DEFAULT": "#f5f5f5",
    "foreground": "#171717"
  },
  "destructive": {
    "DEFAULT": "#df2225",
    "foreground": "#fafafa"
  },
  "border": "#e5e5e5",
  "input": "#e5e5e5",
  "ring": "#a1a1a1",
  "chart": {
    "1": "#54e9d2",
    "2": "#31d2be",
    "3": "#1db6a5",
    "4": "#1b9388",
    "5": "#00766e"
  },
  "sidebar": {
    "DEFAULT": "#fafafa",
    "foreground": "#0a0a0a",
    "primary": "#1b9388",
    "primary-foreground": "#f2fbf9",
    "accent": "#f5f5f5",
    "accent-foreground": "#171717",
    "border": "#e5e5e5",
    "ring": "#a1a1a1"
  }
};

export const darkColors: MobileColorScheme = {
  "background": "#0a0a0a",
  "foreground": "#fafafa",
  "card": {
    "DEFAULT": "#171717",
    "foreground": "#fafafa"
  },
  "popover": {
    "DEFAULT": "#171717",
    "foreground": "#fafafa"
  },
  "primary": {
    "DEFAULT": "#1db6a5",
    "foreground": "#0b2f2e"
  },
  "secondary": {
    "DEFAULT": "#27272a",
    "foreground": "#fafafa"
  },
  "muted": {
    "DEFAULT": "#262626",
    "foreground": "#a1a1a1"
  },
  "accent": {
    "DEFAULT": "#404040",
    "foreground": "#fafafa"
  },
  "destructive": {
    "DEFAULT": "#ff6467",
    "foreground": "#fafafa"
  },
  "border": "#ffffff",
  "input": "#ffffff",
  "ring": "#737373",
  "chart": {
    "1": "#54e9d2",
    "2": "#31d2be",
    "3": "#1db6a5",
    "4": "#1b9388",
    "5": "#00766e"
  },
  "sidebar": {
    "DEFAULT": "#171717",
    "foreground": "#fafafa",
    "primary": "#31d2be",
    "primary-foreground": "#0b2f2e",
    "accent": "#262626",
    "accent-foreground": "#fafafa",
    "border": "#ffffff",
    "ring": "#737373"
  }
};

/** @deprecated Use lightColors instead */
export const colors = lightColors;

/** @deprecated Use MobileColorScheme instead */
export type MobileColors = MobileColorScheme;
