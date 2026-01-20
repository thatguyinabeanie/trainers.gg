/**
 * Shared Tailwind theme tokens for trainers.gg
 * These colors and design tokens are shared between web and mobile
 */

export const colors = {
  // Primary - Pokemon Red inspired
  primary: {
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
  },
  // Secondary - Pokemon Blue inspired
  secondary: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },
  // Accent - Pokemon Yellow inspired
  accent: {
    50: "#fefce8",
    100: "#fef9c3",
    200: "#fef08a",
    300: "#fde047",
    400: "#facc15",
    500: "#eab308",
    600: "#ca8a04",
    700: "#a16207",
    800: "#854d0e",
    900: "#713f12",
    950: "#422006",
  },
  // Neutral grays
  gray: {
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#a1a1aa",
    500: "#71717a",
    600: "#52525b",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
} as const;

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

export const spacing = {
  // Custom spacing if needed beyond Tailwind defaults
} as const;

export const borderRadius = {
  DEFAULT: "0.5rem",
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  full: "9999px",
} as const;

// CSS Variables for theming (light/dark mode)
export const cssVariables = {
  light: {
    "--background": "0 0% 100%",
    "--foreground": "240 10% 3.9%",
    "--card": "0 0% 100%",
    "--card-foreground": "240 10% 3.9%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "240 10% 3.9%",
    "--primary": "0 84.2% 60.2%",
    "--primary-foreground": "0 0% 98%",
    "--secondary": "217.2 91.2% 59.8%",
    "--secondary-foreground": "0 0% 98%",
    "--muted": "240 4.8% 95.9%",
    "--muted-foreground": "240 3.8% 46.1%",
    "--accent": "48 96.5% 53.1%",
    "--accent-foreground": "26 83.3% 14.1%",
    "--destructive": "0 84.2% 60.2%",
    "--destructive-foreground": "0 0% 98%",
    "--border": "240 5.9% 90%",
    "--input": "240 5.9% 90%",
    "--ring": "0 84.2% 60.2%",
    "--radius": "0.5rem",
  },
  dark: {
    "--background": "240 10% 3.9%",
    "--foreground": "0 0% 98%",
    "--card": "240 10% 3.9%",
    "--card-foreground": "0 0% 98%",
    "--popover": "240 10% 3.9%",
    "--popover-foreground": "0 0% 98%",
    "--primary": "0 84.2% 60.2%",
    "--primary-foreground": "0 0% 98%",
    "--secondary": "217.2 91.2% 59.8%",
    "--secondary-foreground": "0 0% 98%",
    "--muted": "240 3.7% 15.9%",
    "--muted-foreground": "240 5% 64.9%",
    "--accent": "48 96.5% 53.1%",
    "--accent-foreground": "26 83.3% 14.1%",
    "--destructive": "0 62.8% 30.6%",
    "--destructive-foreground": "0 0% 98%",
    "--border": "240 3.7% 15.9%",
    "--input": "240 3.7% 15.9%",
    "--ring": "0 84.2% 60.2%",
  },
} as const;
