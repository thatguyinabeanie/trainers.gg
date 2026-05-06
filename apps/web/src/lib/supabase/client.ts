import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@trainers/supabase/types";
import { COOKIE_DOMAIN } from "@trainers/supabase";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: COOKIE_DOMAIN,
      },
    }
  );
}

export const supabase = createClient();
