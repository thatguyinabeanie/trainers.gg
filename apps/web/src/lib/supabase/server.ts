import { auth } from "@clerk/nextjs/server";
import {
  createSupabaseClient,
  createPublicSupabaseClient,
  createAdminSupabaseClient,
} from "@trainers/supabase";

/**
 * Create a Supabase client for server-side usage with Clerk authentication.
 * Uses the Clerk session token for authenticated requests.
 */
export async function createServerSupabaseClient() {
  const { getToken } = await auth();

  return createSupabaseClient(async () => {
    return (await getToken()) ?? null;
  });
}

/**
 * Create an unauthenticated Supabase client for public data access on the server.
 */
export { createPublicSupabaseClient as createPublicServerSupabaseClient };

/**
 * Create a Supabase admin client with service role key.
 * Bypasses RLS - use with caution! Only use in trusted server contexts.
 */
export { createAdminSupabaseClient };
