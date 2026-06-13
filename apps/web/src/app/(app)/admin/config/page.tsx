/**
 * Admin Config Page — server component shell + client island.
 *
 * Server reads site roles + admins via service-role (bypasses the Phase 2
 * Task 9 anon/authenticated REVOKE on S-bucket base tables). Props are passed
 * to AdminConfigPageClient which owns all interactive state — no API route
 * needed; roles is a static one-shot read per D5 of the revoke plan.
 */

import { getSiteRoles, getSiteAdmins } from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";

import { AdminConfigPageClient } from "./admin-config-client";

// =============================================================================
// Server Component (default export)
// =============================================================================

export default async function AdminConfigPage() {
  // Both queries are independent — run in parallel.
  const supabase = createServiceRoleClient();
  const [siteRoles, siteAdmins] = await Promise.all([
    getSiteRoles(supabase),
    getSiteAdmins(supabase),
  ]);

  return (
    <AdminConfigPageClient siteRoles={siteRoles} siteAdmins={siteAdmins} />
  );
}
