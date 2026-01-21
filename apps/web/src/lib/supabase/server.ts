import { auth } from "@clerk/nextjs/server";
import {
  createSupabaseClient,
  createPublicSupabaseClient,
  createAdminSupabaseClient,
} from "@trainers/supabase";

/**
 * Create a Supabase client for server-side usage with Clerk authentication.
 * Uses Clerk's native Supabase integration via session tokens.
 *
 * Requires Third-Party Auth configured in Supabase Dashboard.
 * See: https://supabase.com/docs/guides/auth/third-party/clerk
 */
export async function createServerSupabaseClient() {
  const { getToken } = await auth();

  return createSupabaseClient(async () => {
    // Use Clerk's session token directly (native Supabase integration)
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
