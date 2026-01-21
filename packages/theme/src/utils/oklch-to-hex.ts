/**
 * OKLCH to Hex Color Conversion Utility
 *
 * Converts OKLCH color values to hexadecimal format for use in
 * environments that don't support OKLCH (e.g., React Native).
 *
 * Based on the OKLab color space conversion algorithms.
 */

import type { OklchColor } from "../primitives/colors.oklch";

/**
 * Convert OKLCH to linear RGB
 */
function oklchToLinearRgb(color: OklchColor): [number, number, number] {
  const { l, c, h } = color;

  // Convert to OKLab
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // OKLab to linear RGB
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  return [
    +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
}

/**
 * Apply gamma correction (linear RGB to sRGB)
 */
function gammaCorrection(channel: number): number {
  const abs = Math.abs(channel);
  if (abs > 0.0031308) {
    return Math.sign(channel) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
  }
  return 12.92 * channel;
}

/**
 * Clamp value between 0 and 1
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Convert OKLCH color to hexadecimal string
 */
export function oklchToHex(color: OklchColor): string {
  const [r, g, b] = oklchToLinearRgb(color);

  // Apply gamma correction and convert to 0-255 range
  const sR = clamp(gammaCorrection(r));
  const sG = clamp(gammaCorrection(g));
  const sB = clamp(gammaCorrection(b));

  const r255 = Math.round(sR * 255);
  const g255 = Math.round(sG * 255);
  const b255 = Math.round(sB * 255);

  // Convert to hex
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r255)}${toHex(g255)}${toHex(b255)}`;
}

/**
 * Format OKLCH color as CSS string
 */
export function oklchToCss(color: OklchColor, alpha?: number): string {
  const { l, c, h } = color;
  if (alpha !== undefined) {
    return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(2)} / ${alpha}%)`;
  }
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(2)})`;
}

/**
 * Convert a palette object to hex values
 */
export function paletteToHex<T extends Record<string, OklchColor>>(
  palette: T,
): Record<keyof T, string> {
  const result = {} as Record<keyof T, string>;
  for (const [key, value] of Object.entries(palette)) {
    result[key as keyof T] = oklchToHex(value);
  }
  return result;
}
