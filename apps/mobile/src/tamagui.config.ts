import { config } from "@tamagui/config";
import { createTamagui } from "tamagui";
import {
  lightColors,
  darkColors,
  type MobileColorScheme,
} from "@trainers/theme/mobile";

/**
 * Tamagui configuration for trainers.gg mobile app
 * Extends the base Tamagui config with our semantic color tokens
 *
 * Both light and dark themes use the teal primary color defined
 * in packages/theme/src/primitives/colors.oklch.ts
 */

// Helper to build Tamagui theme from our color tokens
function buildTheme(colors: MobileColorScheme) {
  return {
    background: colors.background,
    backgroundHover: colors.muted.DEFAULT,
    backgroundPress: colors.muted.DEFAULT,
    backgroundFocus: colors.muted.DEFAULT,
    backgroundStrong: colors.card.DEFAULT,
    backgroundTransparent: "transparent",

    color: colors.foreground,
    colorHover: colors.foreground,
    colorPress: colors.foreground,
    colorFocus: colors.foreground,
    colorTransparent: "transparent",

    borderColor: colors.border,
    borderColorHover: colors.ring,
    borderColorFocus: colors.primary.DEFAULT,
    borderColorPress: colors.border,

    placeholderColor: colors.muted.foreground,

    // Semantic colors for easy access
    primary: colors.primary.DEFAULT,
    primaryForeground: colors.primary.foreground,
    secondary: colors.secondary.DEFAULT,
    secondaryForeground: colors.secondary.foreground,
    muted: colors.muted.DEFAULT,
    mutedForeground: colors.muted.foreground,
    accent: colors.accent.DEFAULT,
    accentForeground: colors.accent.foreground,
    destructive: colors.destructive.DEFAULT,
    destructiveForeground: colors.destructive.foreground,
    card: colors.card.DEFAULT,
    cardForeground: colors.card.foreground,

    // Chart colors
    chart1: colors.chart["1"],
    chart2: colors.chart["2"],
    chart3: colors.chart["3"],
    chart4: colors.chart["4"],
    chart5: colors.chart["5"],

    // Muted variants for subtle backgrounds (10% opacity approximation)
    primaryMuted: colors.primary.DEFAULT + "1A",
    destructiveMuted: colors.destructive.DEFAULT + "1A",
  } as const;
}

const trainersLightTheme = buildTheme(lightColors);
const trainersDarkTheme = buildTheme(darkColors);

const tamaguiConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    light: {
      ...config.themes.light,
      ...trainersLightTheme,
    },
    dark: {
      ...config.themes.dark,
      ...trainersDarkTheme,
    },
  },
});

export type AppConfig = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
