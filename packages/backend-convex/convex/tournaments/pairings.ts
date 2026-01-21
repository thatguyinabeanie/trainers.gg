import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";
import { hasPermission } from "../permissions";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  MATCH_WIN_POINTS,
  MATCH_LOSS_POINTS,
  BYE_GAME_WINS,
  BYE_GAME_LOSSES,
} from "../lib/tournamentConstants";

export const generatePairings = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    roundNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check permission
    const hasManagePermission = await hasPermission(
      ctx,
      user.profile._id,
      "tournament.update" as const,
      "tournament",
      args.tournamentId
    );

    if (!hasManagePermission) {
      throw new Error("You don't have permission to generate pairings");
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Get all checked-in participants
    const registrations = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_status", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("status", "checked_in")
      )
      .collect();

    if (registrations.length < 2) {
      throw new Error(
        "Need at least 2 checked-in players to generate pairings"
      );
    }

    // Check if phase exists, if not create it
    let phase = await ctx.db
      .query("tournamentPhases")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .first();

    if (!phase) {
      // Create initial phase (Swiss by default)
      const phaseId = await ctx.db.insert("tournamentPhases", {
        tournamentId: args.tournamentId,
        name: "Swiss Rounds",
        phaseType: "swiss",
        status: "active",
        startedAt: Date.now(),
        phaseOrder: 1,
        currentRound: 0,
        matchFormat: "best_of_3",
        plannedRounds: Math.ceil(Math.log2(registrations.length)),
      });
      phase = await ctx.db.get(phaseId);
    }

    if (!phase) {
      throw new Error("Failed to create tournament phase");
    }

    // Determine round number
    const existingRounds = await ctx.db
      .query("tournamentRounds")
      .withIndex("by_phase", (q) => q.eq("phaseId", phase!._id))
      .collect();

    const roundNumber = args.roundNumber || existingRounds.length + 1;

    // Check if round already exists
    const existingRound = existingRounds.find(
      (r) => r.roundNumber === roundNumber
    );
    if (existingRound) {
      throw new Error(`Round ${roundNumber} already exists`);
    }

    // Create round
    const roundId = await ctx.db.insert("tournamentRounds", {
      phaseId: phase._id,
      roundNumber,
      name: `Round ${roundNumber}`,
      status: "pending",
      startTime: Date.now(),
      timeExtensionMinutes: 0,
    });

    // Generate pairings based on format
    let pairings: Array<[Id<"profiles">, Id<"profiles"> | null]> = [];

    if (phase.phaseType === "swiss") {
      pairings = await generateSwissPairings(
        ctx,
        registrations,
        existingRounds
      );
    } else if (phase.phaseType === "single_elimination") {
      pairings = generateEliminationPairings(
        registrations.map((r) => r.profileId)
      );
    } else {
      // Random pairings as fallback
      const shuffled = [...registrations].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i += 2) {
        const player1 = shuffled[i];
        const player2 = shuffled[i + 1];
        if (player1 && player2) {
          pairings.push([player1.profileId, player2.profileId]);
        } else if (player1) {
          // Bye
          pairings.push([player1.profileId, null]);
        }
      }
    }

    // Create matches
    for (let i = 0; i < pairings.length; i++) {
      const pairing = pairings[i];
      if (!pairing) continue;

      const [player1Id, player2Id] = pairing;

      await ctx.db.insert("tournamentMatches", {
        roundId,
        profile1Id: player1Id,
        profile2Id: player2Id || undefined,
        status: player2Id ? "pending" : "completed", // Auto-complete byes
        winnerProfileId: player2Id ? undefined : player1Id, // Player with bye auto-wins
        matchPoints1: player2Id ? MATCH_LOSS_POINTS : MATCH_WIN_POINTS,
        matchPoints2: MATCH_LOSS_POINTS,
        gameWins1: player2Id ? 0 : BYE_GAME_WINS,
        gameWins2: BYE_GAME_LOSSES,
        isBye: !player2Id,
        player1MatchConfirmed: false,
        player2MatchConfirmed: false,
        staffRequested: false,
        tableNumber: i + 1,
      });
    }

    // Update tournament status if needed
    if (tournament.status === "upcoming") {
      await ctx.db.patch(args.tournamentId, {
        status: "active",
      });
    }

    // Update round status
    await ctx.db.patch(roundId, {
      status: "active",
    });

    return {
      success: true,
      roundId,
      matchCount: pairings.length,
    };
  },
});

async function generateSwissPairings(
  ctx: MutationCtx,
  registrations: Array<{
    profileId: Id<"profiles">;
    tournamentId: Id<"tournaments">;
  }>,
  _existingRounds: Array<{
    roundNumber: number;
    phaseId: Id<"tournamentPhases">;
  }>
): Promise<Array<[Id<"profiles">, Id<"profiles"> | null]>> {
  const firstRegistration = registrations[0];
  if (!firstRegistration) {
    return [];
  }
  const tournamentId = firstRegistration.tournamentId;
  // Get standings from previous rounds
  const standings = await ctx.db
    .query("tournamentStandings")
    .withIndex("by_tournament_round", (q) =>
      q.eq("tournamentId", firstRegistration.tournamentId)
    )
    .collect();

  // Create a Map for O(1) standings lookup to avoid O(n²) complexity
  const standingsMap = new Map(standings.map((s) => [s.profileId, s]));

  // Get player stats to check for previous byes (prevent multiple byes)
  const playerStats = await ctx.db
    .query("tournamentPlayerStats")
    .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
    .collect();

  // Create a Map for O(1) bye history lookup
  const playerStatsMap = new Map(playerStats.map((s) => [s.profileId, s]));

  // Sort by match points, then by opponent match win percentage
  const sortedPlayers = [...registrations].sort((a, b) => {
    const aStanding = standingsMap.get(a.profileId);
    const bStanding = standingsMap.get(b.profileId);

    if (!aStanding && !bStanding) return 0;
    if (!aStanding) return 1;
    if (!bStanding) return -1;

    // Sort by match points first
    if (aStanding.matchPoints !== bStanding.matchPoints) {
      return bStanding.matchPoints - aStanding.matchPoints;
    }

    // Then by opponent match win percentage
    return (
      (bStanding.opponentMatchWinPercentage || 0) -
      (aStanding.opponentMatchWinPercentage || 0)
    );
  });

  // Get all previous matches for THIS TOURNAMENT ONLY
  // Query by rounds in this phase to ensure we only consider current tournament
  const phaseId = _existingRounds[0]?.phaseId;
  if (!phaseId) {
    // No existing rounds means first round - no previous matches to consider
    // Generate first round pairings (simple top-down pairing)
    const pairings: Array<[Id<"profiles">, Id<"profiles"> | null]> = [];
    for (let i = 0; i < sortedPlayers.length; i += 2) {
      const player1 = sortedPlayers[i];
      const player2 = sortedPlayers[i + 1];
      if (player1) {
        pairings.push([player1.profileId, player2?.profileId ?? null]);
      }
    }
    return pairings;
  }

  const allRounds = await ctx.db
    .query("tournamentRounds")
    .withIndex("by_phase", (q) => q.eq("phaseId", phaseId))
    .collect();

  const roundIds = allRounds.map((r) => r._id);

  // Fetch matches only from rounds in this tournament
  // Use parallel indexed queries for better performance
  const matchArrays = await Promise.all(
    roundIds.map((roundId) =>
      ctx.db
        .query("tournamentMatches")
        .withIndex("by_round", (q) => q.eq("roundId", roundId))
        .collect()
    )
  );
  const allMatches = matchArrays.flat();

  // Build a set of player pairs who have already played
  const playedPairs = new Set<string>();
  for (const match of allMatches) {
    if (match.profile1Id && match.profile2Id) {
      const pair1 = `${match.profile1Id}-${match.profile2Id}`;
      const pair2 = `${match.profile2Id}-${match.profile1Id}`;
      playedPairs.add(pair1);
      playedPairs.add(pair2);
    }
  }

  // Helper function to check if two players have played before
  const havePlayed = (p1: Id<"profiles">, p2: Id<"profiles">) => {
    return playedPairs.has(`${p1}-${p2}`);
  };

  // OPTIMIZED PAIRING ALGORITHM for 1000+ player tournaments
  // Key insight: Group players by match points, then pair within groups
  // Complexity: O(k * (n/k)²) = O(n²/k) where k = number of point groups
  // For k=10-20, this is 10-20x faster than naive O(n²) approach

  const pairings: Array<[Id<"profiles">, Id<"profiles"> | null]> = [];
  const paired = new Set<Id<"profiles">>();

  // Batch collect rematch events to reduce database writes
  const rematchEvents: Array<{
    player1Id: string;
    player2Id: string;
    reason: string;
  }> = [];

  // STEP 1: Group players by match points
  // Swiss tournaments typically have 10-20 distinct point groups
  const pointGroups = new Map<number, Array<Id<"profiles">>>();

  for (const player of sortedPlayers) {
    const standing = standingsMap.get(player.profileId);
    const points = standing?.matchPoints ?? 0;

    if (!pointGroups.has(points)) {
      pointGroups.set(points, []);
    }
    pointGroups.get(points)!.push(player.profileId);
  }

  // Sort point groups in descending order (highest points first)
  const sortedPointGroups = Array.from(pointGroups.entries()).sort(
    (a, b) => b[0] - a[0]
  );

  // STEP 2: Pair within each point group
  // This dramatically reduces search space from O(n) to O(n/k)
  for (const [_points, groupPlayers] of sortedPointGroups) {
    // Sort by tiebreakers within the point group
    const sortedGroup = groupPlayers.sort((a, b) => {
      const aStanding = standingsMap.get(a);
      const bStanding = standingsMap.get(b);
      return (
        (bStanding?.opponentMatchWinPercentage || 0) -
        (aStanding?.opponentMatchWinPercentage || 0)
      );
    });

    // Pair players within this point group
    for (let i = 0; i < sortedGroup.length; i++) {
      const currentPlayerId = sortedGroup[i];
      if (!currentPlayerId) continue;

      if (paired.has(currentPlayerId)) continue;

      let foundPair = false;

      // Try to pair with someone in the same point group
      for (let j = i + 1; j < sortedGroup.length; j++) {
        const candidateId = sortedGroup[j];
        if (!candidateId) continue;

        if (paired.has(candidateId)) continue;

        if (!havePlayed(currentPlayerId, candidateId)) {
          pairings.push([currentPlayerId, candidateId]);
          paired.add(currentPlayerId);
          paired.add(candidateId);
          foundPair = true;
          break;
        }
      }

      // If no unplayed opponent in group, allow rematch within group
      if (!foundPair) {
        for (let j = i + 1; j < sortedGroup.length; j++) {
          const candidateId = sortedGroup[j];
          if (!candidateId) continue;

          if (paired.has(candidateId)) continue;

          const isRematch = havePlayed(currentPlayerId, candidateId);

          pairings.push([currentPlayerId, candidateId]);
          paired.add(currentPlayerId);
          paired.add(candidateId);

          if (isRematch) {
            rematchEvents.push({
              player1Id: currentPlayerId,
              player2Id: candidateId,
              reason: "No unplayed opponents in point group",
            });
          }

          foundPair = true;
          break;
        }
      }

      // Player remains unpaired in their group - will handle in Step 3
    }
  }

  // STEP 3: Handle unpaired players (cross-group pairing and byes)
  // These are players who couldn't be paired within their point group
  const unpairedPlayers = sortedPlayers.filter((p) => !paired.has(p.profileId));

  for (let i = 0; i < unpairedPlayers.length; i++) {
    const currentPlayer = unpairedPlayers[i];
    if (!currentPlayer) continue;

    const currentPlayerId = currentPlayer.profileId;

    if (paired.has(currentPlayerId)) continue;

    let foundPair = false;

    // Try to pair with any other unpaired player (cross-group pairing)
    for (let j = i + 1; j < unpairedPlayers.length; j++) {
      const candidatePlayer = unpairedPlayers[j];
      if (!candidatePlayer) continue;

      const candidateId = candidatePlayer.profileId;

      if (paired.has(candidateId)) continue;

      if (!havePlayed(currentPlayerId, candidateId)) {
        pairings.push([currentPlayerId, candidateId]);
        paired.add(currentPlayerId);
        paired.add(candidateId);
        foundPair = true;
        break;
      }
    }

    // Allow rematch if necessary
    if (!foundPair) {
      for (let j = i + 1; j < unpairedPlayers.length; j++) {
        const candidatePlayer = unpairedPlayers[j];
        if (!candidatePlayer) continue;

        const candidateId = candidatePlayer.profileId;

        if (paired.has(candidateId)) continue;

        const isRematch = havePlayed(currentPlayerId, candidateId);

        pairings.push([currentPlayerId, candidateId]);
        paired.add(currentPlayerId);
        paired.add(candidateId);

        if (isRematch) {
          rematchEvents.push({
            player1Id: currentPlayerId,
            player2Id: candidateId,
            reason: "Cross-group pairing rematch",
          });
        }

        foundPair = true;
        break;
      }
    }

    // Player remains unpaired - will be handled after the loop
  }

  // STEP 4: Award bye to remaining unpaired player (if odd number)
  // Swiss rule: Bye should go to lowest-ranked player who hasn't had a bye yet
  const finalUnpaired = unpairedPlayers.filter((p) => !paired.has(p.profileId));

  if (finalUnpaired.length > 0) {
    // Prefer players who haven't received a bye yet
    const playersWithoutBye = finalUnpaired.filter(
      (p) => !playerStatsMap.get(p.profileId)?.hasReceivedBye
    );

    // If any players haven't had a bye, pick the lowest-ranked one (last in sorted order)
    // Otherwise, pick the lowest-ranked player overall
    const byeRecipients =
      playersWithoutBye.length > 0 ? playersWithoutBye : finalUnpaired;

    // Award bye to the lowest-ranked player(s) without a previous bye
    for (const player of byeRecipients) {
      const playerId = player.profileId;
      const stats = playerStatsMap.get(playerId);

      // Log event if player is receiving a second bye
      if (stats?.hasReceivedBye) {
        await ctx.db.insert("tournamentEvents", {
          tournamentId,
          eventType: "pairing_multiple_bye",
          eventData: {
            playerId,
            reason: "All remaining players have already received byes",
          },
          createdAt: Date.now(),
        });
      }

      pairings.push([playerId, null]);
      paired.add(playerId);
    }
  }

  // Batch insert all rematch events in a single operation for better performance
  if (rematchEvents.length > 0) {
    await Promise.all(
      rematchEvents.map((event) =>
        ctx.db.insert("tournamentEvents", {
          tournamentId,
          eventType: "pairing_forced_rematch",
          eventData: event,
          createdAt: Date.now(),
        })
      )
    );
  }

  return pairings;
}

function generateEliminationPairings(
  playerIds: Id<"profiles">[]
): Array<[Id<"profiles">, Id<"profiles"> | null]> {
  const pairings: Array<[Id<"profiles">, Id<"profiles"> | null]> = [];

  // Simple seeded pairing (1 vs last, 2 vs second-to-last, etc.)
  const numPlayers = playerIds.length;
  const halfPoint = Math.ceil(numPlayers / 2);

  for (let i = 0; i < halfPoint; i++) {
    const player1 = playerIds[i];
    if (!player1) continue;

    const player2Index = numPlayers - 1 - i;
    const player2 =
      player2Index < halfPoint ? null : (playerIds[player2Index] ?? null);

    pairings.push([player1, player2]);
  }

  return pairings;
}

export const startRound = mutation({
  args: {
    roundId: v.id("tournamentRounds"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    const round = await ctx.db.get(args.roundId);
    if (!round) {
      throw new Error("Round not found");
    }

    const phase = await ctx.db.get(round.phaseId);
    if (!phase) {
      throw new Error("Phase not found");
    }

    // Check permission
    const hasManagePermission = await hasPermission(
      ctx,
      user.profile._id,
      "tournament.update" as const,
      "tournament",
      phase.tournamentId
    );

    if (!hasManagePermission) {
      throw new Error("You don't have permission to start this round");
    }

    // Update round status
    await ctx.db.patch(args.roundId, {
      status: "active",
      startTime: Date.now(),
    });

    // Update all pending matches to active
    const matches = await ctx.db
      .query("tournamentMatches")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    for (const match of matches) {
      if (match.status === "pending" && !match.isBye) {
        await ctx.db.patch(match._id, {
          status: "active",
        });
      }
    }

    return { success: true };
  },
});
