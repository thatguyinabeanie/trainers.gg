"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function checkUsernameAvailability(username: string) {
  try {
    const supabase = await createClient();

    // Check if username exists in users table
    const { data: existingUser, error } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("Error checking username:", error);
      return {
        available: false,
        error: "Failed to check username availability",
      };
    }

    return { available: !existingUser, error: null };
  } catch (error) {
    console.error("Error in checkUsernameAvailability:", error);
    return { available: false, error: "An unexpected error occurred" };
  }
}

export async function completeProfile(data: {
  username: string;
  birthDate: string;
  country: string;
}) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Update the user record in public.users
    const { error: updateError } = await supabase
      .from("users")
      .update({
        username: data.username.toLowerCase(),
        birth_date: data.birthDate,
        country: data.country.toUpperCase(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating user:", updateError);

      // Check for unique constraint violation
      if (updateError.code === "23505") {
        return { success: false, error: "Username is already taken" };
      }

      return { success: false, error: "Failed to update profile" };
    }

    // Also update the profile username
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        username: data.username.toLowerCase(),
      })
      .eq("user_id", user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Non-fatal, continue
    }

    // Update auth user metadata
    await supabase.auth.updateUser({
      data: {
        username: data.username.toLowerCase(),
        birth_date: data.birthDate,
        country: data.country.toUpperCase(),
        onboarding_completed: true,
      },
    });

    revalidatePath("/");
    return { success: true, error: null };
  } catch (error) {
    console.error("Error in completeProfile:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function isProfileComplete(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    // Check if user has completed onboarding via metadata
    if (user.user_metadata?.onboarding_completed) {
      return true;
    }

    // Check if user has required fields in the database
    // Using raw query to avoid type issues with new columns
    const { data: userData } = await supabase
      .from("users")
      .select("username, birth_date, country")
      .eq("id", user.id)
      .maybeSingle();

    if (!userData) return false;

    // Profile is complete if all required fields are set
    const user_data = userData as {
      username?: string;
      birth_date?: string;
      country?: string;
    };
    return !!(user_data.username && user_data.birth_date && user_data.country);
  } catch {
    return false;
  }
}
