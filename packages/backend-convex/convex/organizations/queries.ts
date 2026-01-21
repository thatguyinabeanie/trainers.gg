import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!organization) {
      return null;
    }

    // Get follower count (organization members) using index
    const followerCount = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", organization._id))
      .collect()
      .then((members) => members.length);

    // Get all tournaments for this organization using index
    const allTournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_org", (q) => q.eq("organizationId", organization._id))
      .collect();

    // Separate tournaments by status and add player counts
    const activeTournamentsWithCounts = await Promise.all(
      allTournaments
        .filter((t) => t.status === "active" && !t.archivedAt)
        .map(async (tournament) => {
          const registrationCount = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) =>
              q.eq("tournamentId", tournament._id)
            )
            .collect()
            .then((regs) => regs.length);
          return { ...tournament, registrationCount };
        })
    );

    const upcomingTournamentsWithCounts = await Promise.all(
      allTournaments
        .filter((t) => t.status === "upcoming")
        .map(async (tournament) => {
          const registrationCount = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) =>
              q.eq("tournamentId", tournament._id)
            )
            .collect()
            .then((regs) => regs.length);
          return { ...tournament, registrationCount };
        })
    );

    const completedTournamentsWithCounts = await Promise.all(
      allTournaments
        .filter((t) => t.status === "completed")
        .sort((a, b) => b._creationTime - a._creationTime)
        .slice(0, 5)
        .map(async (tournament) => {
          const registrationCount = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) =>
              q.eq("tournamentId", tournament._id)
            )
            .collect()
            .then((regs) => regs.length);
          return { ...tournament, registrationCount };
        })
    );

    // Calculate average tournament size
    const tournamentsWithParticipants = allTournaments.filter(
      (t) => t.maxParticipants && t.maxParticipants > 0
    );
    const avgTournamentSize =
      tournamentsWithParticipants.length > 0
        ? Math.round(
            tournamentsWithParticipants.reduce(
              (sum, t) => sum + (t.maxParticipants || 0),
              0
            ) / tournamentsWithParticipants.length
          )
        : 0;

    // Get most common format
    const formatCounts = new Map<string, number>();
    allTournaments.forEach((t) => {
      if (t.format) {
        formatCounts.set(t.format, (formatCounts.get(t.format) || 0) + 1);
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
      followerCount,
      tournaments: {
        active: activeTournamentsWithCounts,
        upcoming: upcomingTournamentsWithCounts,
        completed: completedTournamentsWithCounts,
      },
      stats: {
        activeTournamentsCount: activeTournamentsWithCounts.length,
        totalTournamentsCount: allTournaments.length,
        avgTournamentSize,
        primaryFormat,
      },
    };
  },
});

export const getOrganizationDetails = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      return null;
    }

    // Get member count using index
    const memberCount = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect()
      .then((members) => members.length);

    // Get tournament count (excluding archived) using index
    const tournamentCount = await ctx.db
      .query("tournaments")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect()
      .then((tournaments) => tournaments.filter((t) => !t.archivedAt).length);

    // Get owner profile
    const owner = await ctx.db.get(organization.ownerProfileId);

    return {
      ...organization,
      _count: {
        members: memberCount,
        tournaments: tournamentCount,
      },
      owner,
    };
  },
});

export const getOrganizationMembers = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Get profile details and roles for each member
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const profile = await ctx.db.get(member.profileId);

        // Get all group roles for this member in this organization
        const groups = await ctx.db
          .query("groups")
          .withIndex("by_org", (q) =>
            q.eq("organizationId", args.organizationId)
          )
          .collect();

        const memberRoles = [];
        for (const group of groups) {
          const groupRoles = await ctx.db
            .query("groupRoles")
            .withIndex("by_group", (q) => q.eq("groupId", group._id))
            .collect();

          for (const groupRole of groupRoles) {
            const profileGroupRole = await ctx.db
              .query("profileGroupRoles")
              .withIndex("by_profile_group_role", (q) =>
                q
                  .eq("profileId", member.profileId)
                  .eq("groupRoleId", groupRole._id)
              )
              .first();

            if (profileGroupRole) {
              const role = await ctx.db.get(groupRole.roleId);
              memberRoles.push({
                group: group.name,
                role: role?.name || "Unknown",
                groupId: group._id,
                roleId: groupRole.roleId,
              });
            }
          }
        }

        return {
          ...member,
          profile,
          roles: memberRoles,
        };
      })
    );

    return membersWithDetails;
  },
});

export const getOrganizationGroups = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const groups = await ctx.db
      .query("groups")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Get member count for each group
    const groupsWithCounts = await Promise.all(
      groups.map(async (group) => {
        const groupRoles = await ctx.db
          .query("groupRoles")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();

        let memberCount = 0;
        for (const groupRole of groupRoles) {
          const profileGroupRoles = await ctx.db
            .query("profileGroupRoles")
            .withIndex("by_group_role", (q) =>
              q.eq("groupRoleId", groupRole._id)
            )
            .collect();
          memberCount += profileGroupRoles.length;
        }

        return {
          ...group,
          _count: {
            members: memberCount,
          },
        };
      })
    );

    return groupsWithCounts;
  },
});

export const getOrganizationInvitations = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Use compound index for org + status
    const invitations = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect()
      .then((invs) => invs.filter((i) => i.status === "pending"));

    // Get profile details for each invitation
    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const invitedProfile = await ctx.db.get(invitation.invitedProfileId);
        const invitedByProfile = await ctx.db.get(
          invitation.invitedByProfileId
        );

        return {
          ...invitation,
          invitedProfile,
          invitedByProfile,
        };
      })
    );

    return invitationsWithDetails;
  },
});

export const getMyInvitations = query({
  handler: async (ctx) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      return [];
    }

    // Use compound index for invited profile + status
    const invitations = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_invited_status", (q) =>
        q.eq("invitedProfileId", user.profile!._id).eq("status", "pending")
      )
      .collect();

    return Promise.all(
      invitations.map(async (invitation) => {
        const organization = await ctx.db.get(invitation.organizationId);
        return { ...invitation, organization };
      })
    );
  },
});

export const getMyOrganizations = query({
  handler: async (ctx) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      return [];
    }

    // Get organizations where user is owner (using index)
    const ownedOrgs = await ctx.db
      .query("organizations")
      .withIndex("by_owner", (q) => q.eq("ownerProfileId", user.profile!._id))
      .collect();

    // Get organizations where user is a member (using index)
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_profile", (q) => q.eq("profileId", user.profile!._id))
      .collect();

    // Get the organization details for each membership
    const memberOrgs = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        if (!org) return null;

        // Check if user is the owner
        const isOwner = org.ownerProfileId === user.profile!._id;

        return {
          ...org,
          isOwner,
        };
      })
    );

    // Combine owned and member organizations, marking owners
    const ownedOrgsWithFlag = ownedOrgs.map((org) => ({
      ...org,
      isOwner: true,
    }));

    // Filter out null organizations and duplicates (user might be both owner and member)
    const allOrgs = [
      ...ownedOrgsWithFlag,
      ...memberOrgs.filter((org) => org !== null),
    ];
    const uniqueOrgs = allOrgs.filter(
      (org, index, self) => index === self.findIndex((o) => o._id === org._id)
    );

    return uniqueOrgs;
  },
});

export const list = query({
  args: {
    searchTerm: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { searchTerm, paginationOpts }) => {
    let q = ctx.db.query("organizations");

    if (searchTerm && searchTerm.trim()) {
      q = q.filter((q) =>
        q.or(
          q.eq(q.field("name"), searchTerm),
          q.eq(q.field("slug"), searchTerm)
        )
      );
    }

    const results = await q.order("desc").paginate(paginationOpts);

    // Add member and tournament counts using indexes
    const organizationsWithCounts = await Promise.all(
      results.page.map(async (org) => {
        const memberCount = await ctx.db
          .query("organizationMembers")
          .withIndex("by_org", (q) => q.eq("organizationId", org._id))
          .collect()
          .then((members) => members.length);

        const tournamentCount = await ctx.db
          .query("tournaments")
          .withIndex("by_org", (q) => q.eq("organizationId", org._id))
          .collect()
          .then(
            (tournaments) => tournaments.filter((t) => !t.archivedAt).length
          );

        return {
          ...org,
          _count: {
            members: memberCount,
            tournaments: tournamentCount,
          },
        };
      })
    );

    return {
      ...results,
      page: organizationsWithCounts,
    };
  },
});

export const listPublicOrganizations = query({
  args: {},
  handler: async (ctx) => {
    // Get all active organizations (no index for status on organizations, so we'll filter in memory)
    // Note: If this becomes a performance issue, add by_status index to organizations table
    const organizations = await ctx.db
      .query("organizations")
      .collect()
      .then((orgs) => orgs.filter((o) => o.status === "active"));

    // Add tournament counts for each organization using indexes
    const organizationsWithStats = await Promise.all(
      organizations.map(async (org) => {
        const allTournaments = await ctx.db
          .query("tournaments")
          .withIndex("by_org", (q) => q.eq("organizationId", org._id))
          .collect();

        const activeTournaments = allTournaments.filter(
          (t) =>
            (t.status === "upcoming" || t.status === "active") && !t.archivedAt
        );

        return {
          ...org,
          activeTournamentsCount: activeTournaments.length,
          totalTournamentsCount: allTournaments.filter((t) => !t.archivedAt)
            .length,
        };
      })
    );

    return organizationsWithStats;
  },
});
