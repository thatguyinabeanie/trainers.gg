"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Maps Supabase error codes from hash fragments to user-friendly messages.
 * These errors occur when Supabase redirects back after a failed OAuth flow
 * (e.g., linkIdentity) with the error in the URL hash fragment.
 */
const ERROR_MESSAGES: Record<string, string> = {
  identity_already_exists:
    "That account is already linked to another user. Disconnect it from that account first, or use a different one.",
  update_failed:
    "Something went wrong while linking your account. Please try again.",
};

/**
 * Parses Supabase error info from the URL hash fragment.
 * Supabase uses the format: #error=...&error_code=...&error_description=...
 */
function parseHashError(): {
  error: string;
  errorCode: string;
  errorDescription: string;
} | null {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash;
  if (!hash || !hash.includes("error=")) return null;

  const params = new URLSearchParams(hash.slice(1));
  const error = params.get("error");
  if (!error) return null;

  return {
    error,
    errorCode: params.get("error_code") ?? "",
    errorDescription: params.get("error_description") ?? "",
  };
}

/**
 * Client component that detects Supabase auth error hash fragments
 * (e.g., from failed linkIdentity calls) and shows a toast notification.
 * Renders nothing — side-effect only.
 */
export function SupabaseHashErrorHandler() {
  useEffect(() => {
    const parsed = parseHashError();
    if (!parsed) return;

    // Show a user-friendly message if we have one, otherwise fall back to the description
    const friendlyMessage = ERROR_MESSAGES[parsed.errorCode];
    const message =
      friendlyMessage ||
      parsed.errorDescription ||
      "Something went wrong linking your account.";

    toast.error(message);

    // Clean the hash from the URL without triggering navigation
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  return null;
}
