"use client";

import { createClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";
import { useMemo } from "react";
import type { Database } from "@trainers/backend-supabase";

/**
 * Create a Supabase client that uses Clerk session tokens for authentication.
 * This follows the official Clerk + Supabase integration pattern.
 */
export function createSupabaseClient(getToken: () => Promise<string | null>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
        "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    accessToken: getToken,
  });
}

/**
 * Hook to get a Supabase client authenticated with the current Clerk session.
 * Use this in client components.
 */
export function useSupabaseClient() {
  const { session } = useSession();

  const client = useMemo(() => {
    return createSupabaseClient(async () => {
      return session?.getToken() ?? null;
    });
  }, [session]);

  return client;
}

/**
 * Create an unauthenticated Supabase client for public data access.
 * Use this when you don't need user authentication.
 */
export function createPublicSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
        "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
