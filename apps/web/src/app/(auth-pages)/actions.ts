"use server";

import { createClient } from "@/lib/supabase/server";
import { getEmailByUsername } from "@trainers/supabase";

/**
 * Resolve a login identifier (email or username) to an email address.
 * Returns the email if the identifier is already an email, or looks up
 * the email by username if it's not.
 */
export async function resolveLoginIdentifier(
  identifier: string
): Promise<{ email: string | null; error: string | null }> {
  const trimmed = identifier.trim().toLowerCase();

  // If it looks like an email, return it directly
  if (trimmed.includes("@")) {
    return { email: trimmed, error: null };
  }

  // Otherwise, treat it as a username and look up the email
  try {
    const supabase = await createClient();
    const email = await getEmailByUsername(supabase, trimmed);

    if (!email) {
      return { email: null, error: "No account found with that username" };
    }

    return { email, error: null };
  } catch (err) {
    console.error("Error resolving username:", err);
    return { email: null, error: "An error occurred. Please try again." };
  }
}
