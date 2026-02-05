import type { Database } from "../types";
import type { TypedClient } from "../client";
type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];

export type OrganizationWithCounts = OrganizationRow & {
  activeTournamentsCount: number;
  totalTournamentsCount: number;
};

/**
 * List all public (active) organizations with tournament counts
 */
export async function listPublicOrganizations(
  supabase: TypedClient
): Promise<OrganizationWithCounts[]> {
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!organizations || organizations.length === 0) return [];

  // Get tournament counts for all organizations in a single query
  const orgIds = organizations.map((org) => org.id);
  const { data: counts, error: countsError } = await supabase.rpc(
    "get_organization_tournament_counts",
    { org_ids: orgIds }
  );

  if (countsError) {
    console.error("Error fetching tournament counts:", countsError);
  }

  // Build a map of org_id -> counts
  const countMap: Record<string, { total: number; active: number }> = {};
  for (const row of counts ?? []) {
    countMap[String(row.organization_id)] = {
      total: Number(row.total_count),
      active: Number(row.active_count),
    };
  }

  // Add counts to organizations
  const orgsWithCounts: OrganizationWithCounts[] = organizations.map((org) => ({
    ...org,
    activeTournamentsCount: countMap[String(org.id)]?.active ?? 0,
    totalTournamentsCount: countMap[String(org.id)]?.total ?? 0,
  }));

  return orgsWithCounts;
}

/**
 * List all organizations with pagination
 */
export async function listOrganizations(
  supabase: TypedClient,
  options: { limit?: number; offset?: number; searchTerm?: string } = {}
) {
  const { limit = 10, offset = 0, searchTerm } = options;

  let query = supabase
    .from("organizations")
    .select(
      `
      *,
      owner:users!organizations_owner_user_id_fkey(*)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) throw error;

  // Add staff and tournament counts
  const orgsWithCounts = await Promise.all(
    (data ?? []).map(async (org) => {
      const { count: staffCount } = await supabase
        .from("organization_staff")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", org.id);

      const { count: tournamentCount } = await supabase
        .from("tournaments")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .is("archived_at", null);

      return {
        ...org,
        _count: {
          staff: staffCount ?? 0,
          tournaments: tournamentCount ?? 0,
        },
      };
    })
  );

  return {
    items: orgsWithCounts,
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit,
  };
}

/**
 * Get organization by slug with full details
 */
export async function getOrganizationBySlug(
  supabase: TypedClient,
  slug: string
) {
  const { data: organization, error } = await supabase
    .from("organizations")
    .select(
      `
      *,
      owner:users!organizations_owner_user_id_fkey(*)
    `
    )
    .eq("slug", slug)
    .single();

  if (error) return null;
  if (!organization) return null;

  // Get follower count (organization staff)
  const { count: followerCount } = await supabase
    .from("organization_staff")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  // Get all tournaments for this organization
  const { data: allTournaments } = await supabase
    .from("tournaments")
    .select("*")
    .eq("organization_id", organization.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const tournaments = allTournaments ?? [];

  // Get registration counts for tournaments
  const tournamentsWithCounts = await Promise.all(
    tournaments.map(async (t) => {
      const { count } = await supabase
        .from("tournament_registrations")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", t.id);
      return { ...t, registrationCount: count ?? 0 };
    })
  );

  // Separate by status
  const activeTournaments = tournamentsWithCounts.filter(
    (t) => t.status === "active"
  );
  const upcomingTournaments = tournamentsWithCounts.filter(
    (t) => t.status === "upcoming"
  );
  const completedTournaments = tournamentsWithCounts
    .filter((t) => t.status === "completed")
    .slice(0, 5);

  // Calculate stats
  const tournamentsWithParticipants = tournaments.filter(
    (t) => t.max_participants && t.max_participants > 0
  );
  const avgTournamentSize =
    tournamentsWithParticipants.length > 0
      ? Math.round(
          tournamentsWithParticipants.reduce(
            (sum, t) => sum + (t.max_participants ?? 0),
            0
          ) / tournamentsWithParticipants.length
        )
      : 0;

  // Get most common format
  const formatCounts = new Map<string, number>();
  tournaments.forEach((t) => {
    if (t.format) {
      formatCounts.set(t.format, (formatCounts.get(t.format) ?? 0) + 1);
    }
  });
  const primaryFormat =
    formatCounts.size > 0
      ? (Array.from(formatCounts.entries()).sort(
          (a, b) => b[1] - a[1]
        )[0]?.[0] ?? null)
      : null;

  return {
    ...organization,
    followerCount: followerCount ?? 0,
    tournaments: {
      active: activeTournaments,
      upcoming: upcomingTournaments,
      completed: completedTournaments,
    },
    stats: {
      activeTournamentsCount: activeTournaments.length,
      totalTournamentsCount: tournaments.length,
      avgTournamentSize,
      primaryFormat,
    },
  };
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(supabase: TypedClient, id: number) {
  const { data, error } = await supabase
    .from("organizations")
    .select(
      `
      *,
      owner:users!organizations_owner_user_id_fkey(*)
    `
    )
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

/**
 * List organizations where user is owner or staff
 */
export async function listMyOrganizations(
  supabase: TypedClient,
  userId?: string
) {
  let targetUserId: string | undefined = userId;

  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    targetUserId = user.id;
  }

  // Get the user's alt for checking staff status
  const { data: alt } = await supabase
    .from("alts")
    .select("id")
    .eq("user_id", targetUserId)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  const _altId = alt?.id as number | undefined;

  // Get organizations where user is owner
  const { data: ownedOrgs } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_user_id", targetUserId);

  // Get organizations where user is staff (user-level)
  let staffOrgs: typeof ownedOrgs = [];
  if (userId) {
    const { data: staffRecords } = await supabase
      .from("organization_staff")
      .select(
        `
        organization:organizations(*)
      `
      )
      .eq("user_id", userId);

    staffOrgs = (staffRecords ?? [])
      .map((m) => m.organization)
      .filter(
        (org): org is NonNullable<typeof org> =>
          org !== null && org !== undefined
      );
  }

  const ownedOrgsWithFlag = (ownedOrgs ?? []).map((org) => ({
    ...org,
    isOwner: true,
  }));

  const staffOrgsWithFlag = (staffOrgs ?? []).map((org) => ({
    ...org,
    isOwner: org.owner_user_id === targetUserId,
  }));

  // Combine and deduplicate
  const allOrgs = [...ownedOrgsWithFlag, ...staffOrgsWithFlag];
  const uniqueOrgs = allOrgs.filter(
    (org, index, self) => index === self.findIndex((o) => o.id === org.id)
  );

  return uniqueOrgs;
}

/**
 * Check if user can manage organization (owner or has permission)
 * Note: Ownership is now at the user level, but RBAC permissions are still via alts
 */
export async function canManageOrganization(
  supabase: TypedClient,
  organizationId: number,
  userId: string
) {
  // Check if owner (owner_user_id is now a uuid)
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_user_id")
    .eq("id", organizationId)
    .single();

  if (org?.owner_user_id === userId) {
    return true;
  }

  // Check if user has ORG_MANAGE permission through RBAC
  // Note: Using user_id (user-level permissions) for organization management
  // The JOIN chain: user_group_roles → group_roles → groups (which has organization_id)
  // We skip permission checking for now as the schema is complex
  // TODO: Implement full permission checking via group_roles → groups → organization

  // For now, just check if user is staff in the organization
  const { data: staffRecord } = await supabase
    .from("organization_staff")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .single();

  return !!staffRecord;
}

/**
 * List organization staff with user details
 */
export async function listOrganizationStaff(
  supabase: TypedClient,
  organizationId: number
) {
  const { data, error } = await supabase
    .from("organization_staff")
    .select(
      `
      *,
      user:users(*)
    `
    )
    .eq("organization_id", organizationId);

  if (error) throw error;
  return data ?? [];
}

/**
 * Check if user has access to organization (owner or staff)
 */
export async function hasOrganizationAccess(
  supabase: TypedClient,
  organizationId: number,
  userId: string
) {
  // Check if owner (owner_user_id is now a uuid)
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_user_id")
    .eq("id", organizationId)
    .single();

  if (org?.owner_user_id === userId) {
    return true;
  }

  // Check if staff (now uses user_id directly, not via alt)
  const { data } = await supabase
    .from("organization_staff")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .single();

  return !!data;
}

/**
 * Get pending invitations for a user
 */
export async function getMyOrganizationInvitations(
  supabase: TypedClient,
  userId: string
) {
  const { data: invitations, error } = await supabase
    .from("organization_invitations")
    .select(
      `
      *,
      organization:organizations(*),
      invited_by:users!organization_invitations_invited_by_user_id_fkey(*)
    `
    )
    .eq("invited_user_id", userId)
    .eq("status", "pending");

  if (error) throw error;
  return invitations ?? [];
}

/**
 * Get invitations for an organization
 */
export async function getOrganizationInvitations(
  supabase: TypedClient,
  organizationId: number
) {
  const { data: invitations, error } = await supabase
    .from("organization_invitations")
    .select(
      `
      *,
      invited_user:users!organization_invitations_invited_user_id_fkey(*),
      invited_by:users!organization_invitations_invited_by_user_id_fkey(*)
    `
    )
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  if (error) throw error;
  return invitations ?? [];
}

/**
 * List organizations where user is the owner (for TO dashboard access in Phase 1)
 */
export async function listMyOwnedOrganizations(
  supabase: TypedClient,
  userId?: string
) {
  let targetUserId: string | undefined = userId;

  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    targetUserId = user.id;
  }

  const { data: ownedOrgs, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_user_id", targetUserId)
    .order("name", { ascending: true });

  if (error) throw error;
  return ownedOrgs ?? [];
}

/**
 * Get organization by slug with tournament statistics for TO dashboard
 */
export async function getOrganizationWithTournamentStats(
  supabase: TypedClient,
  orgSlug: string
) {
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", orgSlug)
    .single();

  if (error) return null;
  if (!organization) return null;

  // Get all non-archived tournaments in a single query
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, status")
    .eq("organization_id", organization.id)
    .is("archived_at", null);

  // Count by status in memory (avoids N+1 queries)
  const tournamentCounts: Record<string, number> = {
    draft: 0,
    upcoming: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  };

  const tournamentIds: number[] = [];
  for (const t of tournaments ?? []) {
    const status = t.status;
    if (
      status &&
      Object.prototype.hasOwnProperty.call(tournamentCounts, status)
    ) {
      tournamentCounts[status] = (tournamentCounts[status] ?? 0) + 1;
    }
    tournamentIds.push(t.id);
  }

  // Get total participant count across all tournaments in a single query
  let totalParticipants = 0;
  if (tournamentIds.length > 0) {
    const { count } = await supabase
      .from("tournament_registrations")
      .select("*", { count: "exact", head: true })
      .in("tournament_id", tournamentIds);
    totalParticipants = count ?? 0;
  }

  // Get staff count
  const { count: staffCount } = await supabase
    .from("organization_staff")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  return {
    ...organization,
    tournamentCounts,
    totalTournaments: Object.values(tournamentCounts).reduce(
      (a, b) => a + b,
      0
    ),
    totalParticipants,
    staffCount: staffCount ?? 0,
  };
}

/**
 * List tournaments for an organization with optional status filter
 */
export async function listOrganizationTournaments(
  supabase: TypedClient,
  organizationId: number,
  options: {
    status?: "draft" | "upcoming" | "active" | "completed" | "cancelled";
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, limit = 50, offset = 0 } = options;

  let query = supabase
    .from("tournaments")
    .select(
      `
      *,
      organization:organizations!inner(id, name, slug),
      winner:alts(id, username, display_name)
    `,
      { count: "exact" }
    )
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const {
    data: tournaments,
    error,
    count,
  } = await query.range(offset, offset + limit - 1);

  if (error) throw error;

  // Get registration counts for each tournament
  const tournamentsWithCounts = await Promise.all(
    (tournaments ?? []).map(async (tournament) => {
      const { count: registrationCount } = await supabase
        .from("tournament_registrations")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournament.id);

      return {
        ...tournament,
        registrationCount: registrationCount ?? 0,
        _count: { registrations: registrationCount ?? 0 },
      };
    })
  );

  return {
    tournaments: tournamentsWithCounts,
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit,
  };
}

// =============================================================================
// Staff Management Queries
// =============================================================================

/**
 * Staff member with their group/role information
 */
export type StaffWithRole = {
  id: number;
  user_id: string;
  organization_id: number;
  created_at: string | null;
  user: {
    id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
    email: string | null;
  } | null;
  group: {
    id: number;
    name: string;
  } | null;
  role: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  isOwner: boolean;
};

/**
 * List organization staff with their assigned roles via groups
 */
export async function listOrganizationStaffWithRoles(
  supabase: TypedClient,
  organizationId: number
): Promise<StaffWithRole[]> {
  // Get organization owner
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_user_id")
    .eq("id", organizationId)
    .single();

  const ownerUserId = org?.owner_user_id;

  // Get all staff members with user details
  const { data: staffMembers, error: staffError } = await supabase
    .from("organization_staff")
    .select(
      `
      id,
      user_id,
      organization_id,
      created_at,
      user:users(id, username, first_name, last_name, image, email)
    `
    )
    .eq("organization_id", organizationId);

  if (staffError) throw staffError;

  // Get groups for this organization
  const { data: groups } = await supabase
    .from("groups")
    .select(
      `
      id,
      name,
      organization_id
    `
    )
    .eq("organization_id", organizationId);

  const groupIds = (groups ?? []).map((g) => g.id);

  // Get group_roles for these groups
  const { data: groupRoles } = await supabase
    .from("group_roles")
    .select(
      `
      id,
      group_id,
      role:roles(id, name, description)
    `
    )
    .in("group_id", groupIds.length > 0 ? groupIds : [-1]);

  // Get user_group_roles to find which users are in which groups
  const groupRoleIds = (groupRoles ?? []).map((gr) => gr.id);
  const { data: userGroupRoles } = await supabase
    .from("user_group_roles")
    .select("user_id, group_role_id")
    .in("group_role_id", groupRoleIds.length > 0 ? groupRoleIds : [-1]);

  // Build lookup maps
  const groupMap = new Map((groups ?? []).map((g) => [g.id, g]));
  const groupRoleMap = new Map((groupRoles ?? []).map((gr) => [gr.id, gr]));

  // Map user_id to their group/role
  const userRoleMap = new Map<
    string,
    {
      group: { id: number; name: string };
      role: { id: number; name: string; description: string | null };
    }
  >();

  for (const ugr of userGroupRoles ?? []) {
    const groupRole = groupRoleMap.get(ugr.group_role_id);
    if (groupRole) {
      const group = groupMap.get(groupRole.group_id);
      if (group && groupRole.role) {
        userRoleMap.set(ugr.user_id, {
          group: { id: group.id, name: group.name },
          role: {
            id: groupRole.role.id,
            name: groupRole.role.name,
            description: groupRole.role.description,
          },
        });
      }
    }
  }

  // Build result with owner included
  const result: StaffWithRole[] = [];

  // Add owner first (if not already in staff list)
  if (ownerUserId) {
    const { data: ownerUser } = await supabase
      .from("users")
      .select("id, username, first_name, last_name, image, email")
      .eq("id", ownerUserId)
      .single();

    if (ownerUser) {
      const ownerInStaff = (staffMembers ?? []).find(
        (s) => s.user_id === ownerUserId
      );
      if (!ownerInStaff) {
        result.push({
          id: -1, // Special ID for owner not in staff table
          user_id: ownerUserId,
          organization_id: organizationId,
          created_at: null,
          user: ownerUser,
          group: null,
          role: null,
          isOwner: true,
        });
      }
    }
  }

  // Add staff members
  for (const staff of staffMembers ?? []) {
    const userRole = userRoleMap.get(staff.user_id);
    result.push({
      id: staff.id,
      user_id: staff.user_id,
      organization_id: staff.organization_id,
      created_at: staff.created_at,
      user: staff.user,
      group: userRole?.group ?? null,
      role: userRole?.role ?? null,
      isOwner: staff.user_id === ownerUserId,
    });
  }

  // Sort: owner first, then by role (Admin > Head Judge > Judge), then by name
  const roleOrder: Record<string, number> = {
    org_admin: 1,
    org_head_judge: 2,
    org_judge: 3,
  };

  result.sort((a, b) => {
    // Owner always first
    if (a.isOwner && !b.isOwner) return -1;
    if (!a.isOwner && b.isOwner) return 1;

    // Then by role
    const aOrder = a.role ? (roleOrder[a.role.name] ?? 99) : 99;
    const bOrder = b.role ? (roleOrder[b.role.name] ?? 99) : 99;
    if (aOrder !== bOrder) return aOrder - bOrder;

    // Then by name
    const aName = a.user?.username ?? a.user?.first_name ?? "";
    const bName = b.user?.username ?? b.user?.first_name ?? "";
    return aName.localeCompare(bName);
  });

  return result;
}

/**
 * Organization group with its role
 */
export type OrganizationGroup = {
  id: number;
  name: string;
  description: string | null;
  role: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  memberCount: number;
};

/**
 * List all groups for an organization with their roles
 */
export async function listOrganizationGroups(
  supabase: TypedClient,
  organizationId: number
): Promise<OrganizationGroup[]> {
  const { data: groups, error } = await supabase
    .from("groups")
    .select(
      `
      id,
      name,
      description,
      group_roles(
        role:roles(id, name, description)
      )
    `
    )
    .eq("organization_id", organizationId)
    .order("name");

  if (error) throw error;

  // Get member counts for each group
  const result: OrganizationGroup[] = [];

  for (const group of groups ?? []) {
    // Get the group_role ids for this group
    const { data: groupRoleData } = await supabase
      .from("group_roles")
      .select("id")
      .eq("group_id", group.id);

    const groupRoleIds = (groupRoleData ?? []).map((gr) => gr.id);

    // Count users in this group
    let memberCount = 0;
    if (groupRoleIds.length > 0) {
      const { count } = await supabase
        .from("user_group_roles")
        .select("*", { count: "exact", head: true })
        .in("group_role_id", groupRoleIds);
      memberCount = count ?? 0;
    }

    // Extract role from group_roles (assuming one role per group)
    const groupRole = group.group_roles?.[0];
    const role = groupRole?.role
      ? {
          id: groupRole.role.id,
          name: groupRole.role.name,
          description: groupRole.role.description,
        }
      : null;

    result.push({
      id: group.id,
      name: group.name,
      description: group.description,
      role,
      memberCount,
    });
  }

  return result;
}

/**
 * Search users for staff invitation
 * Returns users matching the search term who are NOT already staff
 */
export async function searchUsersForInvite(
  supabase: TypedClient,
  organizationId: number,
  searchTerm: string,
  limit: number = 10
): Promise<
  {
    id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
  }[]
> {
  if (!searchTerm || searchTerm.length < 2) {
    return [];
  }

  // Get existing staff user IDs
  const { data: existingStaff } = await supabase
    .from("organization_staff")
    .select("user_id")
    .eq("organization_id", organizationId);

  const existingUserIds = (existingStaff ?? []).map((s) => s.user_id);

  // Get organization owner
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_user_id")
    .eq("id", organizationId)
    .single();

  if (org?.owner_user_id) {
    existingUserIds.push(org.owner_user_id);
  }

  // Search users by username
  let query = supabase
    .from("users")
    .select("id, username, first_name, last_name, image")
    .ilike("username", `%${searchTerm}%`)
    .limit(limit);

  // Exclude existing staff/owner
  if (existingUserIds.length > 0) {
    query = query.not("id", "in", existingUserIds);
  }

  const { data: users, error } = await query;

  if (error) throw error;
  return users ?? [];
}

/**
 * Check if user has a specific permission in an organization
 * Uses the database function has_org_permission
 */
export async function hasOrgPermission(
  supabase: TypedClient,
  organizationId: number,
  permissionKey: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_org_permission", {
    org_id: organizationId,
    permission_key: permissionKey,
  });

  if (error) {
    console.error("Error checking permission:", error);
    return false;
  }

  return data === true;
}
