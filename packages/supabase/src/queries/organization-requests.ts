import { escapeLike } from "@trainers/utils";
import type { TypedClient } from "../client";

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
    .from("organization_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pending) return pending;

  // Get most recent rejected request (for cooldown display)
  const { data: rejected } = await supabase
    .from("organization_requests")
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
  status?: "pending" | "approved" | "rejected";
  limit?: number;
  offset?: number;
}

/**
 * List organization requests for the admin panel.
 * Joins to users table for requester info.
 */
export async function listOrgRequestsAdmin(
  supabase: TypedClient,
  options: ListOrgRequestsAdminOptions = {}
) {
  const { search, status, limit = 25, offset = 0 } = options;

  let query = supabase
    .from("organization_requests")
    .select(
      `
      id,
      name,
      slug,
      description,
      status,
      admin_notes,
      reviewed_by,
      reviewed_at,
      created_at,
      updated_at,
      requester:users!organization_requests_user_id_fkey(id, username, first_name, last_name, image, email)
    `,
      { count: "exact", head: false }
    )
    .order("created_at", { ascending: false });

  if (search) {
    const escaped = escapeLike(search);
    query = query.or(`name.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) throw error;

  return { data: data ?? [], count: count ?? 0 };
}
