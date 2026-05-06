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
 * Cookie domain for cross-subdomain auth (builder.trainers.gg, dashboard.trainers.gg).
 * Leading dot makes cookies available to all subdomains of trainers.gg.
 * Undefined in local dev / preview deploys so cookies use browser defaults.
 */
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_SITE_URL?.includes("trainers.gg")
  ? ".trainers.gg"
  : undefined;

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
      cookieOptions: {
        domain: COOKIE_DOMAIN,
      },
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
              }) =>
                cookieStore.set(name, value, {
                  ...(options as object),
                  domain:
                    COOKIE_DOMAIN ?? (options?.domain as string | undefined),
                } as Parameters<typeof cookieStore.set>[2])
            );
          } catch {
            // Called from Server Component - can't mutate cookies here
          }
        },
      },
    }
  ) as TypedSupabaseClient;
}
