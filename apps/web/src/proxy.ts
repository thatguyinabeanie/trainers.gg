import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create a response that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session (important for keeping session alive)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect /admin routes - require site admin
  if (pathname.startsWith("/admin")) {
    let isSiteAdmin = false;

    if (session?.access_token) {
      try {
        const payload = JSON.parse(
          atob(session.access_token.split(".")[1]!)
        ) as {
          site_roles?: string[];
        };
        isSiteAdmin = payload?.site_roles?.includes("site_admin") ?? false;
      } catch {
        isSiteAdmin = false;
      }
    }

    if (!isSiteAdmin) {
      // Rewrite to forbidden page - the page will render with layout
      const url = request.nextUrl.clone();
      url.pathname = "/forbidden";
      return NextResponse.rewrite(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
