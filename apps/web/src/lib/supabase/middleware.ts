import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Cookie domain for cross-subdomain auth (builder.trainers.gg, dashboard.trainers.gg).
 * Leading dot makes cookies available to all subdomains of trainers.gg.
 * Undefined in local dev / preview deploys so cookies use browser defaults.
 */
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_SITE_URL?.includes("trainers.gg")
  ? ".trainers.gg"
  : undefined;

export function createClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: COOKIE_DOMAIN,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, {
              ...options,
              domain: COOKIE_DOMAIN ?? options?.domain,
            });
          });
        },
      },
    }
  );

  return { supabase, response: supabaseResponse };
}
