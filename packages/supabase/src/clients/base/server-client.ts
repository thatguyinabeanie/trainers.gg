/**
 * Server Client Factory (Next.js SSR)
 *
 * Creates a Supabase client for Next.js Server Components and Server Actions.
 * Uses cookies for session management.
 *
 * This file is imported by the auto-generated server.ts wrapper.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { TypedSupabaseClient } from "../../client";

/**
 * Create a Supabase client for Next.js server-side rendering.
 * Reads and writes session cookies automatically.
 */
export async function createServerSupabaseClient(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }: {
                name: string;
                value: string;
                options: Record<string, unknown>;
              }) => cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component - can't mutate cookies here
          }
        },
      },
    }
  ) as TypedSupabaseClient;
}
