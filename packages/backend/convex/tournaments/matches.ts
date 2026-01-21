import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";
import { hasPermission } from "../permissions";
import { PERMISSIONS } from "../permissionKeys";
import { enforceRateLimit } from "../lib/rateLimit";
import { z } from "zod";
import type { Id } from "../_generated/dataModel";
import {
  MATCH_WIN_POINTS,
  MATCH_LOSS_POINTS,
} from "../lib/tournamentConstants";
import { logTournamentEvent } from "../helpers";

// Zod validation schemas
const matchResultSchema = z
  .object({
    matchId: z.custom<Id<"tournamentMatches">>(),
    winnerId: z.custom<Id<"profiles">>(),
    player1Score: z.number().int().min(0).max(5),
    player2Score: z.number().int().min(0).max(5),
  })
  .refine(
    (data) => {
      // Prevent ties - scores cannot be equal
      return data.player1Score !== data.player2Score;
    },
    {
      message: "Tied scores are not allowed",
    }
  )
  .refine(
    (data) => {
      // Validate that scores make sense for best-of-3/5 format
      const totalGames = data.player1Score + data.player2Score;
      return totalGames >= 2 && totalGames <= 5;
    },
    {
      message:
        "Invalid score: Total games must be between 2-5 for best-of-3/5 format",
    }
  )
  .refine(
    (data) => {
      // Validate that one player has won enough games for best-of format
      const maxScore = Math.max(data.player1Score, data.player2Score);
      // Best-of-3: need 2 wins, Best-of-5: need 3 wins
      return maxScore === 2 || maxScore === 3;
    },
    {
      message:
        "Invalid score: Winner must have 2 wins (best-of-3) or 3 wins (best-of-5)",
    }
  );

export const reportMatchResult = mutation({
  args: {
    data: v.object({
      matchId: v.id("tournamentMatches"),
      winnerId: v.id("profiles"),
      player1Score: v.number(),
      player2Score: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Validate input with Zod
    const validated = matchResultSchema.parse(args.data);
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Rate limit match reporting to prevent manipulation attempts
    await enforceRateLimit(ctx, user.profile._id, "match_reporting");

    const match = await ctx.db.get(validated.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    // Validate match status - must be active to report results
    const validStatuses = ["active"] as const;
    if (
      !validStatuses.includes(match.status as (typeof validStatuses)[number])
    ) {
      const errorMessages: Record<string, string> = {
        completed: "Match has already been completed and cannot be updated",
        pending: "Match has not started yet. Please start the match first.",
      };
      throw new Error(
        errorMessages[match.status] ||
          `Cannot report results for match with status: ${match.status}`
      );
    }

    // Check if user is one of the players or has manage permission
    const isPlayer1 = match.profile1Id === user.profile._id;
    const isPlayer2 = match.profile2Id === user.profile._id;

    if (!isPlayer1 && !isPlayer2) {
      // Check if user has tournament manage permission
      const round = await ctx.db.get(match.roundId);
      if (!round) throw new Error("Round not found");

      const phase = await ctx.db.get(round.phaseId);
      if (!phase) throw new Error("Phase not found");

      const hasManagePermission = await hasPermission(
        ctx,
        user.profile._id,
        PERMISSIONS.TOURNAMENT_MANAGE,
        "tournament",
        phase.tournamentId
      );

      if (!hasManagePermission) {
        throw new Error("You don't have permission to report this match");
      }
    }

    // Validate winner is one of the players
    if (
      validated.winnerId !== match.profile1Id &&
      validated.winnerId !== match.profile2Id
    ) {
      throw new Error("Winner must be one of the match participants");
    }

    // Validate that the winner's score is higher than the loser's score
    const isPlayer1Winner = validated.winnerId === match.profile1Id;
    const winnerScore = isPlayer1Winner
      ? validated.player1Score
      : validated.player2Score;
    const loserScore = isPlayer1Winner
      ? validated.player2Score
      : validated.player1Score;

    if (winnerScore <= loserScore) {
      throw new Error("Winner's score must be higher than loser's score");
    }

    // Update match result with scores
    await ctx.db.patch(validated.matchId, {
      status: "completed",
      winnerProfileId: validated.winnerId,
      endTime: Date.now(),
      // Store the actual game scores
      gameWins1: validated.player1Score,
      gameWins2: validated.player2Score,
      // Calculate match points using constants
      matchPoints1:
        validated.winnerId === match.profile1Id
          ? MATCH_WIN_POINTS
          : MATCH_LOSS_POINTS,
      matchPoints2:
        validated.winnerId === match.profile2Id
          ? MATCH_WIN_POINTS
          : MATCH_LOSS_POINTS,
    });

    // Get tournament ID from phase
    const round = await ctx.db.get(match.roundId);
    if (!round) throw new Error("Round not found");
    const phase = await ctx.db.get(round.phaseId);
    if (!phase) throw new Error("Phase not found");

    await logTournamentEvent(
      ctx,
      "match_result_reported",
      phase.tournamentId,
      user.profile._id,
      {
        matchId: validated.matchId,
        winnerProfileId: validated.winnerId,
        player1Score: validated.player1Score,
        player2Score: validated.player2Score,
        roundId: match.roundId,
        phaseId: round.phaseId,
      }
    );

    // Check if this completes the round
    const allRoundMatches = await ctx.db
      .query("tournamentMatches")
      .withIndex("by_round", (q) => q.eq("roundId", match.roundId))
      .collect();

    const allCompleted = allRoundMatches.every(
      (m) => m.status === "completed" || m._id === validated.matchId
    );

    if (allCompleted) {
      // Update round status
      await ctx.db.patch(match.roundId, {
        status: "completed",
        endTime: Date.now(),
      });
    }

    return { success: true };
  },
});

export const startMatch = mutation({
  args: {
    matchId: v.id("tournamentMatches"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    // Check permission
    const round = await ctx.db.get(match.roundId);
    if (!round) throw new Error("Round not found");

    const phase = await ctx.db.get(round.phaseId);
    if (!phase) throw new Error("Phase not found");

    const hasManagePermission = await hasPermission(
      ctx,
      user.profile._id,
      PERMISSIONS.TOURNAMENT_MANAGE,
      "tournament",
      phase.tournamentId
    );

    // Allow players or organizers to start match
    const isPlayer =
      match.profile1Id === user.profile._id ||
      match.profile2Id === user.profile._id;

    if (!isPlayer && !hasManagePermission) {
      throw new Error("You don't have permission to start this match");
    }

    if (match.status !== "pending") {
      throw new Error("Match has already started or completed");
    }

    // Update match status
    await ctx.db.patch(args.matchId, {
      status: "active",
      startTime: Date.now(),
    });

    return { success: true };
  },
});

export const getMatchDetails = query({
  args: {
    matchId: v.id("tournamentMatches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      return null;
    }

    const [player1, player2, round] = await Promise.all([
      match.profile1Id ? ctx.db.get(match.profile1Id) : null,
      match.profile2Id ? ctx.db.get(match.profile2Id) : null,
      ctx.db.get(match.roundId),
    ]);

    if (!round) return null;

    const phase = await ctx.db.get(round.phaseId);
    if (!phase) return null;

    const tournament = await ctx.db.get(phase.tournamentId);
    if (!tournament) return null;

    return {
      match,
      player1: player1
        ? {
            id: player1._id,
            name: player1.displayName,
            avatarUrl: player1.avatarUrl,
          }
        : null,
      player2: player2
        ? {
            id: player2._id,
            name: player2.displayName,
            avatarUrl: player2.avatarUrl,
          }
        : null,
      round: {
        name: round.name,
        number: round.roundNumber,
      },
      phase: {
        name: phase.name,
        format: phase.phaseType,
      },
      tournament: {
        id: tournament._id,
        name: tournament.name,
        format: tournament.format,
      },
    };
  },
});

export const getPlayerActiveMatches = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      return [];
    }

    // Find all active or pending matches for the player
    // Use compound indexes for both profile positions and statuses, then merge results
    const [
      pendingAsPlayer1,
      activeAsPlayer1,
      pendingAsPlayer2,
      activeAsPlayer2,
    ] = await Promise.all([
      ctx.db
        .query("tournamentMatches")
        .withIndex("by_profile1_status", (q) =>
          q.eq("profile1Id", user.profile!._id).eq("status", "pending")
        )
        .collect(),
      ctx.db
        .query("tournamentMatches")
        .withIndex("by_profile1_status", (q) =>
          q.eq("profile1Id", user.profile!._id).eq("status", "active")
        )
        .collect(),
      ctx.db
        .query("tournamentMatches")
        .withIndex("by_profile2_status", (q) =>
          q.eq("profile2Id", user.profile!._id).eq("status", "pending")
        )
        .collect(),
      ctx.db
        .query("tournamentMatches")
        .withIndex("by_profile2_status", (q) =>
          q.eq("profile2Id", user.profile!._id).eq("status", "active")
        )
        .collect(),
    ]);

    // Merge results (no duplicates since player can't be in both positions for same match)
    const matches = [
      ...pendingAsPlayer1,
      ...activeAsPlayer1,
      ...pendingAsPlayer2,
      ...activeAsPlayer2,
    ];

    // Get match details
    const matchesWithDetails = await Promise.all(
      matches.map(async (match) => {
        const [opponent, round] = await Promise.all([
          match.profile1Id === user.profile!._id && match.profile2Id
            ? ctx.db.get(match.profile2Id)
            : match.profile1Id
              ? ctx.db.get(match.profile1Id)
              : null,
          ctx.db.get(match.roundId),
        ]);

        if (!round) return null;

        const phase = await ctx.db.get(round.phaseId);
        if (!phase) return null;

        const tournament = await ctx.db.get(phase.tournamentId);
        if (!tournament) return null;

        return {
          match,
          opponent: opponent
            ? {
                id: opponent._id,
                name: opponent.displayName,
                avatarUrl: opponent.avatarUrl,
              }
            : null,
          tournament: {
            id: tournament._id,
            name: tournament.name,
          },
          round: round.name,
          tableNumber: 1, // Tracked in TODO.md: Match Number in Schema (TODO #2)
        };
      })
    );

    return matchesWithDetails.filter(
      (m): m is NonNullable<typeof m> => m !== null
    );
  },
});
