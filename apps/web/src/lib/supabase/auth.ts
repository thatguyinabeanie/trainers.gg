import { type User } from "@supabase/supabase-js";
import { createClient } from "./server";
import { createClient as createBrowserClient } from "./client";

export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
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

export async function isAuthenticated(): Promise<boolean> {
  const user = await getUser();
  return !!user;
}

export async function getUserId(): Promise<string | null> {
  const user = await getUser();
  return user?.id ?? null;
}

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

export const oauthProviders = [
  { name: "google", displayName: "Google", icon: "🔍" },
  { name: "discord", displayName: "Discord", icon: "🎮" },
  { name: "github", displayName: "GitHub", icon: "🐙" },
  { name: "twitter", displayName: "Twitter", icon: "🐦" },
] as const;

export type OAuthProvider = (typeof oauthProviders)[number]["name"];
