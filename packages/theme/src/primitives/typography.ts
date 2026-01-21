/**
 * Typography configuration
 * Shared font families for web and mobile
 */

export const fontFamily = {
  sans: [
    "Inter",
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
} as const;

export const borderRadius = {
  DEFAULT: "0.625rem", // 10px
  sm: "0.375rem", // 6px
  md: "0.5rem", // 8px
  lg: "0.625rem", // 10px
  xl: "0.875rem", // 14px
  "2xl": "1rem", // 16px
  "3xl": "1.25rem", // 20px
  "4xl": "1.5rem", // 24px
  full: "9999px",
} as const;
