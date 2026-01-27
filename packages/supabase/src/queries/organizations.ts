import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TypedClient = SupabaseClient<Database>;
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
    .single();

  const altId = alt?.id as number | undefined;

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
    .select("*", { count: "exact" })
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
      };
    })
  );

  return {
    tournaments: tournamentsWithCounts,
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit,
  };
}
