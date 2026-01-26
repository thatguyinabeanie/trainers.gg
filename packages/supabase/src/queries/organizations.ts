import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TypedClient = SupabaseClient<Database>;

/**
 * List all public (active) organizations with tournament counts
 */
export async function listPublicOrganizations(supabase: TypedClient) {
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!organizations) return [];

  // Get tournament counts for each organization
  const orgsWithCounts = await Promise.all(
    organizations.map(async (org) => {
      const { count: totalCount } = await supabase
        .from("tournaments")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .is("archived_at", null);

      const { count: activeCount } = await supabase
        .from("tournaments")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .is("archived_at", null)
        .in("status", ["upcoming", "active"]);

      return {
        ...org,
        activeTournamentsCount: activeCount ?? 0,
        totalTournamentsCount: totalCount ?? 0,
      };
    })
  );

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

  // Add member and tournament counts
  const orgsWithCounts = await Promise.all(
    (data ?? []).map(async (org) => {
      const { count: memberCount } = await supabase
        .from("organization_members")
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
          members: memberCount ?? 0,
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

  // Get follower count (organization members)
  const { count: followerCount } = await supabase
    .from("organization_members")
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
 * List organizations where user is owner or member
 * Organizations are owned by users (not alts), but members join via their alt
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

  // Get the user's alt for checking membership
  const { data: alt } = await supabase
    .from("alts")
    .select("id")
    .eq("user_id", targetUserId)
    .single();

  const altId = alt?.id as number | undefined;

  // Get organizations where user is owner
  const { data: ownedOrgs } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_user_id", targetUserId);

  // Get organizations where user is a member (via their alt)
  let memberOrgs: typeof ownedOrgs = [];
  if (altId) {
    const { data: memberships } = await supabase
      .from("organization_members")
      .select(
        `
        organization:organizations(*)
      `
      )
      .eq("alt_id", altId);

    memberOrgs = (memberships ?? [])
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

  const memberOrgsWithFlag = (memberOrgs ?? []).map((org) => ({
    ...org,
    isOwner: org.owner_user_id === targetUserId,
  }));

  // Combine and deduplicate
  const allOrgs = [...ownedOrgsWithFlag, ...memberOrgsWithFlag];
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

  // Get the user's alt for RBAC permission checks
  const { data: alt } = await supabase
    .from("alts")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!alt) return false;
  const altId = alt.id as number;

  // Check if member with ORG_MANAGE permission through RBAC
  const { data: altGroupRoles } = await supabase
    .from("alt_group_roles")
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
    `
    )
    .eq("alt_id", altId);

  for (const agr of altGroupRoles ?? []) {
    const groupRole = agr.group_role as {
      group: { organization_id: number } | null;
      role: {
        role_permissions: { permission: { key: string } | null }[];
      } | null;
    } | null;
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
 * List organization members with alt details
 */
export async function listOrganizationMembers(
  supabase: TypedClient,
  organizationId: number
) {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
      *,
      alt:alts(*)
    `
    )
    .eq("organization_id", organizationId);

  if (error) throw error;
  return data ?? [];
}

/**
 * Check if user is member of organization (owner or member via alt)
 */
export async function isOrganizationMember(
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

  // Get the user's alt for checking membership
  const { data: alt } = await supabase
    .from("alts")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!alt) return false;

  // Check if member via alt
  const { data } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("alt_id", alt.id)
    .single();

  return !!data;
}

/**
 * Get pending invitations for an alt
 */
export async function getMyOrganizationInvitations(
  supabase: TypedClient,
  altId: number
) {
  const { data: invitations, error } = await supabase
    .from("organization_invitations")
    .select(
      `
      *,
      organization:organizations(*),
      invited_by:alts!organization_invitations_invited_by_alt_id_fkey(*)
    `
    )
    .eq("invited_alt_id", altId)
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
      invited_alt:alts!organization_invitations_invited_alt_id_fkey(*),
      invited_by:alts!organization_invitations_invited_by_alt_id_fkey(*)
    `
    )
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  if (error) throw error;
  return invitations ?? [];
}
