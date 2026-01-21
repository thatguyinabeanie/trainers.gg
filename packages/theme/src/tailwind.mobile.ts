/**
 * Tailwind configuration for mobile (NativeWind)
 *
 * Exports theme configuration optimized for React Native
 */

import { colors } from "./generated/colors.hex.js";
import { borderRadius } from "./primitives/typography.js";

export const mobileTheme = {
  colors: {
    // Color scales
    primary: colors.primary,
    neutral: colors.neutral,
    destructive: colors.destructive,

    // Semantic tokens (using hex values)
    background: "#ffffff",
    foreground: "#171717",
    border: "#e5e5e5",
    input: "#e5e5e5",
    ring: colors.primary[600],

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

    // Muted
    muted: {
      DEFAULT: "#f5f5f5",
      foreground: "#737373",
    },

    // Accent
    accent: {
      DEFAULT: "#f5f5f5",
      foreground: "#171717",
    },

    // Secondary
    secondary: {
      DEFAULT: "#f5f5f5",
      foreground: "#171717",
    },
  },
  fontFamily: {
    sans: ["Inter", "System"],
    mono: ["monospace"],
  },
  borderRadius,
} as const;

export type MobileTheme = typeof mobileTheme;
