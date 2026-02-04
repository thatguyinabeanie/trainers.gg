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
