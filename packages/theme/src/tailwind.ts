/**
 * Shared Tailwind theme configuration
 * Can be spread into tailwind.config.js for both web and mobile
 */

import { colors } from "./colors";

export const fontFamily = {
  sans: [
    "Noto Sans",
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
  mono: [
    "JetBrains Mono",
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Monaco",
    "Consolas",
    "Liberation Mono",
    "Courier New",
    "monospace",
  ],
};

export const borderRadius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.625rem",
  xl: "0.875rem",
  "2xl": "1rem",
  "3xl": "1.25rem",
  "4xl": "1.5rem",
};

/**
 * Shared theme extend configuration for Tailwind
 * Use in tailwind.config.js: theme: { extend: sharedTheme }
 */
export const sharedTheme = {
  colors,
  fontFamily,
  borderRadius,
};

export { colors };
