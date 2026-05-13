import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getServiceRoleKey } from "./env.js";

export function createAdminClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type { SupabaseClient };
