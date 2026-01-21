import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Create a Supabase client for browser/client-side usage.
 * Uses the anon key which has RLS policies applied.
 */
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
        "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Create a Supabase client for server-side usage.
 * Can use either the anon key (with RLS) or service role key (bypasses RLS).
 */
export function createServerClient(options?: { useServiceRole?: boolean }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = options?.useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }

  if (!supabaseKey) {
    throw new Error(
      options?.useServiceRole
        ? "Missing SUPABASE_SERVICE_ROLE_KEY environment variable"
        : "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable",
    );
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      // For server-side, we typically don't persist sessions
      persistSession: false,
    },
  });
}

/**
 * Singleton browser client for use in React components.
 * Only call this on the client side.
 */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error(
      "getSupabaseBrowserClient should only be called on the client side",
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient();
  }

  return browserClient;
}
