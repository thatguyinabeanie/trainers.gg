import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";
import { requirePermission } from "../helpers";
import { PERMISSIONS } from "../permissionKeys";

export const getUserTeams = query({
  args: {
    userId: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      return []; // Return empty array if not authenticated
    }

    // Determine which user's teams to fetch
    const targetUserId = args.userId || user.profile._id;

    // If fetching another user's teams, they must be public or user needs permission
    if (targetUserId !== user.profile._id) {
      const teams = await ctx.db
        .query("teams")
        .withIndex("by_creator", (q) => q.eq("createdBy", targetUserId))
        .filter((q) => q.eq(q.field("isPublic"), true))
        .collect();

      // Get Pokemon count for each team
      const teamsWithCounts = await Promise.all(
        teams.map(async (team) => {
          const pokemonCount = await ctx.db
            .query("teamPokemon")
            .withIndex("by_team", (q) => q.eq("teamId", team._id))
            .collect()
            .then((pokemon) => pokemon.length);

          return {
            ...team,
            pokemonCount,
          };
        })
      );

      return teamsWithCounts;
    }

    // Fetch all teams for the current user (both public and private)
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_creator", (q) => q.eq("createdBy", targetUserId))
      .collect();

    // Get Pokemon count for each team
    const teamsWithCounts = await Promise.all(
      teams.map(async (team) => {
        const pokemonCount = await ctx.db
          .query("teamPokemon")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect()
          .then((pokemon) => pokemon.length);

        return {
          ...team,
          pokemonCount,
        };
      })
    );

    return teamsWithCounts;
  },
});

export const getTeamById = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Get the team
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Check privacy: team must be public or owned by current user
    if (!team.isPublic && team.createdBy !== user.profile._id) {
      throw new Error("Access denied: Team is private");
    }

    // Get team Pokemon with full details
    const teamPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Sort by team position
    teamPokemon.sort((a, b) => a.teamPosition - b.teamPosition);

    // Get Pokemon details
    const pokemonDetails = await Promise.all(
      teamPokemon.map(async (tp) => {
        const pokemon = await ctx.db.get(tp.pokemonId);
        return {
          ...tp,
          pokemon,
        };
      })
    );

    // Get team creator info
    const creator = await ctx.db.get(team.createdBy);

    return {
      ...team,
      creator: creator
        ? {
            _id: creator._id,
            displayName: creator.displayName,
            username: creator.username,
          }
        : null,
      pokemon: pokemonDetails,
    };
  },
});

export const getTeamForTournament = query({
  args: {
    tournamentId: v.id("tournaments"),
    profileId: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Determine which profile's registration to check
    const targetProfileId = args.profileId || user.profile._id;

    // If checking another user's team, require tournament management permission
    if (targetProfileId !== user.profile._id) {
      await requirePermission(
        ctx,
        user.profile._id,
        PERMISSIONS.TOURNAMENT_MANAGE_REGISTRATIONS,
        "tournament",
        args.tournamentId
      );
    }

    // Get the tournament registration
    const registration = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_profile", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("profileId", targetProfileId)
      )
      .first();

    if (!registration?.teamId) {
      return null;
    }
    const teamId = registration.teamId;

    // Get the team with Pokemon details
    const team = await ctx.db.get(teamId);
    if (!team) {
      return null;
    }

    // Get team Pokemon
    const teamPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();

    // Sort by team position
    teamPokemon.sort((a, b) => a.teamPosition - b.teamPosition);

    // Get Pokemon details
    const pokemonDetails = await Promise.all(
      teamPokemon.map(async (tp) => {
        const pokemon = await ctx.db.get(tp.pokemonId);
        return {
          ...tp,
          pokemon,
        };
      })
    );

    return {
      ...team,
      pokemon: pokemonDetails,
      registration,
    };
  },
});

export const getPublicTeams = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    formatLegal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    // Public teams can be viewed without authentication
    let teamsQuery = ctx.db
      .query("teams")
      .withIndex("by_public", (q) => q.eq("isPublic", true));

    // Apply filters
    if (args.formatLegal !== undefined) {
      teamsQuery = teamsQuery.filter((q) =>
        q.eq(q.field("formatLegal"), args.formatLegal)
      );
    }

    const allPublicTeams = await teamsQuery.collect();

    const teams =
      args.tags && args.tags.length > 0
        ? allPublicTeams.filter((team) =>
            team.tags.some((teamTag: string) => args.tags?.includes(teamTag))
          )
        : allPublicTeams;

    // Sort by creation date (newest first) and apply pagination
    const sortedTeams = teams
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(offset, offset + limit);

    // Get creator info and Pokemon count for each team
    const teamsWithCreators = await Promise.all(
      sortedTeams.map(async (team) => {
        const creator = await ctx.db.get(team.createdBy);
        const pokemonCount = await ctx.db
          .query("teamPokemon")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect()
          .then((pokemon) => pokemon.length);

        return {
          ...team,
          pokemonCount,
          creator: creator
            ? {
                _id: creator._id,
                displayName: creator.displayName,
                username: creator.username,
              }
            : null,
        };
      })
    );

    return {
      teams: teamsWithCreators,
      hasMore: offset + limit < teams.length,
      total: teams.length,
    };
  },
});

export const getTeamPokemon = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Get the team to check privacy
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Check privacy
    if (!team.isPublic && team.createdBy !== user.profile._id) {
      throw new Error("Access denied: Team is private");
    }

    // Get team Pokemon
    const teamPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Sort by team position
    teamPokemon.sort((a, b) => a.teamPosition - b.teamPosition);

    // Get Pokemon details
    const pokemonWithDetails = await Promise.all(
      teamPokemon.map(async (tp) => {
        const pokemon = await ctx.db.get(tp.pokemonId);
        return {
          teamPosition: tp.teamPosition,
          pokemon,
        };
      })
    );

    return pokemonWithDetails;
  },
});
