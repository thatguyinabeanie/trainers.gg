"use server";

import { checkBotId } from "botid/server";
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

/**
 * Add an email to the waitlist for early access.
 * Note: waitlist table types will be available after the migration runs and types are regenerated.
 */
export async function joinWaitlist(
  email: string
): Promise<{ success?: boolean; error?: string }> {
  const { isBot } = await checkBotId();
  if (isBot) return { error: "Access denied" };

  const trimmed = email.trim().toLowerCase();

  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("waitlist")
      .insert({ email: trimmed });

    if (error?.code === "23505") {
      // Unique constraint violation - email already exists
      return { error: "This email is already on the waitlist" };
    }

    if (error) {
      console.error("Error joining waitlist:", error);
      return { error: "Failed to join waitlist. Please try again." };
    }

    return { success: true };
  } catch (err) {
    console.error("Error joining waitlist:", err);
    return { error: "An error occurred. Please try again." };
  }
}

/**
 * Check if a username is available for registration.
 */
export async function checkUsernameAvailability(
  username: string
): Promise<{ available: boolean; error: string | null }> {
  const trimmed = username.trim().toLowerCase();

  // Validate username format
  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(trimmed)) {
    return { available: false, error: "Invalid username format" };
  }

  try {
    const supabase = await createClient();

    // Check users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", trimmed)
      .maybeSingle();

    if (existingUser) {
      return { available: false, error: null };
    }

    // Check alts table
    const { data: existingAlt } = await supabase
      .from("alts")
      .select("id")
      .eq("username", trimmed)
      .maybeSingle();

    if (existingAlt) {
      return { available: false, error: null };
    }

    return { available: true, error: null };
  } catch (err) {
    console.error("Error checking username availability:", err);
    return { available: false, error: "An error occurred. Please try again." };
  }
}
