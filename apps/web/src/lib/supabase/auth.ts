import { type User } from "@supabase/supabase-js";
import { createClient as createBrowserClient } from "./client";

/**
 * Client-side function to get the current user.
 * Use this in Client Components and browser-side code.
 */
export async function getUserClient(): Promise<User | null> {
  const supabase = createBrowserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error("Error getting user:", error);
    return null;
  }
  return user;
}

/**
 * Auth redirect URLs for different environments.
 */
export const getAuthUrls = () => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    signIn: `${baseUrl}/sign-in`,
    signUp: `${baseUrl}/sign-up`,
    callback: `${baseUrl}/auth/callback`,
    redirectAfterSignIn: `${baseUrl}/`,
    redirectAfterSignOut: `${baseUrl}`,
  };
};

/**
 * OAuth provider configurations.
 * Includes both Supabase OAuth providers and AT Protocol (Bluesky).
 */
export const oauthProviders = [
  { name: "google", displayName: "Google", icon: "google", type: "supabase" },
  {
    name: "discord",
    displayName: "Discord",
    icon: "discord",
    type: "supabase",
  },
  { name: "github", displayName: "GitHub", icon: "github", type: "supabase" },
  {
    name: "twitter",
    displayName: "Twitter",
    icon: "twitter",
    type: "supabase",
  },
] as const;

/**
 * Bluesky/AT Protocol provider (separate from Supabase OAuth)
 */
export const blueskyProvider = {
  name: "bluesky",
  displayName: "Bluesky",
  icon: "bluesky",
  type: "atproto",
} as const;

export type OAuthProvider = (typeof oauthProviders)[number]["name"];
export type BlueskyProvider = typeof blueskyProvider;
