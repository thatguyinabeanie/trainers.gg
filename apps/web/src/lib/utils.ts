import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind CSS class name utility (web-specific)
 * Combines clsx and tailwind-merge for optimal class name handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export shared utilities from @trainers/utils
export { getErrorMessage } from "@trainers/utils";
export { isMatchNotification } from "@trainers/utils";
