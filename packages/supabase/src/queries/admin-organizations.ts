import { escapeLike } from "@trainers/utils";
import type { Database } from "../types";
import type { TypedClient } from "../client";

type OrganizationStatus = Database["public"]["Enums"]["organization_status"];
type OrganizationTier = Database["public"]["Enums"]["organization_tier"];

/**
 * Options for listing organizations in the admin panel.
 */
export interface ListOrganizationsAdminOptions {
  /** Filter by name or slug (case-insensitive partial match) */
  search?: string;
  /** Filter by organization status */
  status?: OrganizationStatus;
  /** Filter by organization tier */
  tier?: OrganizationTier;
  /** Maximum number of results to return (default: 25) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
}

// ------------------------------------------------------------------
// Queries
// ------------------------------------------------------------------

/**
 * List organizations for the admin panel with search, filtering, and pagination.
 *
 * Selects core org fields plus the owner relationship and admin notes
 * from the separate `organization_admin_notes` table.
 * Returns data and exact count for pagination.
 *
 * @param supabase - Typed Supabase client
 * @param options - Search, filter, and pagination options
 */
export async function listOrganizationsAdmin(
  supabase: TypedClient,
  options: ListOrganizationsAdminOptions = {}
) {
  const { search, status, tier, limit = 25, offset = 0 } = options;

  let query = supabase
    .from("organizations")
    .select(
      `
      id,
      name,
      slug,
      description,
      status,
      tier,
      created_at,
      updated_at,
      owner:users!organizations_owner_user_id_fkey(id, username, first_name, last_name, image),
      organization_admin_notes(notes, updated_at, updated_by)
    `,
      { count: "exact", head: false }
    )
    .order("created_at", { ascending: false });

  // Apply search filter (matches name or slug, case-insensitive)
  if (search) {
    const escaped = escapeLike(search);
    query = query.or(`name.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (tier) {
    query = query.eq("tier", tier);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) throw error;

  return { data: data ?? [], count: count ?? 0 };
}

/**
 * Get full admin details for a single organization.
 *
 * Returns all org fields, the owner relationship, and admin notes
 * from the separate `organization_admin_notes` table.
 * Returns null if the organization is not found.
 *
 * @param supabase - Typed Supabase client
 * @param orgId - Organization ID
 */
export async function getOrganizationAdminDetails(
  supabase: TypedClient,
  orgId: number
) {
  const { data, error } = await supabase
    .from("organizations")
    .select(
      `
      *,
      owner:users!organizations_owner_user_id_fkey(id, username, first_name, last_name, image),
      organization_admin_notes(notes, updated_at, updated_by)
    `
    )
    .eq("id", orgId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ------------------------------------------------------------------
// Mutations
// ------------------------------------------------------------------

/**
 * Approve an organization (set status to 'active').
 *
 * Updates the organization status and creates an audit log entry
 * with the action 'admin.org_approved'.
 *
 * @param supabase - Typed Supabase client
 * @param orgId - Organization ID to approve
 * @param adminUserId - User ID of the admin performing the action
 */
export async function approveOrganization(
  supabase: TypedClient,
  orgId: number,
  adminUserId: string
) {
  // Update organization status
  const { data, error } = await supabase
    .from("organizations")
    .update({ status: "active" })
    .eq("id", orgId)
    .select()
    .single();

  if (error) throw error;

  // Insert audit log entry
  // NOTE: The audit_action enum values are added by migration but may not yet
  // appear in the generated TypeScript types. Cast as needed.
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.org_approved" as const,
    actor_user_id: adminUserId,
    organization_id: orgId,
    metadata: {
      organization_id: orgId,
    },
  });

  if (auditError) {
    console.error("Error inserting org approval audit log:", auditError);
  }

  return data;
}

/**
 * Reject an organization (set status to 'rejected' with a reason).
 *
 * Updates the organization status, stores the reason in
 * `organization_admin_notes`, then creates an audit log entry.
 *
 * @param supabase - Typed Supabase client
 * @param orgId - Organization ID to reject
 * @param adminUserId - User ID of the admin performing the action
 * @param reason - Reason for rejection (stored in organization_admin_notes)
 */
export async function rejectOrganization(
  supabase: TypedClient,
  orgId: number,
  adminUserId: string,
  reason: string
) {
  const { data, error } = await supabase
    .from("organizations")
    .update({
      status: "rejected" as const,
    })
    .eq("id", orgId)
    .select()
    .single();

  if (error) throw error;

  // Upsert admin notes into the separate table
  // NOTE: organization_admin_notes is created by migration but may not yet
  // appear in the generated TypeScript types. Cast as needed.
  const { error: notesError } = await (supabase.from as CallableFunction)(
    "organization_admin_notes"
  ).upsert(
    {
      organization_id: orgId,
      notes: reason,
      updated_by: adminUserId,
    },
    { onConflict: "organization_id" }
  );

  if (notesError) {
    console.error("Error upserting org admin notes:", notesError);
  }

  // Insert audit log entry
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.org_rejected" as const,
    actor_user_id: adminUserId,
    organization_id: orgId,
    metadata: {
      organization_id: orgId,
      reason,
    },
  });

  if (auditError) {
    console.error("Error inserting org rejection audit log:", auditError);
  }

  return data;
}

/**
 * Suspend an organization (set status to 'suspended' with a reason).
 *
 * Updates the organization status, stores the reason in
 * `organization_admin_notes`, then creates an audit log entry.
 *
 * @param supabase - Typed Supabase client
 * @param orgId - Organization ID to suspend
 * @param adminUserId - User ID of the admin performing the action
 * @param reason - Reason for suspension (stored in organization_admin_notes)
 */
export async function suspendOrganization(
  supabase: TypedClient,
  orgId: number,
  adminUserId: string,
  reason: string
) {
  const { data, error } = await supabase
    .from("organizations")
    .update({
      status: "suspended" as const,
    })
    .eq("id", orgId)
    .select()
    .single();

  if (error) throw error;

  // Upsert admin notes into the separate table
  // NOTE: organization_admin_notes is created by migration but may not yet
  // appear in the generated TypeScript types. Cast as needed.
  const { error: notesError } = await (supabase.from as CallableFunction)(
    "organization_admin_notes"
  ).upsert(
    {
      organization_id: orgId,
      notes: reason,
      updated_by: adminUserId,
    },
    { onConflict: "organization_id" }
  );

  if (notesError) {
    console.error("Error upserting org admin notes:", notesError);
  }

  // Insert audit log entry
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.org_suspended" as const,
    actor_user_id: adminUserId,
    organization_id: orgId,
    metadata: {
      organization_id: orgId,
      reason,
    },
  });

  if (auditError) {
    console.error("Error inserting org suspension audit log:", auditError);
  }

  return data;
}

/**
 * Unsuspend an organization (set status back to 'active').
 *
 * Updates the organization status and creates an audit log entry
 * with the action 'admin.org_unsuspended'.
 *
 * @param supabase - Typed Supabase client
 * @param orgId - Organization ID to unsuspend
 * @param adminUserId - User ID of the admin performing the action
 */
export async function unsuspendOrganization(
  supabase: TypedClient,
  orgId: number,
  adminUserId: string
) {
  // Update organization status
  const { data, error } = await supabase
    .from("organizations")
    .update({ status: "active" })
    .eq("id", orgId)
    .select()
    .single();

  if (error) throw error;

  // Insert audit log entry
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.org_unsuspended" as const,
    actor_user_id: adminUserId,
    organization_id: orgId,
    metadata: {
      organization_id: orgId,
    },
  });

  if (auditError) {
    console.error("Error inserting org unsuspend audit log:", auditError);
  }

  return data;
}

/**
 * Transfer organization ownership to a new user.
 *
 * Updates the owner_user_id and creates an audit log entry with
 * the action 'admin.org_ownership_transferred'. The metadata includes
 * both the previous and new owner user IDs.
 *
 * @param supabase - Typed Supabase client
 * @param orgId - Organization ID to transfer
 * @param newOwnerUserId - User ID of the new owner
 * @param adminUserId - User ID of the admin performing the action
 */
export async function transferOrgOwnership(
  supabase: TypedClient,
  orgId: number,
  newOwnerUserId: string,
  adminUserId: string
) {
  // Fetch the current owner before updating
  const { data: currentOrg, error: fetchError } = await supabase
    .from("organizations")
    .select("owner_user_id")
    .eq("id", orgId)
    .single();

  if (fetchError) throw fetchError;

  const previousOwnerUserId = currentOrg.owner_user_id;

  // Update organization owner
  const { data, error } = await supabase
    .from("organizations")
    .update({ owner_user_id: newOwnerUserId })
    .eq("id", orgId)
    .select()
    .single();

  if (error) throw error;

  // Insert audit log entry with old and new owner metadata
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.org_ownership_transferred" as const,
    actor_user_id: adminUserId,
    organization_id: orgId,
    metadata: {
      organization_id: orgId,
      previous_owner_user_id: previousOwnerUserId,
      new_owner_user_id: newOwnerUserId,
    },
  });

  if (auditError) {
    console.error("Error inserting ownership transfer audit log:", auditError);
  }

  return data;
}
