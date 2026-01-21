import { v } from "convex/values";
import { query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getCurrentUserHelper } from "../auth";
import { hasPermission } from "../permissions";
import { PERMISSIONS } from "../permissionKeys";
import { internalQuery } from "../_generated/server";

export const getMyDashboardData = query({
  handler: async (ctx) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      return {
        myTournaments: [],
        myOrganizations: [],
        stats: {
          winRate: 0,
          winRateChange: 0,
          currentRating: 0,
          ratingRank: 0,
          activeTournaments: 0,
          totalEnrolled: 0,
          championPoints: 0,
        },
      };
    }

    const profileId = user.profile._id;

    // Fetch all registrations for this user (using index for performance)
    const tournamentRegistrations = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .collect();

    // Batch fetch all tournaments at once (optimized from N+1)
    const tournamentIds = tournamentRegistrations.map((r) => r.tournamentId);
    const tournamentsRaw = await Promise.all(
      tournamentIds.map((id) => ctx.db.get(id))
    );
    const tournamentsMap = new Map(
      tournamentsRaw.filter((t) => t !== null).map((t) => [t._id, t])
    );

    // Build myTournaments list without N+1
    const myTournaments = [];
    let activeTournamentsCount = 0;
    for (const reg of tournamentRegistrations) {
      const tournament = tournamentsMap.get(reg.tournamentId);
      // Skip archived tournaments in dashboard
      if (tournament && !tournament.archivedAt) {
        myTournaments.push({
          _id: tournament._id,
          name: tournament.name,
          startDate: tournament.startDate ?? null,
          status: tournament.status,
        });

        if (
          tournament.status === "active" ||
          tournament.status === "upcoming"
        ) {
          activeTournamentsCount++;
        }
      }
    }

    // Fetch org memberships (using index for performance)
    const orgMembers = await ctx.db
      .query("organizationMembers")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .collect();

    // Batch fetch all organizations at once (optimized from N+1)
    const orgIds = orgMembers.map((m) => m.organizationId);
    const orgsRaw = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
    const myOrganizations = orgsRaw
      .filter((o) => o !== null)
      .map((org) => ({
        _id: org._id,
        name: org.name,
        slug: org.slug,
      }));

    // Fetch player stats (using index for performance)
    const playerStats = await ctx.db
      .query("tournamentPlayerStats")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .collect();

    let totalMatches = 0;
    let totalWins = 0;
    let totalChampionPoints = 0;

    for (const stats of playerStats) {
      totalMatches += stats.matchesPlayed;
      totalWins += stats.matchWins;
      if (stats.finalRanking === 1) {
        totalChampionPoints += 100;
      } else if (stats.finalRanking === 2) {
        totalChampionPoints += 75;
      } else if (stats.finalRanking === 3 || stats.finalRanking === 4) {
        totalChampionPoints += 50;
      } else if (stats.finalRanking && stats.finalRanking <= 8) {
        totalChampionPoints += 25;
      }
    }

    const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

    // Fetch recent matches (using indexes for performance - need to query both player indexes and merge)
    const [matchesAsPlayer1, matchesAsPlayer2] = await Promise.all([
      ctx.db
        .query("tournamentMatches")
        .withIndex("by_profile1", (q) => q.eq("profile1Id", profileId))
        .order("desc")
        .take(5),
      ctx.db
        .query("tournamentMatches")
        .withIndex("by_profile2", (q) => q.eq("profile2Id", profileId))
        .order("desc")
        .take(5),
    ]);

    // Merge and sort by creation time (desc), take top 5
    const recentMatches = [...matchesAsPlayer1, ...matchesAsPlayer2]
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5);

    // Filter to completed matches only
    const completedMatches = recentMatches.filter(
      (m) => m.status === "completed"
    );

    // Batch fetch all rounds at once (optimized from N+1)
    const roundIds = completedMatches.map((m) => m.roundId);
    const roundsRaw = await Promise.all(roundIds.map((id) => ctx.db.get(id)));
    const roundsMap = new Map(
      roundsRaw.filter((r) => r !== null).map((r) => [r._id, r])
    );

    // Batch fetch all phases at once
    const phaseIds = [
      ...new Set(roundsRaw.filter((r) => r !== null).map((r) => r.phaseId)),
    ];
    const phasesRaw = await Promise.all(phaseIds.map((id) => ctx.db.get(id)));
    const phasesMap = new Map(
      phasesRaw.filter((p) => p !== null).map((p) => [p._id, p])
    );

    // Batch fetch all tournaments for matches at once
    const matchTournamentIds = [
      ...new Set(
        phasesRaw.filter((p) => p !== null).map((p) => p.tournamentId)
      ),
    ];
    const matchTournamentsRaw = await Promise.all(
      matchTournamentIds.map((id) => ctx.db.get(id))
    );
    const matchTournamentsMap = new Map(
      matchTournamentsRaw.filter((t) => t !== null).map((t) => [t._id, t])
    );

    // Batch fetch all opponent profiles at once
    const opponentIds = completedMatches
      .map((m) => (m.profile1Id === profileId ? m.profile2Id : m.profile1Id))
      .filter((id): id is NonNullable<typeof id> => id !== undefined);
    const opponentsRaw = await Promise.all(
      opponentIds.map((id) => ctx.db.get(id))
    );
    const opponentsMap = new Map(
      opponentsRaw.filter((o) => o !== null).map((o) => [o._id, o])
    );

    // Build recent activity without N+1
    const recentActivity = [];
    for (const match of completedMatches) {
      const round = roundsMap.get(match.roundId);
      if (!round) continue;

      const phase = phasesMap.get(round.phaseId);
      if (!phase) continue;

      const tournament = matchTournamentsMap.get(phase.tournamentId);
      if (!tournament) continue;

      const isPlayer1 = match.profile1Id === profileId;
      const opponentId = isPlayer1 ? match.profile2Id : match.profile1Id;
      const opponent = opponentId ? opponentsMap.get(opponentId) : null;

      const won = match.winnerProfileId === profileId;

      recentActivity.push({
        _id: match._id,
        tournamentName: tournament.name,
        opponentName: opponent?.displayName || "Unknown",
        result: won ? "won" : "lost",
        date: match.endTime || Date.now(),
      });
    }

    const achievements = [];
    const championshipsWon = playerStats.filter(
      (s) => s.finalRanking === 1
    ).length;
    const top4Finishes = playerStats.filter(
      (s) => s.finalRanking && s.finalRanking <= 4
    ).length;

    if (championshipsWon > 0) {
      achievements.push({
        id: "tournament_champion",
        title: "Tournament Champion",
        description: `Won ${championshipsWon} tournament${championshipsWon > 1 ? "s" : ""}`,
        icon: "Trophy",
        color: "text-amber-500",
      });
    }

    if (winRate >= 60 && totalMatches >= 10) {
      achievements.push({
        id: "win_rate_milestone",
        title: "Win Rate Milestone",
        description: `Maintained ${Math.round(winRate)}%+ win rate`,
        icon: "Star",
        color: "text-blue-500",
      });
    }

    if (top4Finishes >= 3) {
      achievements.push({
        id: "consistent_performer",
        title: "Consistent Performer",
        description: `Finished top 4 in ${top4Finishes} tournaments`,
        icon: "Award",
        color: "text-green-500",
      });
    }

    return {
      myTournaments,
      myOrganizations,
      recentActivity,
      achievements,
      stats: {
        winRate: Math.round(winRate * 10) / 10,
        winRateChange: 0,
        currentRating: 1500,
        ratingRank: 0,
        activeTournaments: activeTournamentsCount,
        totalEnrolled: tournamentRegistrations.length,
        championPoints: totalChampionPoints,
      },
    };
  },
});

export const _getMyTournaments = internalQuery({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const tournamentRegistrations = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .collect();

    const tournaments = await Promise.all(
      tournamentRegistrations.map(async (reg) => {
        const t = await ctx.db.get(reg.tournamentId);
        // Filter out archived tournaments
        if (!t || t.archivedAt) return null;
        return {
          _id: t._id,
          name: t.name,
          startDate: t.startDate ?? null,
          status: t.status,
        };
      })
    );

    return tournaments.filter((t): t is NonNullable<typeof t> => t !== null);
  },
});

export const _getMyOrganizations = internalQuery({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const orgMembers = await ctx.db
      .query("organizationMembers")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .collect();

    const organizations = await Promise.all(
      orgMembers.map(async (mem) => {
        const o = await ctx.db.get(mem.organizationId);
        if (!o) return null;
        return {
          _id: o._id,
          name: o.name,
          slug: o.slug,
        };
      })
    );

    return organizations.filter((o): o is NonNullable<typeof o> => o !== null);
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    organizationId: v.optional(v.id("organizations")),
    searchTerm: v.optional(v.string()),
    statusFilter: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()), // Admin option to show archived tournaments
  },
  handler: async (ctx, args) => {
    // Get current user if authenticated
    const currentUser = await getCurrentUserHelper(ctx);

    // Get paginated results
    let paginatedTournaments;
    if (args.organizationId) {
      paginatedTournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_org", (q) =>
          q.eq("organizationId", args.organizationId!)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      paginatedTournaments = await ctx.db
        .query("tournaments")
        .order("desc")
        .paginate(args.paginationOpts);
    }

    // Filter results in memory for search and status
    let filteredItems = paginatedTournaments.page;

    // Filter out archived tournaments unless explicitly requested
    if (!args.includeArchived) {
      filteredItems = filteredItems.filter(
        (tournament) => !tournament.archivedAt
      );
    }

    if (args.searchTerm) {
      const term = args.searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(
        (tournament) =>
          tournament.name.toLowerCase().includes(term) ||
          tournament.format?.toLowerCase().includes(term)
      );
    }

    if (args.statusFilter && args.statusFilter !== "all") {
      filteredItems = filteredItems.filter(
        (tournament) => tournament.status === args.statusFilter
      );
    }

    // Filter based on visibility permissions
    if (currentUser?.profile) {
      const visibleTournaments = [];
      for (const tournament of filteredItems) {
        const hasViewPermission = await hasPermission(
          ctx,
          currentUser.profile._id,
          PERMISSIONS.TOURNAMENT_VIEW,
          "tournament",
          tournament._id
        );

        // Public tournaments or tournaments where user has view permission
        if (tournament.status !== "draft" || hasViewPermission) {
          visibleTournaments.push(tournament);
        }
      }
      filteredItems = visibleTournaments;
    } else {
      // Non-authenticated users can only see non-draft tournaments
      filteredItems = filteredItems.filter(
        (tournament) => tournament.status !== "draft"
      );
    }

    // Fetch related organizations
    const items = await Promise.all(
      filteredItems.map(async (tournament) => {
        const organization = tournament.organizationId
          ? await ctx.db.get(tournament.organizationId)
          : null;

        return {
          ...tournament,
          organization: organization
            ? {
                name: organization.name,
                slug: organization.slug,
              }
            : null,
        };
      })
    );

    return {
      ...paginatedTournaments,
      page: items,
    };
  },
});

export const getBySlug = query({
  args: {
    slug: v.string(),
    includeArchived: v.optional(v.boolean()), // Admin option to view archived tournaments
  },
  handler: async (ctx, args) => {
    // Get current user if authenticated
    const currentUser = await getCurrentUserHelper(ctx);

    // Find tournament by slug (using index for performance)
    const tournament = await ctx.db
      .query("tournaments")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!tournament) {
      return null;
    }

    // Check if tournament is archived
    if (tournament.archivedAt && !args.includeArchived) {
      return null; // Don't reveal existence of archived tournaments unless requested
    }

    // Check visibility permissions
    if (tournament.status === "draft") {
      if (!currentUser?.profile) {
        return null; // Don't reveal existence of draft tournaments
      }

      const hasViewPermission = await hasPermission(
        ctx,
        currentUser.profile._id,
        PERMISSIONS.TOURNAMENT_VIEW,
        "tournament",
        tournament._id
      );

      if (!hasViewPermission) {
        return null; // Don't reveal existence of draft tournaments
      }
    }

    // Get organization
    const organization = tournament.organizationId
      ? await ctx.db.get(tournament.organizationId)
      : null;

    // Get participant count and stats (using index for performance)
    const participants = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
      .collect();

    const participantsWithProfiles = await Promise.all(
      participants.map(async (reg) => {
        const profile = await ctx.db.get(reg.profileId);
        return {
          ...reg,
          profile,
        };
      })
    );

    const stats = {
      currentParticipants: participants.filter(
        (p) => p.status === "registered" || p.status === "checked_in"
      ).length,
      waitlistCount: participants.filter((p) => p.status === "waitlist").length,
      completedMatches: 0, // Tracked in TODO.md: Match Counting Implementation (TODO #3)
      totalMatches: 0, // Tracked in TODO.md: Match Counting Implementation (TODO #3)
    };

    return {
      tournament,
      organization,
      participants: participantsWithProfiles,
      stats,
    };
  },
});

export const getByOrgAndSlug = query({
  args: {
    organizationSlug: v.string(),
    tournamentSlug: v.string(),
    sessionToken: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()), // Admin option to view archived tournaments
  },
  handler: async (ctx, args) => {
    // Get current user if authenticated
    const currentUser = await getCurrentUserHelper(ctx);

    // Find organization by slug (using index for performance)
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.organizationSlug))
      .first();

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Find tournament by org and slug (using compound index for performance)
    const tournament = await ctx.db
      .query("tournaments")
      .withIndex("by_org_slug", (q) =>
        q.eq("organizationId", organization._id).eq("slug", args.tournamentSlug)
      )
      .first();

    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check if tournament is archived
    if (tournament.archivedAt && !args.includeArchived) {
      throw new Error("Tournament not found"); // Don't reveal existence of archived tournaments
    }

    // Check visibility permissions
    if (tournament.status === "draft" && currentUser?.profile) {
      const hasViewPermission = await hasPermission(
        ctx,
        currentUser.profile._id,
        PERMISSIONS.TOURNAMENT_VIEW,
        "tournament",
        tournament._id
      );

      if (!hasViewPermission) {
        throw new Error("Tournament not found"); // Don't reveal existence of draft tournaments
      }
    } else if (tournament.status === "draft" && !currentUser?.profile) {
      throw new Error("Tournament not found"); // Don't reveal existence of draft tournaments
    }

    return {
      ...tournament,
      organization: {
        name: organization.name,
        slug: organization.slug,
        ownerProfileId: organization.ownerProfileId,
      },
    };
  },
});

export const isOrganizer = query({
  args: {
    slug: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return false;
    }

    const currentUser = await getCurrentUserHelper(ctx);
    if (!currentUser?.profile) {
      return false;
    }

    // Find tournament by slug (using index for performance)
    const tournament = await ctx.db
      .query("tournaments")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    // Archived tournaments don't have organizers (for practical purposes)
    if (!tournament || !tournament.organizationId || tournament.archivedAt) {
      return false;
    }

    // Check if user has TOURNAMENT_MANAGE permission
    const hasManagePermission = await hasPermission(
      ctx,
      currentUser.profile._id,
      PERMISSIONS.TOURNAMENT_MANAGE,
      "tournament",
      tournament._id
    );

    if (hasManagePermission) {
      return true;
    }

    // Also check if user is organization owner
    const organization = await ctx.db.get(tournament.organizationId);
    if (
      organization &&
      organization.ownerProfileId === currentUser.profile._id
    ) {
      return true;
    }

    return false;
  },
});

export const getById = query({
  args: {
    id: v.id("tournaments"),
    includeArchived: v.optional(v.boolean()), // Admin option to view archived tournaments
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.id);

    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check if tournament is archived
    if (tournament.archivedAt && !args.includeArchived) {
      throw new Error("Tournament not found"); // Don't reveal existence of archived tournaments
    }

    const organization = tournament.organizationId
      ? await ctx.db.get(tournament.organizationId)
      : null;

    return {
      ...tournament,
      organization: organization
        ? {
            name: organization.name,
            slug: organization.slug,
          }
        : null,
    };
  },
});

/**
 * List archived tournaments for admin/organizer views.
 * Requires TOURNAMENT_VIEW permission on the organization.
 */
export const listArchived = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserHelper(ctx);
    if (!currentUser?.profile) {
      throw new Error("Not authenticated");
    }

    // Get all tournaments and filter to archived ones
    let query;
    if (args.organizationId) {
      // Check permission on the organization
      const hasOrgPermission = await hasPermission(
        ctx,
        currentUser.profile._id,
        PERMISSIONS.TOURNAMENT_VIEW,
        "organization",
        args.organizationId
      );

      if (!hasOrgPermission) {
        throw new Error(
          "You don't have permission to view archived tournaments for this organization"
        );
      }

      query = ctx.db
        .query("tournaments")
        .withIndex("by_org_archived", (q) =>
          q.eq("organizationId", args.organizationId!)
        )
        .order("desc");
    } else {
      // System admin viewing all archived tournaments
      const hasAdminPermission = await hasPermission(
        ctx,
        currentUser.profile._id,
        PERMISSIONS.ADMIN_ASSUME_SITE_ADMIN,
        "global",
        undefined
      );

      if (!hasAdminPermission) {
        throw new Error(
          "Admin access required to view all archived tournaments"
        );
      }

      query = ctx.db
        .query("tournaments")
        .withIndex("by_archived")
        .order("desc");
    }

    const paginatedResult = await query.paginate(args.paginationOpts);

    // Filter to only archived tournaments (archivedAt is set)
    const archivedTournaments = paginatedResult.page.filter(
      (t) => t.archivedAt !== undefined
    );

    // Fetch organizations
    const items = await Promise.all(
      archivedTournaments.map(async (tournament) => {
        const organization = tournament.organizationId
          ? await ctx.db.get(tournament.organizationId)
          : null;

        const archivedByProfile = tournament.archivedBy
          ? await ctx.db.get(tournament.archivedBy)
          : null;

        return {
          ...tournament,
          organization: organization
            ? { name: organization.name, slug: organization.slug }
            : null,
          archivedByName: archivedByProfile?.displayName || "Unknown",
        };
      })
    );

    return {
      ...paginatedResult,
      page: items,
    };
  },
});
