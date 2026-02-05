import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract error message from various error types (Error, Supabase PostgrestError, etc.)
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return process.env.NODE_ENV === "production" ? fallback : error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message: string }).message;
    return process.env.NODE_ENV === "production" ? fallback : msg;
  }
  return fallback;
}

/**
 * Check if a notification type is a match notification (match_ready or tournament_round).
 * Used for styling and prioritizing match notifications in the notification bell.
 */
export function isMatchNotification(type: string | null): boolean {
  return type === "match_ready" || type === "tournament_round";
}
