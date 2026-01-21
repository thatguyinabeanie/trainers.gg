/**
 * Meta Analysis Queries
 *
 * Provides tournament statistics, usage trends, and meta analysis data
 * for competitive Pokemon insights. These queries power the Meta Analysis Dashboard
 * with skill-stratified meta insights.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";

// ========== Skill Bracket Definitions ==========

/**
 * Skill bracket ranges for meta analysis segmentation.
 * These thresholds are based on typical competitive ladder distributions.
 *
 * Note: These constants are exported for use by frontend components
 * that need to display skill bracket options.
 */
export const SKILL_BRACKETS = {
  developing: { min: 0, max: 1350, label: "Developing" },
  competitive: { min: 1350, max: 1650, label: "Competitive" },
  expert: { min: 1650, max: 1900, label: "Expert" },
  elite: { min: 1900, max: Infinity, label: "Elite" },
} as const;

export type SkillBracket = keyof typeof SKILL_BRACKETS;

// ========== Tournament Statistics ==========

/**
 * Get overall platform statistics across all tournaments.
 * Provides high-level metrics for the platform dashboard.
 */
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    // Count tournaments by status
    const allTournaments = await ctx.db.query("tournaments").collect();
    const activeTournaments = allTournaments.filter(
      (t) => !t.archivedAt && t.status !== "cancelled"
    );

    const statusCounts = {
      draft: 0,
      upcoming: 0,
      active: 0,
      paused: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const tournament of activeTournaments) {
      statusCounts[tournament.status]++;
    }

    // Count total unique participants
    const registrations = await ctx.db
      .query("tournamentRegistrations")
      .collect();
    const uniqueParticipants = new Set(registrations.map((r) => r.profileId));

    // Count organizations
    const organizations = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Calculate total matches played
    const matches = await ctx.db
      .query("tournamentMatches")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    return {
      tournaments: {
        total: activeTournaments.length,
        byStatus: statusCounts,
      },
      participants: {
        uniquePlayers: uniqueParticipants.size,
        totalRegistrations: registrations.length,
      },
      organizations: {
        activeCount: organizations.length,
      },
      matches: {
        totalCompleted: matches.length,
      },
    };
  },
});

/**
 * Get tournament statistics for a specific organization.
 * Used in organization dashboards.
 */
export const getOrganizationStats = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get all non-archived tournaments for this organization
    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const activeTournaments = tournaments.filter((t) => !t.archivedAt);

    const statusCounts = {
      draft: 0,
      upcoming: 0,
      active: 0,
      paused: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const tournament of activeTournaments) {
      statusCounts[tournament.status]++;
    }

    // Get all registrations for org's tournaments
    const tournamentIds = new Set(activeTournaments.map((t) => t._id));
    const allRegistrations = await ctx.db
      .query("tournamentRegistrations")
      .collect();
    const orgRegistrations = allRegistrations.filter((r) =>
      tournamentIds.has(r.tournamentId)
    );

    // Count unique participants in this org's tournaments
    const uniqueParticipants = new Set(
      orgRegistrations.map((r) => r.profileId)
    );

    // Get completed matches for this org's tournaments
    const allMatches = await ctx.db
      .query("tournamentMatches")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Need to check which matches belong to this org's tournaments
    // Get all rounds -> phases -> tournaments to filter
    const rounds = await ctx.db.query("tournamentRounds").collect();
    const phases = await ctx.db.query("tournamentPhases").collect();

    const orgTournamentIds = new Set(activeTournaments.map((t) => t._id));
    const orgPhaseIds = new Set(
      phases
        .filter((p) => orgTournamentIds.has(p.tournamentId))
        .map((p) => p._id)
    );
    const orgRoundIds = new Set(
      rounds.filter((r) => orgPhaseIds.has(r.phaseId)).map((r) => r._id)
    );

    const orgMatches = allMatches.filter((m) => orgRoundIds.has(m.roundId));

    // Calculate average participants per tournament
    const avgParticipants =
      activeTournaments.length > 0
        ? Math.round(orgRegistrations.length / activeTournaments.length)
        : 0;

    return {
      tournaments: {
        total: activeTournaments.length,
        archived: tournaments.length - activeTournaments.length,
        byStatus: statusCounts,
      },
      participants: {
        uniquePlayers: uniqueParticipants.size,
        totalRegistrations: orgRegistrations.length,
        averagePerTournament: avgParticipants,
      },
      matches: {
        totalCompleted: orgMatches.length,
      },
    };
  },
});

/**
 * Get detailed statistics for a specific tournament.
 * Used in tournament detail views and post-tournament analysis.
 */
export const getTournamentStats = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Get registrations
    const registrations = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    const registrationStats = {
      total: registrations.length,
      registered: registrations.filter((r) => r.status === "registered").length,
      checkedIn: registrations.filter((r) => r.status === "checked_in").length,
      waitlist: registrations.filter((r) => r.status === "waitlist").length,
      dropped: registrations.filter((r) => r.status === "dropped").length,
      withdrawn: registrations.filter((r) => r.status === "withdrawn").length,
    };

    // Get player stats for this tournament
    const playerStats = await ctx.db
      .query("tournamentPlayerStats")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    // Calculate aggregate match statistics
    let totalMatchWins = 0;
    let totalMatchLosses = 0;
    let totalGameWins = 0;
    let totalGameLosses = 0;
    let totalByesGiven = 0;

    for (const stats of playerStats) {
      totalMatchWins += stats.matchWins;
      totalMatchLosses += stats.matchLosses;
      totalGameWins += stats.gameWins;
      totalGameLosses += stats.gameLosses;
      if (stats.hasReceivedBye) {
        totalByesGiven++;
      }
    }

    // Get phases and rounds
    const phases = await ctx.db
      .query("tournamentPhases")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    const phaseIds = phases.map((p) => p._id);
    const allRounds = await ctx.db.query("tournamentRounds").collect();
    const tournamentRounds = allRounds.filter((r) =>
      phaseIds.includes(r.phaseId)
    );

    // Get matches
    const roundIds = tournamentRounds.map((r) => r._id);
    const allMatches = await ctx.db.query("tournamentMatches").collect();
    const tournamentMatches = allMatches.filter((m) =>
      roundIds.includes(m.roundId)
    );

    const matchStats = {
      total: tournamentMatches.length,
      completed: tournamentMatches.filter((m) => m.status === "completed")
        .length,
      active: tournamentMatches.filter((m) => m.status === "active").length,
      pending: tournamentMatches.filter((m) => m.status === "pending").length,
      byes: tournamentMatches.filter((m) => m.isBye).length,
    };

    // Calculate average game win percentage
    const avgGameWinPercentage =
      playerStats.length > 0
        ? playerStats.reduce((sum, s) => sum + s.gameWinPercentage, 0) /
          playerStats.length
        : 0;

    return {
      tournament: {
        name: tournament.name,
        status: tournament.status,
        format: tournament.format,
        currentRound: tournament.currentRound,
      },
      registrations: registrationStats,
      matches: matchStats,
      rounds: {
        total: tournamentRounds.length,
        completed: tournamentRounds.filter((r) => r.status === "completed")
          .length,
        active: tournamentRounds.filter((r) => r.status === "active").length,
      },
      phases: {
        total: phases.length,
        completed: phases.filter((p) => p.status === "completed").length,
      },
      aggregates: {
        totalMatchWins,
        totalMatchLosses,
        totalGameWins,
        totalGameLosses,
        totalByesGiven,
        averageGameWinPercentage: Math.round(avgGameWinPercentage * 1000) / 10,
        activePlayers: playerStats.filter((s) => !s.isDropped).length,
        droppedPlayers: playerStats.filter((s) => s.isDropped).length,
      },
    };
  },
});

// ========== Player Performance Analytics ==========

/**
 * Get performance trends for a specific player across all tournaments.
 * Used in player profile pages and personal analytics.
 */
export const getPlayerPerformanceTrends = query({
  args: {
    profileId: v.id("profiles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get all tournament stats for this player
    const playerStats = await ctx.db
      .query("tournamentPlayerStats")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();

    // Batch fetch tournament info
    const tournamentIds = Array.from(
      new Set(playerStats.map((s) => s.tournamentId))
    );
    const tournaments = await Promise.all(
      tournamentIds.map((id) => ctx.db.get(id))
    );
    const tournamentMap = new Map(
      tournaments.filter((t) => t !== null).map((t) => [t._id, t])
    );

    // Build performance history with tournament context
    const performanceHistory = playerStats
      .map((stats) => {
        const tournament = tournamentMap.get(
          stats.tournamentId
        ) as Doc<"tournaments">;
        if (!tournament?.startDate || typeof tournament.startDate !== "number")
          return null;

        return {
          tournamentId: stats.tournamentId,
          tournamentName: tournament.name,
          tournamentStatus: tournament.status,
          startDate: tournament.startDate,
          matchWins: stats.matchWins,
          matchLosses: stats.matchLosses,
          matchWinPercentage: stats.matchWinPercentage,
          gameWinPercentage: stats.gameWinPercentage,
          finalRanking: stats.finalRanking,
          matchPoints: stats.matchPoints,
        };
      })
      .filter((h): h is NonNullable<typeof h> => h !== null)
      .sort((a, b) => (b.startDate ?? 0) - (a.startDate ?? 0))
      .slice(0, limit);

    // Calculate overall trends
    const completedTournaments = performanceHistory.filter(
      (h) => h.tournamentStatus === "completed"
    );

    const overallStats = {
      tournamentsPlayed: completedTournaments.length,
      averageWinRate:
        completedTournaments.length > 0
          ? completedTournaments.reduce(
              (sum, h) => sum + h.matchWinPercentage,
              0
            ) / completedTournaments.length
          : 0,
      bestFinish:
        completedTournaments.length > 0
          ? Math.min(
              ...completedTournaments
                .map((h) => h.finalRanking)
                .filter((r): r is number => r !== undefined)
            )
          : null,
      totalMatchWins: completedTournaments.reduce(
        (sum, h) => sum + h.matchWins,
        0
      ),
      totalMatchLosses: completedTournaments.reduce(
        (sum, h) => sum + h.matchLosses,
        0
      ),
      top4Finishes: completedTournaments.filter(
        (h) => h.finalRanking !== undefined && h.finalRanking <= 4
      ).length,
      championships: completedTournaments.filter((h) => h.finalRanking === 1)
        .length,
    };

    return {
      history: performanceHistory,
      overall: overallStats,
    };
  },
});

/**
 * Get leaderboard of top performers across all tournaments.
 * Supports filtering by time range and organization.
 */
export const getLeaderboard = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    timeRangeStart: v.optional(v.number()),
    timeRangeEnd: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Get all player stats
    const allPlayerStats = await ctx.db
      .query("tournamentPlayerStats")
      .collect();

    // Filter by organization if specified
    let filteredStats = allPlayerStats;

    if (args.organizationId) {
      const orgId = args.organizationId;
      const orgTournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_org", (q) => q.eq("organizationId", orgId))
        .collect();
      const orgTournamentIds = new Set(orgTournaments.map((t) => t._id));
      filteredStats = allPlayerStats.filter((s) =>
        orgTournamentIds.has(s.tournamentId)
      );
    }

    // Filter by time range if specified
    if (args.timeRangeStart || args.timeRangeEnd) {
      const tournaments = await ctx.db.query("tournaments").collect();
      const tournamentMap = new Map(tournaments.map((t) => [t._id, t]));

      filteredStats = filteredStats.filter((s) => {
        const tournament = tournamentMap.get(s.tournamentId);
        if (!tournament?.startDate) return false;

        const inStart =
          !args.timeRangeStart || tournament.startDate >= args.timeRangeStart;
        const inEnd =
          !args.timeRangeEnd || tournament.startDate <= args.timeRangeEnd;
        return inStart && inEnd;
      });
    }

    // Aggregate stats by player
    const playerAggregates = new Map<
      Id<"profiles">,
      {
        profileId: Id<"profiles">;
        totalMatchWins: number;
        totalMatchLosses: number;
        totalGameWins: number;
        totalGameLosses: number;
        tournamentsPlayed: number;
        championships: number;
        top4Finishes: number;
        top8Finishes: number;
        totalMatchPoints: number;
      }
    >();

    for (const stats of filteredStats) {
      const existing = playerAggregates.get(stats.profileId) ?? {
        profileId: stats.profileId,
        totalMatchWins: 0,
        totalMatchLosses: 0,
        totalGameWins: 0,
        totalGameLosses: 0,
        tournamentsPlayed: 0,
        championships: 0,
        top4Finishes: 0,
        top8Finishes: 0,
        totalMatchPoints: 0,
      };

      existing.totalMatchWins += stats.matchWins;
      existing.totalMatchLosses += stats.matchLosses;
      existing.totalGameWins += stats.gameWins;
      existing.totalGameLosses += stats.gameLosses;
      existing.tournamentsPlayed += 1;
      existing.totalMatchPoints += stats.matchPoints;

      if (stats.finalRanking === 1) existing.championships += 1;
      if (stats.finalRanking !== undefined && stats.finalRanking <= 4)
        existing.top4Finishes += 1;
      if (stats.finalRanking !== undefined && stats.finalRanking <= 8)
        existing.top8Finishes += 1;

      playerAggregates.set(stats.profileId, existing);
    }

    // Convert to array and calculate derived metrics
    const leaderboardEntries = Array.from(playerAggregates.values()).map(
      (agg) => {
        const totalMatches = agg.totalMatchWins + agg.totalMatchLosses;
        const winRate =
          totalMatches > 0 ? (agg.totalMatchWins / totalMatches) * 100 : 0;

        // Calculate championship points (simplified scoring)
        const championshipPoints =
          agg.championships * 100 +
          (agg.top4Finishes - agg.championships) * 50 +
          (agg.top8Finishes - agg.top4Finishes) * 25;

        return {
          ...agg,
          winRate: Math.round(winRate * 10) / 10,
          championshipPoints,
        };
      }
    );

    // Sort by championship points, then win rate
    leaderboardEntries.sort((a, b) => {
      if (b.championshipPoints !== a.championshipPoints) {
        return b.championshipPoints - a.championshipPoints;
      }
      return b.winRate - a.winRate;
    });

    // Fetch profile info for top entries
    const topEntries = leaderboardEntries.slice(0, limit);
    const profiles = await Promise.all(
      topEntries.map((e) => ctx.db.get(e.profileId))
    );
    const profileMap = new Map(
      profiles.filter((p) => p !== null).map((p) => [p._id, p])
    );

    const leaderboard = topEntries.map((entry, index) => {
      const profile = profileMap.get(entry.profileId) as
        | Doc<"profiles">
        | undefined;
      const { profileId: _profileId, ...restEntry } = entry;
      return {
        rank: index + 1,
        profileId: entry.profileId,
        displayName: profile?.displayName ?? "Unknown",
        username: profile?.username ?? "unknown",
        avatarUrl: profile?.avatarUrl,
        ...restEntry,
      };
    });

    return {
      leaderboard,
      totalPlayers: playerAggregates.size,
    };
  },
});

// ========== Tournament Format Analytics ==========

/**
 * Get statistics grouped by tournament format.
 * Useful for understanding which formats are most popular.
 */
export const getFormatStatistics = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    let tournaments;

    if (args.organizationId) {
      const orgId = args.organizationId;
      tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_org", (q) => q.eq("organizationId", orgId))
        .collect();
    } else {
      tournaments = await ctx.db.query("tournaments").collect();
    }

    // Filter out archived and cancelled tournaments
    const activeTournaments = tournaments.filter(
      (t) => !t.archivedAt && t.status !== "cancelled"
    );

    // Group by format
    const formatStats = new Map<
      string,
      {
        format: string;
        tournamentCount: number;
        completedCount: number;
        activeCount: number;
        totalParticipants: number;
      }
    >();

    // Get all registrations for counting
    const allRegistrations = await ctx.db
      .query("tournamentRegistrations")
      .collect();
    const registrationsByTournament = new Map<Id<"tournaments">, number>();

    for (const reg of allRegistrations) {
      if (reg.status === "registered" || reg.status === "checked_in") {
        const current = registrationsByTournament.get(reg.tournamentId) ?? 0;
        registrationsByTournament.set(reg.tournamentId, current + 1);
      }
    }

    for (const tournament of activeTournaments) {
      const format = tournament.format ?? "Unknown";
      const existing = formatStats.get(format) ?? {
        format,
        tournamentCount: 0,
        completedCount: 0,
        activeCount: 0,
        totalParticipants: 0,
      };

      existing.tournamentCount += 1;
      if (tournament.status === "completed") existing.completedCount += 1;
      if (tournament.status === "active") existing.activeCount += 1;
      existing.totalParticipants +=
        registrationsByTournament.get(tournament._id) ?? 0;

      formatStats.set(format, existing);
    }

    // Convert to array and sort by tournament count
    const formats = Array.from(formatStats.values())
      .map((stats) => ({
        ...stats,
        averageParticipants:
          stats.tournamentCount > 0
            ? Math.round(stats.totalParticipants / stats.tournamentCount)
            : 0,
      }))
      .sort((a, b) => b.tournamentCount - a.tournamentCount);

    return {
      formats,
      totalFormatsUsed: formats.length,
    };
  },
});

// ========== Time-Based Analytics ==========

/**
 * Get tournament activity over time.
 * Used for trend analysis and growth tracking.
 */
export const getActivityTimeline = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    granularity: v.optional(
      v.union(v.literal("day"), v.literal("week"), v.literal("month"))
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const granularity = args.granularity ?? "week";
    const endDate = args.endDate ?? Date.now();
    const startDate = args.startDate ?? endDate - 90 * 24 * 60 * 60 * 1000; // Default 90 days

    let tournaments;

    if (args.organizationId) {
      const orgId = args.organizationId;
      tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_org", (q) => q.eq("organizationId", orgId))
        .collect();
    } else {
      tournaments = await ctx.db.query("tournaments").collect();
    }

    // Filter to date range and non-archived
    const filteredTournaments = tournaments.filter((t) => {
      if (t.archivedAt) return false;
      if (!t.startDate) return false;
      return t.startDate >= startDate && t.startDate <= endDate;
    });

    // Group by time period
    const getperiodKey = (timestamp: number): string => {
      const date = new Date(timestamp);
      switch (granularity) {
        case "day":
          return date.toISOString().split("T")[0];
        case "week": {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return weekStart.toISOString().split("T")[0];
        }
        case "month":
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }
    };

    const periodStats = new Map<
      string,
      {
        period: string;
        tournamentsCreated: number;
        tournamentsCompleted: number;
        participantCount: number;
      }
    >();

    // Get registrations for participant counting
    const allRegistrations = await ctx.db
      .query("tournamentRegistrations")
      .collect();
    const registrationsByTournament = new Map<Id<"tournaments">, number>();

    for (const reg of allRegistrations) {
      if (reg.status === "registered" || reg.status === "checked_in") {
        const current = registrationsByTournament.get(reg.tournamentId) ?? 0;
        registrationsByTournament.set(reg.tournamentId, current + 1);
      }
    }

    for (const tournament of filteredTournaments) {
      if (!tournament.startDate) continue;

      const periodKey = getperiodKey(tournament.startDate);
      const existing = periodStats.get(periodKey) ?? {
        period: periodKey,
        tournamentsCreated: 0,
        tournamentsCompleted: 0,
        participantCount: 0,
      };

      existing.tournamentsCreated += 1;
      if (tournament.status === "completed") existing.tournamentsCompleted += 1;
      existing.participantCount +=
        registrationsByTournament.get(tournament._id) ?? 0;

      periodStats.set(periodKey, existing);
    }

    // Convert to sorted array
    const timeline = Array.from(periodStats.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    return {
      timeline,
      granularity,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    };
  },
});

// ========== Head-to-Head Statistics ==========

/**
 * Get head-to-head record between two players.
 * Used in player profile pages and match previews.
 */
export const getHeadToHead = query({
  args: {
    profile1Id: v.id("profiles"),
    profile2Id: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    // Find all matches between these two players
    const allMatches = await ctx.db.query("tournamentMatches").collect();

    const headToHeadMatches = allMatches.filter(
      (m) =>
        m.status === "completed" &&
        !m.isBye &&
        ((m.profile1Id === args.profile1Id &&
          m.profile2Id === args.profile2Id) ||
          (m.profile1Id === args.profile2Id &&
            m.profile2Id === args.profile1Id))
    );

    // Calculate wins for each player
    let player1Wins = 0;
    let player2Wins = 0;
    let player1GameWins = 0;
    let player2GameWins = 0;

    for (const match of headToHeadMatches) {
      if (match.winnerProfileId === args.profile1Id) {
        player1Wins++;
      } else if (match.winnerProfileId === args.profile2Id) {
        player2Wins++;
      }

      // Count game wins
      if (match.profile1Id === args.profile1Id) {
        player1GameWins += match.gameWins1;
        player2GameWins += match.gameWins2;
      } else {
        player1GameWins += match.gameWins2;
        player2GameWins += match.gameWins1;
      }
    }

    // Get profile info
    const profile1 = await ctx.db.get(args.profile1Id);
    const profile2 = await ctx.db.get(args.profile2Id);

    // Get tournament context for each match
    const roundIds = Array.from(
      new Set(headToHeadMatches.map((m) => m.roundId))
    );
    const rounds = await Promise.all(roundIds.map((id) => ctx.db.get(id)));
    const roundMap = new Map(
      rounds.filter((r) => r !== null).map((r) => [r._id, r])
    );

    const phaseIds = Array.from(
      new Set(
        rounds
          .filter(
            (r): r is NonNullable<typeof r> => r !== null && r.phaseId !== null
          )
          .map((r) => r.phaseId!)
      )
    );
    const phases = await Promise.all(phaseIds.map((id) => ctx.db.get(id)));
    const phaseMap = new Map(
      phases.filter((p) => p !== null).map((p) => [p._id, p])
    );

    const tournamentIds = Array.from(
      new Set(
        phases
          .filter(
            (p): p is NonNullable<typeof p> =>
              p !== null && p.tournamentId !== null
          )
          .map((p) => p.tournamentId!)
      )
    );
    const tournaments = await Promise.all(
      tournamentIds.map((id) => ctx.db.get(id))
    );
    const tournamentMap = new Map(
      tournaments.filter((t) => t !== null).map((t) => [t._id, t])
    );

    // Build match history with context
    const matchHistory = headToHeadMatches
      .map((match) => {
        const round = roundMap.get(match.roundId) as
          | Doc<"tournamentRounds">
          | undefined;
        if (!round) return null;

        const phase = phaseMap.get(round.phaseId) as
          | Doc<"tournamentPhases">
          | undefined;
        if (!phase) return null;

        const tournament = tournamentMap.get(phase.tournamentId) as
          | Doc<"tournaments">
          | undefined;
        if (!tournament) return null;

        return {
          matchId: match._id,
          tournamentName: tournament.name,
          roundNumber: round.roundNumber,
          winnerId: match.winnerProfileId,
          gameScore:
            match.profile1Id === args.profile1Id
              ? `${match.gameWins1}-${match.gameWins2}`
              : `${match.gameWins2}-${match.gameWins1}`,
          date: match.endTime,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => (b.date ?? 0) - (a.date ?? 0));

    return {
      player1: {
        profileId: args.profile1Id,
        displayName: profile1?.displayName ?? "Unknown",
        matchWins: player1Wins,
        gameWins: player1GameWins,
      },
      player2: {
        profileId: args.profile2Id,
        displayName: profile2?.displayName ?? "Unknown",
        matchWins: player2Wins,
        gameWins: player2GameWins,
      },
      totalMatches: headToHeadMatches.length,
      matchHistory,
    };
  },
});
