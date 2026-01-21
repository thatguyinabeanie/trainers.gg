/**
 * Theme Package Exports
 */

// Primitives
export {
  colors,
  tealPalette,
  neutralPalette,
  destructivePalette,
} from "./primitives/colors.oklch.js";
export type { OklchColor, ColorPalette } from "./primitives/colors.oklch.js";
export { fontFamily, borderRadius } from "./primitives/typography.js";

// Semantic tokens
export { semanticTokens, lightTokens, darkTokens } from "./tokens/semantic.js";
export type { SemanticTokens } from "./tokens/semantic.js";

// Utils
export { oklchToHex, oklchToCss, paletteToHex } from "./utils/oklch-to-hex.js";

// Legacy exports for backward compatibility
export { fontFamily as sharedTheme } from "./primitives/typography.js";

// Old exports (deprecated but kept for compatibility)
export { colors as darkColors } from "./primitives/colors.oklch.js";
export type {
  ColorPalette as Colors,
  ColorPalette as DarkColors,
} from "./primitives/colors.oklch.js";
