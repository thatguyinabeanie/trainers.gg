import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TypedClient = SupabaseClient<Database>;

/**
 * List all organizations with pagination
 */
export async function listOrganizations(
  supabase: TypedClient,
  options: { limit?: number; offset?: number } = {},
) {
  const { limit = 10, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from("organizations")
    .select(
      `
      *,
      owner:profiles!organizations_owner_profile_id_fkey(*)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    items: data ?? [],
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit,
  };
}

/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(
  supabase: TypedClient,
  slug: string,
) {
  const { data, error } = await supabase
    .from("organizations")
    .select(
      `
      *,
      owner:profiles!organizations_owner_profile_id_fkey(*)
    `,
    )
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(supabase: TypedClient, id: string) {
  const { data, error } = await supabase
    .from("organizations")
    .select(
      `
      *,
      owner:profiles!organizations_owner_profile_id_fkey(*)
    `,
    )
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

/**
 * List organizations where current user is a member
 */
export async function listMyOrganizations(supabase: TypedClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return [];

  // Get memberships with organization details
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
      organization:organizations(
        *,
        owner:profiles!organizations_owner_profile_id_fkey(*)
      )
    `,
    )
    .eq("profile_id", profile.id);

  if (error) throw error;

  // Extract organizations and add member count
  const orgsWithCounts = await Promise.all(
    (data ?? []).map(async (m) => {
      const org = m.organization;
      if (!org) return null;

      const { count } = await supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", org.id);

      return {
        ...org,
        _count: { members: count ?? 0 },
      };
    }),
  );

  return orgsWithCounts.filter(Boolean);
}

/**
 * Check if user can manage organization
 */
export async function canManageOrganization(
  supabase: TypedClient,
  organizationId: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // Get user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return false;

  // Check if owner
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_profile_id")
    .eq("id", organizationId)
    .single();

  if (org?.owner_profile_id === profile.id) return true;

  // Check for ORG_MANAGE permission through RBAC
  const { data: profileGroupRoles } = await supabase
    .from("profile_group_roles")
    .select(
      `
      group_role:group_roles(
        group:groups(organization_id),
        role:roles(
          role_permissions(
            permission:permissions(key)
          )
        )
      )
    `,
    )
    .eq("profile_id", profile.id);

  for (const pgr of profileGroupRoles ?? []) {
    const groupRole = pgr.group_role;
    if (!groupRole) continue;

    const group = groupRole.group;
    if (!group || group.organization_id !== organizationId) continue;

    const role = groupRole.role;
    if (!role) continue;

    for (const rp of role.role_permissions ?? []) {
      if (rp.permission?.key === "ORG_MANAGE") return true;
    }
  }

  return false;
}

/**
 * List organization members
 */
export async function listOrganizationMembers(
  supabase: TypedClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
      *,
      profile:profiles(*)
    `,
    )
    .eq("organization_id", organizationId);

  if (error) throw error;
  return data ?? [];
}

/**
 * Check if profile is member of organization
 */
export async function isOrganizationMember(
  supabase: TypedClient,
  organizationId: string,
  profileId: string,
) {
  const { data } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("profile_id", profileId)
    .single();

  return !!data;
}
