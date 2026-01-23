/**
 * Utility for merging Tailwind class names
 * Simple version for React Native - no clsx/tailwind-merge needed
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
