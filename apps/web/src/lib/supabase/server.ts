import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import type { Database } from "@trainers/backend-supabase";

/**
 * Create a Supabase client for server-side usage with Clerk authentication.
 * Uses the Clerk session token for authenticated requests.
 */
export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
        "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const { getToken } = await auth();

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => {
      return (await getToken()) ?? null;
    },
  });
}

/**
 * Create an unauthenticated Supabase client for public data access on the server.
 */
export function createPublicServerSupabaseClient() {
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

/**
 * Create a Supabase admin client with service role key.
 * Bypasses RLS - use with caution! Only use in trusted server contexts.
 */
export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase admin environment variables. " +
        "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
