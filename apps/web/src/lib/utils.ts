import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind CSS class name utility (web-specific)
 * Combines clsx and tailwind-merge for optimal class name handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a value between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Re-export shared utilities from @trainers/utils
export { getErrorMessage } from "@trainers/utils";
export { isMatchNotification } from "@trainers/utils";
