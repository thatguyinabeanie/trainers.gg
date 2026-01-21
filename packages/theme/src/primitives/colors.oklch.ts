/**
 * OKLCH Color Definitions - Source of Truth
 *
 * All colors are defined in OKLCH color space for better perceptual uniformity.
 * These values are converted to hex for mobile and CSS variables for web during build.
 *
 * OKLCH format: { l: lightness (0-1), c: chroma (0-0.4), h: hue (0-360) }
 */

export interface OklchColor {
  l: number;
  c: number;
  h: number;
}

export const tealPalette = {
  50: { l: 0.97, c: 0.02, h: 181 },
  100: { l: 0.94, c: 0.04, h: 182 },
  200: { l: 0.88, c: 0.08, h: 183 },
  300: { l: 0.8, c: 0.11, h: 183 },
  400: { l: 0.72, c: 0.13, h: 183 },
  500: { l: 0.65, c: 0.12, h: 184 },
  600: { l: 0.6, c: 0.1, h: 185 }, // Primary light mode
  700: { l: 0.55, c: 0.09, h: 186 },
  800: { l: 0.48, c: 0.07, h: 187 },
  900: { l: 0.42, c: 0.06, h: 188 },
  950: { l: 0.32, c: 0.04, h: 189 },
} as const satisfies Record<string, OklchColor>;

export const neutralPalette = {
  50: { l: 0.985, c: 0, h: 0 },
  100: { l: 0.97, c: 0, h: 0 },
  200: { l: 0.922, c: 0, h: 0 },
  300: { l: 0.863, c: 0, h: 0 },
  400: { l: 0.708, c: 0, h: 0 },
  500: { l: 0.556, c: 0, h: 0 },
  600: { l: 0.452, c: 0, h: 0 },
  700: { l: 0.371, c: 0, h: 0 },
  800: { l: 0.269, c: 0, h: 0 },
  900: { l: 0.205, c: 0, h: 0 },
  950: { l: 0.145, c: 0, h: 0 },
} as const satisfies Record<string, OklchColor>;

export const destructivePalette = {
  50: { l: 0.97, c: 0.02, h: 27 },
  100: { l: 0.94, c: 0.05, h: 27 },
  200: { l: 0.88, c: 0.1, h: 27 },
  300: { l: 0.8, c: 0.15, h: 27 },
  400: { l: 0.7, c: 0.19, h: 27 },
  500: { l: 0.58, c: 0.22, h: 27 },
  600: { l: 0.52, c: 0.21, h: 27 },
  700: { l: 0.45, c: 0.18, h: 27 },
  800: { l: 0.38, c: 0.15, h: 27 },
  900: { l: 0.32, c: 0.12, h: 27 },
  950: { l: 0.22, c: 0.08, h: 27 },
} as const satisfies Record<string, OklchColor>;

export const colors = {
  primary: tealPalette,
  neutral: neutralPalette,
  destructive: destructivePalette,
} as const;

export type ColorPalette = typeof colors;
