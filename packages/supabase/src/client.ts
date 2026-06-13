import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type TypedSupabaseClient = SupabaseClient<Database>;
export type TypedClient = TypedSupabaseClient;

/**
 * Branded type for a service-role Supabase client.
 *
 * Compile-time guarantee: only clients created by `createAdminSupabaseClient()`
 * carry this brand. Passing an anon/session client to a function that requires
 * `ServiceRoleClient` is a type error — it will NOT compile, which surfaces the
 * bug before any RLS denial ever silently drops the write.
 *
 * The single `as ServiceRoleClient` cast lives only in `createAdminSupabaseClient()`
 * (the one trusted assertion boundary). All other code should receive
 * `ServiceRoleClient` via function parameters, never construct it.
 */
export type ServiceRoleClient = TypedClient & {
  readonly __serviceRole: unique symbol;
};

/**
 * Get Supabase configuration from environment variables.
 */
export function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
        "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

/**
 * Create an unauthenticated Supabase client for public data access.
 */
export function createPublicSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Create a Supabase admin client with service role key.
 * Bypasses RLS - use with caution! Only use in trusted server contexts.
 *
 * Returns a `ServiceRoleClient` branded type — the single trusted assertion
 * point in the codebase. Callers that need to write to RLS-protected tables
 * (e.g. `audit_log`) must accept `ServiceRoleClient`, making it a compile
 * error to pass an anon/session client by mistake.
 */
export function createAdminSupabaseClient(): ServiceRoleClient {
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
  }) as ServiceRoleClient;
}
