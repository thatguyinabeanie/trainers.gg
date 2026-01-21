/**
 * Real-Time Tournament Subscription Queries
 *
 * These queries are optimized for real-time subscriptions using Convex's
 * built-in reactivity. When used with `useQuery` on the frontend, they
 * automatically update when the underlying data changes.
 *
 * Usage Pattern:
 * ```typescript
 * // Frontend component
 * const liveStandings = useQuery(api.tournaments.subscriptions.liveStandings, {
 *   tournamentId: tournament._id
 * });
 * ```
 *
 * All queries in this file are designed for:
 * - Minimal data transfer (only essential fields)
 * - Efficient reactivity (indexed queries where possible)
 * - Low latency updates (optimized for real-time UX)
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

// ========== Live Tournament Status ==========

/**
 * Subscribe to live tournament status updates.
 * Returns essential tournament state for header/status displays.
 *
 * Updates when: Tournament status, round, or phase changes.
 */
export const liveTournamentStatus = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || tournament.archivedAt) {
      return null;
    }

    // Get current phase if exists
    let currentPhase: Doc<"tournamentPhases"> | null = null;
    if (tournament.currentPhaseId) {
      currentPhase = await ctx.db.get(tournament.currentPhaseId);
    }

    // Count active registrations
    const registrations = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_status", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    const checkedInCount = registrations.filter(
      (r) => r.status === "checked_in"
    ).length;
    const registeredCount = registrations.filter(
      (r) => r.status === "registered" || r.status === "checked_in"
    ).length;
    const waitlistCount = registrations.filter(
      (r) => r.status === "waitlist"
    ).length;

    return {
      _id: tournament._id,
      name: tournament.name,
      status: tournament.status,
      currentRound: tournament.currentRound,
      maxParticipants: tournament.maxParticipants,
      currentPhase: currentPhase
        ? {
            _id: currentPhase._id,
            name: currentPhase.name,
            status: currentPhase.status,
            currentRound: currentPhase.currentRound,
            plannedRounds: currentPhase.plannedRounds,
          }
        : null,
      participants: {
        checkedIn: checkedInCount,
        registered: registeredCount,
        waitlist: waitlistCount,
        capacity: tournament.maxParticipants ?? null,
      },
      // Include timestamps for client-side freshness checks
      _lastUpdated: Date.now(),
    };
  },
});

// ========== Live Standings ==========

/**
 * Subscribe to live tournament standings.
 * Updates in real-time as match results are reported.
 *
 * Updates when: Any player's stats change (match reported, standings recalculated).
 */
export const liveStandings = query({
  args: {
    tournamentId: v.id("tournaments"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    // Get player stats for this tournament
    const playerStats = await ctx.db
      .query("tournamentPlayerStats")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    // Sort by match points (desc), then tiebreakers
    const sortedStats = playerStats
      .filter((s) => !s.isDropped)
      .sort((a, b) => {
        // Primary: Match points
        if (b.matchPoints !== a.matchPoints) {
          return b.matchPoints - a.matchPoints;
        }
        // Secondary: Opponent match win percentage
        if (b.opponentMatchWinPercentage !== a.opponentMatchWinPercentage) {
          return b.opponentMatchWinPercentage - a.opponentMatchWinPercentage;
        }
        // Tertiary: Game win percentage
        if (b.gameWinPercentage !== a.gameWinPercentage) {
          return b.gameWinPercentage - a.gameWinPercentage;
        }
        // Quaternary: Opponent game win percentage
        return b.opponentGameWinPercentage - a.opponentGameWinPercentage;
      })
      .slice(0, limit);

    // Batch fetch profile info
    const profileIds = sortedStats.map((s) => s.profileId);
    const profiles = await Promise.all(profileIds.map((id) => ctx.db.get(id)));
    const profileMap = new Map(
      profiles.filter((p) => p !== null).map((p) => [p._id, p])
    );

    // Build standings list
    const standings = sortedStats.map((stats, index) => {
      const profile = profileMap.get(stats.profileId);
      return {
        rank: index + 1,
        profileId: stats.profileId,
        displayName: profile?.displayName ?? "Unknown",
        username: profile?.username ?? "unknown",
        avatarUrl: profile?.avatarUrl,
        matchPoints: stats.matchPoints,
        record: `${stats.matchWins}-${stats.matchLosses}`,
        matchWinPercentage: Math.round(stats.matchWinPercentage * 1000) / 10,
        gameWinPercentage: Math.round(stats.gameWinPercentage * 1000) / 10,
        opponentMatchWinPercentage:
          Math.round(stats.opponentMatchWinPercentage * 1000) / 10,
        hasReceivedBye: stats.hasReceivedBye,
      };
    });

    // Get dropped players separately
    const droppedCount = playerStats.filter((s) => s.isDropped).length;

    return {
      standings,
      totalPlayers: playerStats.length,
      activePlayers: playerStats.length - droppedCount,
      droppedPlayers: droppedCount,
      _lastUpdated: Date.now(),
    };
  },
});

// ========== Live Pairings ==========

/**
 * Subscribe to live round pairings.
 * Shows current round's matches with real-time status updates.
 *
 * Updates when: Match status changes, results reported, new round starts.
 */
export const livePairings = query({
  args: {
    tournamentId: v.id("tournaments"),
    roundNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      return null;
    }

    // Get current phase
    if (!tournament.currentPhaseId) {
      return {
        pairings: [],
        roundNumber: 0,
        roundStatus: "pending" as const,
        _lastUpdated: Date.now(),
      };
    }

    const currentPhase = await ctx.db.get(tournament.currentPhaseId);
    if (!currentPhase) {
      return {
        pairings: [],
        roundNumber: 0,
        roundStatus: "pending" as const,
        _lastUpdated: Date.now(),
      };
    }

    // Get the requested round or current round
    const targetRoundNumber = args.roundNumber ?? currentPhase.currentRound;

    // Find the round
    const rounds = await ctx.db
      .query("tournamentRounds")
      .withIndex("by_phase_number", (q) =>
        q.eq("phaseId", currentPhase._id).eq("roundNumber", targetRoundNumber)
      )
      .collect();

    const round = rounds[0];
    if (!round) {
      return {
        pairings: [],
        roundNumber: targetRoundNumber,
        roundStatus: "pending" as const,
        _lastUpdated: Date.now(),
      };
    }

    // Get matches for this round
    const matches = await ctx.db
      .query("tournamentMatches")
      .withIndex("by_round", (q) => q.eq("roundId", round._id))
      .collect();

    // Batch fetch all profiles
    const profileIds = new Set<Id<"profiles">>();
    for (const match of matches) {
      if (match.profile1Id) profileIds.add(match.profile1Id);
      if (match.profile2Id) profileIds.add(match.profile2Id);
    }

    const profiles = await Promise.all(
      Array.from(profileIds).map((id) => ctx.db.get(id))
    );
    const profileMap = new Map(
      profiles.filter((p) => p !== null).map((p) => [p._id, p])
    );

    // Build pairings list
    const pairings = matches
      .sort((a, b) => (a.tableNumber ?? 999) - (b.tableNumber ?? 999))
      .map((match) => {
        const profile1 = match.profile1Id
          ? (profileMap.get(match.profile1Id) as Doc<"profiles"> | undefined)
          : null;
        const profile2 = match.profile2Id
          ? (profileMap.get(match.profile2Id) as Doc<"profiles"> | undefined)
          : null;

        return {
          matchId: match._id,
          tableNumber: match.tableNumber ?? null,
          status: match.status,
          isBye: match.isBye,
          player1: profile1
            ? {
                profileId: profile1._id,
                displayName: profile1.displayName,
                username: profile1.username,
                avatarUrl: profile1.avatarUrl,
              }
            : null,
          player2: profile2
            ? {
                profileId: profile2._id,
                displayName: profile2.displayName,
                username: profile2.username,
                avatarUrl: profile2.avatarUrl,
              }
            : null,
          result:
            match.status === "completed"
              ? {
                  winnerId: match.winnerProfileId,
                  gameScore: `${match.gameWins1}-${match.gameWins2}`,
                  player1GameWins: match.gameWins1,
                  player2GameWins: match.gameWins2,
                }
              : null,
          // Confirmation status
          player1Confirmed: match.player1MatchConfirmed,
          player2Confirmed: match.player2MatchConfirmed,
          staffRequested: match.staffRequested,
        };
      });

    // Calculate round statistics
    const stats = {
      totalMatches: matches.length,
      completedMatches: matches.filter((m) => m.status === "completed").length,
      activeMatches: matches.filter((m) => m.status === "active").length,
      pendingMatches: matches.filter((m) => m.status === "pending").length,
      byeCount: matches.filter((m) => m.isBye).length,
      staffRequestCount: matches.filter((m) => m.staffRequested).length,
    };

    return {
      roundNumber: round.roundNumber,
      roundName: round.name ?? `Round ${round.roundNumber}`,
      roundStatus: round.status,
      pairings,
      stats,
      _lastUpdated: Date.now(),
    };
  },
});

// ========== Live Match Details ==========

/**
 * Subscribe to a specific match's status.
 * Used for match detail views and result reporting modals.
 *
 * Updates when: Match status, scores, or confirmations change.
 */
export const liveMatchDetails = query({
  args: {
    matchId: v.id("tournamentMatches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      return null;
    }

    // Get round and phase info
    const round = await ctx.db.get(match.roundId);
    if (!round) {
      return null;
    }

    const phase = await ctx.db.get(round.phaseId);
    if (!phase) {
      return null;
    }

    const tournament = await ctx.db.get(phase.tournamentId);

    // Get player profiles
    const profile1 = match.profile1Id
      ? await ctx.db.get(match.profile1Id)
      : null;
    const profile2 = match.profile2Id
      ? await ctx.db.get(match.profile2Id)
      : null;

    // Get player stats for context
    let player1Stats = null;
    let player2Stats = null;

    if (match.profile1Id) {
      const stats = await ctx.db
        .query("tournamentPlayerStats")
        .withIndex("by_tournament_profile", (q) =>
          q
            .eq("tournamentId", phase.tournamentId)
            .eq("profileId", match.profile1Id!)
        )
        .first();
      if (stats) {
        player1Stats = {
          matchPoints: stats.matchPoints,
          record: `${stats.matchWins}-${stats.matchLosses}`,
          standing: stats.currentStanding,
        };
      }
    }

    if (match.profile2Id) {
      const stats = await ctx.db
        .query("tournamentPlayerStats")
        .withIndex("by_tournament_profile", (q) =>
          q
            .eq("tournamentId", phase.tournamentId)
            .eq("profileId", match.profile2Id!)
        )
        .first();
      if (stats) {
        player2Stats = {
          matchPoints: stats.matchPoints,
          record: `${stats.matchWins}-${stats.matchLosses}`,
          standing: stats.currentStanding,
        };
      }
    }

    // Get staff resolver if any
    let staffResolver = null;
    if (match.staffResolvedBy) {
      const staffProfile = await ctx.db.get(match.staffResolvedBy);
      if (staffProfile) {
        staffResolver = {
          profileId: staffProfile._id,
          displayName: staffProfile.displayName,
        };
      }
    }

    return {
      _id: match._id,
      tournament: tournament
        ? {
            _id: tournament._id,
            name: tournament.name,
          }
        : null,
      round: {
        number: round.roundNumber,
        name: round.name ?? `Round ${round.roundNumber}`,
        status: round.status,
      },
      phase: {
        _id: phase._id,
        name: phase.name,
      },
      status: match.status,
      isBye: match.isBye,
      tableNumber: match.tableNumber,
      player1: profile1
        ? {
            profileId: profile1._id,
            displayName: profile1.displayName,
            username: profile1.username,
            avatarUrl: profile1.avatarUrl,
            stats: player1Stats,
            gameWins: match.gameWins1,
            matchConfirmed: match.player1MatchConfirmed,
          }
        : null,
      player2: profile2
        ? {
            profileId: profile2._id,
            displayName: profile2.displayName,
            username: profile2.username,
            avatarUrl: profile2.avatarUrl,
            stats: player2Stats,
            gameWins: match.gameWins2,
            matchConfirmed: match.player2MatchConfirmed,
          }
        : null,
      winnerId: match.winnerProfileId,
      matchPoints: {
        player1: match.matchPoints1,
        player2: match.matchPoints2,
      },
      staffRequest: match.staffRequested
        ? {
            requested: true,
            requestedAt: match.staffRequestedAt,
            resolver: staffResolver,
            notes: match.staffNotes,
          }
        : null,
      timing: {
        startTime: match.startTime,
        endTime: match.endTime,
        confirmedAt: match.matchConfirmedAt,
      },
      _lastUpdated: Date.now(),
    };
  },
});

// ========== Live Registration Status ==========

/**
 * Subscribe to tournament registration status.
 * Shows real-time registration and check-in counts.
 *
 * Updates when: Players register, check in, drop, or withdraw.
 */
export const liveRegistrationStatus = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      return null;
    }

    // Get all registrations for this tournament
    const registrations = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    // Group by status
    const statusCounts = {
      pending: 0,
      registered: 0,
      confirmed: 0,
      waitlist: 0,
      checked_in: 0,
      dropped: 0,
      withdrawn: 0,
    };

    for (const reg of registrations) {
      statusCounts[reg.status]++;
    }

    // Calculate waitlist size (waitlist position info available via statusCounts.waitlist)
    const _waitlistRegistrations = registrations
      .filter((r) => r.status === "waitlist")
      .sort((a, b) => a.registeredAt - b.registeredAt);

    // Determine registration window status
    const now = Date.now();
    let registrationWindowStatus:
      | "not_started"
      | "open"
      | "closed"
      | "unknown" = "unknown";

    if (tournament.registrationDeadline) {
      if (now > tournament.registrationDeadline) {
        registrationWindowStatus = "closed";
      } else {
        registrationWindowStatus = "open";
      }
    } else if (
      tournament.status === "active" ||
      tournament.status === "completed"
    ) {
      registrationWindowStatus = "closed";
    } else if (
      tournament.status === "upcoming" ||
      tournament.status === "draft"
    ) {
      registrationWindowStatus = "open";
    }

    // Determine check-in window status
    let checkInWindowStatus: "not_started" | "open" | "closed" | "unknown" =
      "unknown";

    if (tournament.startDate && tournament.checkInWindowMinutes) {
      const checkInStart =
        tournament.startDate - tournament.checkInWindowMinutes * 60 * 1000;
      if (now < checkInStart) {
        checkInWindowStatus = "not_started";
      } else if (now < tournament.startDate) {
        checkInWindowStatus = "open";
      } else {
        checkInWindowStatus = "closed";
      }
    }

    // Get recently registered players (last 5)
    const recentRegistrations = registrations
      .filter((r) => r.status === "registered" || r.status === "checked_in")
      .sort((a, b) => b.registeredAt - a.registeredAt)
      .slice(0, 5);

    const recentProfileIds = recentRegistrations.map((r) => r.profileId);
    const recentProfiles = await Promise.all(
      recentProfileIds.map((id) => ctx.db.get(id))
    );

    const recentPlayers = recentRegistrations.map((reg, i) => {
      const profile = recentProfiles[i];
      return {
        registrationId: reg._id,
        profileId: reg.profileId,
        displayName: profile?.displayName ?? "Unknown",
        status: reg.status,
        registeredAt: reg.registeredAt,
        checkedInAt: reg.checkedInAt,
      };
    });

    return {
      tournamentId: args.tournamentId,
      capacity: tournament.maxParticipants ?? null,
      statusCounts,
      totalRegistered:
        statusCounts.registered +
        statusCounts.confirmed +
        statusCounts.checked_in,
      activeParticipants: statusCounts.checked_in,
      waitlistSize: statusCounts.waitlist,
      spotsRemaining: tournament.maxParticipants
        ? Math.max(
            0,
            tournament.maxParticipants -
              (statusCounts.registered +
                statusCounts.confirmed +
                statusCounts.checked_in)
          )
        : null,
      registrationWindow: {
        status: registrationWindowStatus,
        deadline: tournament.registrationDeadline ?? null,
      },
      checkInWindow: {
        status: checkInWindowStatus,
        windowMinutes: tournament.checkInWindowMinutes ?? 60,
        startTime: tournament.startDate
          ? tournament.startDate -
            (tournament.checkInWindowMinutes ?? 60) * 60 * 1000
          : null,
        endTime: tournament.startDate ?? null,
      },
      recentPlayers,
      _lastUpdated: Date.now(),
    };
  },
});

// ========== Live Tournament Events ==========

/**
 * Subscribe to tournament event stream.
 * Provides real-time activity feed for tournament pages.
 *
 * Updates when: Any tournament event is created (registration, match result, etc).
 */
export const liveTournamentEvents = query({
  args: {
    tournamentId: v.id("tournaments"),
    limit: v.optional(v.number()),
    eventTypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get recent events for this tournament
    const eventsQuery = ctx.db
      .query("tournamentEvents")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .order("desc");

    const allEvents = await eventsQuery.collect();

    // Filter by event types if specified
    let filteredEvents = allEvents;
    if (args.eventTypes && args.eventTypes.length > 0) {
      const eventTypesSet = new Set(args.eventTypes);
      filteredEvents = allEvents.filter((e) => eventTypesSet.has(e.eventType));
    }

    const events = filteredEvents.slice(0, limit);

    // Batch fetch creator profiles
    const creatorIds = events
      .map((e) => e.createdBy)
      .filter((id): id is Id<"profiles"> => id !== undefined);

    const creators = await Promise.all(
      Array.from(new Set(creatorIds)).map((id) => ctx.db.get(id))
    );
    const creatorMap = new Map(
      creators.filter((p) => p !== null).map((p) => [p._id, p])
    );

    // Format events for display
    const formattedEvents = events.map((event) => {
      const creator = event.createdBy
        ? (creatorMap.get(event.createdBy) as Doc<"profiles"> | undefined)
        : null;

      return {
        _id: event._id,
        eventType: event.eventType,
        eventData: event.eventData ?? {},
        createdAt: event.createdAt,
        createdBy: creator
          ? {
              profileId: creator._id,
              displayName: creator.displayName,
            }
          : null,
      };
    });

    return {
      events: formattedEvents,
      totalCount: filteredEvents.length,
      hasMore: filteredEvents.length > limit,
      _lastUpdated: Date.now(),
    };
  },
});

// ========== Player's Live Match ==========

/**
 * Subscribe to a player's current/next match in a tournament.
 * Used for player-specific tournament views.
 *
 * Updates when: Player's match status changes, new round starts.
 */
export const playerLiveMatch = query({
  args: {
    tournamentId: v.id("tournaments"),
    profileId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || !tournament.currentPhaseId) {
      return null;
    }

    // Get current phase
    const currentPhase = await ctx.db.get(tournament.currentPhaseId);
    if (!currentPhase) {
      return null;
    }

    // Get current round
    const rounds = await ctx.db
      .query("tournamentRounds")
      .withIndex("by_phase_number", (q) =>
        q
          .eq("phaseId", currentPhase._id)
          .eq("roundNumber", currentPhase.currentRound)
      )
      .collect();

    const currentRound = rounds[0];
    if (!currentRound) {
      return null;
    }

    // Find player's match in current round
    const matches = await ctx.db
      .query("tournamentMatches")
      .withIndex("by_round", (q) => q.eq("roundId", currentRound._id))
      .collect();

    const playerMatch = matches.find(
      (m) => m.profile1Id === args.profileId || m.profile2Id === args.profileId
    );

    if (!playerMatch) {
      // Player might have a bye or be dropped
      const playerStats = await ctx.db
        .query("tournamentPlayerStats")
        .withIndex("by_tournament_profile", (q) =>
          q
            .eq("tournamentId", args.tournamentId)
            .eq("profileId", args.profileId)
        )
        .first();

      return {
        status: playerStats?.isDropped ? "dropped" : "no_match",
        roundNumber: currentRound.roundNumber,
        _lastUpdated: Date.now(),
      };
    }

    // Get opponent info
    const opponentId =
      playerMatch.profile1Id === args.profileId
        ? playerMatch.profile2Id
        : playerMatch.profile1Id;

    const opponent = opponentId ? await ctx.db.get(opponentId) : null;

    // Get opponent stats
    let opponentStats = null;
    if (opponentId) {
      const stats = await ctx.db
        .query("tournamentPlayerStats")
        .withIndex("by_tournament_profile", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("profileId", opponentId)
        )
        .first();
      if (stats) {
        opponentStats = {
          matchPoints: stats.matchPoints,
          record: `${stats.matchWins}-${stats.matchLosses}`,
          standing: stats.currentStanding,
        };
      }
    }

    // Determine if player is player1 or player2
    const isPlayer1 = playerMatch.profile1Id === args.profileId;

    return {
      status: "matched",
      matchId: playerMatch._id,
      roundNumber: currentRound.roundNumber,
      roundName: currentRound.name ?? `Round ${currentRound.roundNumber}`,
      matchStatus: playerMatch.status,
      tableNumber: playerMatch.tableNumber,
      isBye: playerMatch.isBye,
      opponent: opponent
        ? {
            profileId: opponent._id,
            displayName: opponent.displayName,
            username: opponent.username,
            avatarUrl: opponent.avatarUrl,
            stats: opponentStats,
          }
        : null,
      myGameWins: isPlayer1 ? playerMatch.gameWins1 : playerMatch.gameWins2,
      opponentGameWins: isPlayer1
        ? playerMatch.gameWins2
        : playerMatch.gameWins1,
      myMatchConfirmed: isPlayer1
        ? playerMatch.player1MatchConfirmed
        : playerMatch.player2MatchConfirmed,
      opponentMatchConfirmed: isPlayer1
        ? playerMatch.player2MatchConfirmed
        : playerMatch.player1MatchConfirmed,
      isWinner: playerMatch.winnerProfileId === args.profileId,
      staffRequested: playerMatch.staffRequested,
      _lastUpdated: Date.now(),
    };
  },
});
