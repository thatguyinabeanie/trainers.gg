import { v } from "convex/values";
import { query } from "../_generated/server";
import type {} from "../_generated/dataModel";

export const getTournamentBracketData = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Get all phases for this tournament
    const phases = await ctx.db
      .query("tournamentPhases")
      .withIndex("by_tournament_order", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    // Get rounds and matches for each phase
    const phasesWithRounds = await Promise.all(
      phases.map(async (phase) => {
        const rounds = await ctx.db
          .query("tournamentRounds")
          .withIndex("by_phase_number", (q) => q.eq("phaseId", phase._id))
          .collect();

        const roundsWithMatches = await Promise.all(
          rounds.map(async (round) => {
            const matches = await ctx.db
              .query("tournamentMatches")
              .withIndex("by_round", (q) => q.eq("roundId", round._id))
              .collect();

            // Get participant details for each match
            const matchesWithParticipants = await Promise.all(
              matches.map(async (match) => {
                const profile1 = match.profile1Id
                  ? await ctx.db.get(match.profile1Id)
                  : null;
                const profile2 = match.profile2Id
                  ? await ctx.db.get(match.profile2Id)
                  : null;

                return {
                  ...match,
                  participant1: profile1
                    ? {
                        id: profile1._id,
                        name: profile1.displayName,
                        seed: undefined, // Tracked in TODO.md: Seed Tracking in Brackets (TODO #4)
                      }
                    : match.isBye
                      ? { name: "BYE", isBye: true }
                      : null,
                  participant2: profile2
                    ? {
                        id: profile2._id,
                        name: profile2.displayName,
                        seed: undefined, // Tracked in TODO.md: Seed Tracking in Brackets (TODO #4)
                      }
                    : null,
                };
              })
            );

            return {
              ...round,
              matches: matchesWithParticipants,
            };
          })
        );

        return {
          ...phase,
          rounds: roundsWithMatches,
        };
      })
    );

    // Get standings
    const standings = await ctx.db
      .query("tournamentStandings")
      .withIndex("by_tournament_round", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    // Batch fetch all profiles to avoid N+1 query pattern
    const profileIds = standings.map((s) => s.profileId);
    const profiles = await Promise.all(profileIds.map((id) => ctx.db.get(id)));
    const profileMap = new Map(profiles.map((p, i) => [profileIds[i], p]));

    const standingsWithProfiles = standings.map((standing) => ({
      ...standing,
      playerName: profileMap.get(standing.profileId)?.displayName || "Unknown",
    }));

    return {
      tournament,
      phases: phasesWithRounds,
      standings: standingsWithProfiles,
    };
  },
});

export const getTournamentParticipants = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    const participantsWithProfiles = await Promise.all(
      registrations.map(async (reg) => {
        const profile = await ctx.db.get(reg.profileId);
        const playerStats = await ctx.db
          .query("tournamentPlayerStats")
          .withIndex("by_tournament_profile", (q) =>
            q
              .eq("tournamentId", args.tournamentId)
              .eq("profileId", reg.profileId)
          )
          .first();

        return {
          ...reg,
          profile,
          stats: playerStats || null,
        };
      })
    );

    // Sort by registration order (seed not available in current schema)
    return participantsWithProfiles.sort((a, b) => {
      return a._creationTime - b._creationTime;
    });
  },
});
