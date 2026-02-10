import { flag } from "flags/next";
import { supabaseAdapter } from "@/lib/feature-flags/adapter";

/**
 * Feature flag definitions using the Vercel Flags SDK.
 *
 * Each flag is backed by the Supabase `feature_flags` table via
 * the custom adapter. The flag key must match the `key` column
 * in the database.
 *
 * Usage in Server Components:
 *   const enabled = await maintenanceMode();
 *
 * Usage with Vercel Toolbar:
 *   Flags defined here appear in the Vercel Toolbar Flag Explorer
 *   via the /.well-known/vercel/flags discovery endpoint.
 *   The toolbar can override flag values using the `vercel-flag-overrides`
 *   cookie, which the Flags SDK handles automatically.
 *
 * Adding new flags:
 *   1. Add a row in the `feature_flags` table via /admin/config
 *   2. (Optional) Define it here with `flag()` for richer metadata
 *      and type-safe usage in code. Flags not defined here still
 *      work via the discovery endpoint and `isFeatureEnabled()`.
 *
 * Environment:
 *   Set FLAGS_SECRET in .env.local for Vercel Toolbar encryption.
 *   Generate with: node -e "console.log(crypto.randomBytes(32).toString('base64url'))"
 */

export const maintenanceMode = flag<boolean>({
  key: "maintenance_mode",
  defaultValue: false,
  description: "Redirect unauthenticated users to the waitlist page",
  options: [
    { label: "Off", value: false },
    { label: "On", value: true },
  ],
  adapter: supabaseAdapter,
});

export const openRegistration = flag<boolean>({
  key: "open_registration",
  defaultValue: false,
  description: "Allow new user signups without a beta invite",
  options: [
    { label: "Off", value: false },
    { label: "On", value: true },
  ],
  adapter: supabaseAdapter,
});
