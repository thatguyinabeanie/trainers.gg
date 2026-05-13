import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../../.env.local") });

export function getRequired(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

/** SUPABASE_URL takes precedence; falls back to NEXT_PUBLIC_SUPABASE_URL */
export function getSupabaseUrl(): string {
  const url =
    process.env["SUPABASE_URL"] ?? process.env["NEXT_PUBLIC_SUPABASE_URL"];
  if (!url) throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  return url;
}

export function getServiceRoleKey(): string {
  return getRequired("SUPABASE_SERVICE_ROLE_KEY");
}

export function getLimitlessApiKey(): string | undefined {
  return process.env["LIMITLESS_API_KEY"];
}
