import { escapeLike } from "@trainers/utils";
import type { TypedClient, ServiceRoleClient } from "../client";
import { getPiiByUserIds, getEmailsByUserIds } from "./admin-users";

/**
 * Get the current user's most recent organization request.
 * Returns the pending request if one exists, otherwise the most recent rejected request.
 * Used to determine which state to show on the request form page.
 */
export async function getMyOrganizationRequest(supabase: TypedClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Get pending request first
  const { data: pending } = await supabase
    .from("community_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pending) return pending;

  // Get most recent rejected request (for cooldown display)
  const { data: rejected } = await supabase
    .from("community_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "rejected")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return rejected;
}

// --- Admin queries ---

export interface ListOrgRequestsAdminOptions {
  search?: string;
  status?: "pending" | "approved" | "rejected" | "cancelled";
  limit?: number;
  offset?: number;
}

/**
 * List organization requests for the admin panel.
 * Joins to users table for requester info (id, username, image only —
 * first_name/last_name/email were moved out of public.users in PR #361).
 * Requester names are enriched via getPiiByUserIds and emails via
 * getEmailsByUserIds after the main query, preserving the original return shape.
 *
 * @param supabase - MUST be a service-role client (PII helpers are service_role-only)
 */
export async function listOrgRequestsAdmin(
  supabase: ServiceRoleClient,
  options: ListOrgRequestsAdminOptions = {}
) {
  const { search, status, limit = 25, offset = 0 } = options;

  let query = supabase
    .from("community_requests")
    .select(
      `
      id,
      name,
      slug,
      description,
      discord_invite_url,
      social_links,
      status,
      admin_notes,
      reviewed_by,
      reviewed_at,
      created_at,
      updated_at,
      requester:users!community_requests_user_id_fkey(id, username, image)
    `,
      { count: "exact", head: false }
    )
    .order("created_at", { ascending: false });

  if (search) {
    // Strip characters that break PostgREST .or() syntax
    const sanitized = search.replace(/[(),]/g, "");
    if (sanitized) {
      const escaped = escapeLike(sanitized);
      query = query.or(`name.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
    }
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) throw error;

  const rows = data ?? [];

  // Collect distinct requester IDs and enrich with PII + email in parallel
  const requesterIds = [
    ...new Set(
      rows.map((r) => r.requester?.id).filter((id): id is string => id != null)
    ),
  ];

  const [piiMap, emailMap] = await Promise.all([
    getPiiByUserIds(supabase, requesterIds),
    getEmailsByUserIds(supabase, requesterIds),
  ]);

  const enriched = rows.map((r) => ({
    ...r,
    requester: r.requester
      ? {
          ...r.requester,
          first_name: piiMap.get(r.requester.id)?.first_name ?? null,
          last_name: piiMap.get(r.requester.id)?.last_name ?? null,
          email: emailMap.get(r.requester.id) ?? null,
        }
      : null,
  }));

  return { data: enriched, count: count ?? 0 };
}
