import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";

export const getPokemonById = query({
  args: {
    pokemonId: v.id("pokemon"),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Get the Pokemon
    const pokemon = await ctx.db.get(args.pokemonId);
    if (!pokemon) {
      throw new Error("Pokemon not found");
    }

    // Check if user has access to this Pokemon (via team ownership) - using team_pokemon index
    const teamPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_pokemon", (q) => q.eq("pokemonId", args.pokemonId))
      .collect();

    let hasAccess = false;
    for (const tp of teamPokemon) {
      const team = await ctx.db.get(tp.teamId);
      if (team && (team.createdBy === user.profile._id || team.isPublic)) {
        hasAccess = true;
        break;
      }
    }

    if (!hasAccess) {
      throw new Error("Access denied: Pokemon not accessible");
    }

    return pokemon;
  },
});

export const getUserPokemon = query({
  args: {
    userId: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Determine which user's Pokemon to fetch
    const targetUserId = args.userId || user.profile._id;

    // Get all teams for the target user (using indexes for performance)
    let teams;
    if (targetUserId === user.profile._id) {
      // Current user - get all teams
      teams = await ctx.db
        .query("teams")
        .withIndex("by_creator", (q) => q.eq("createdBy", targetUserId))
        .collect();
    } else {
      // Another user - only public teams (using by_creator and filter public in memory)
      teams = await ctx.db
        .query("teams")
        .withIndex("by_creator", (q) => q.eq("createdBy", targetUserId))
        .collect()
        .then((teams) => teams.filter((t) => t.isPublic));
    }

    const teamIds = teams.map((team) => team._id);

    // Get all Pokemon from these teams (using index for performance)
    const allTeamPokemon = [];
    for (const teamId of teamIds) {
      const teamPokemon = await ctx.db
        .query("teamPokemon")
        .withIndex("by_team", (q) => q.eq("teamId", teamId))
        .collect();
      allTeamPokemon.push(...teamPokemon);
    }

    // Get unique Pokemon IDs
    const pokemonIds = [...new Set(allTeamPokemon.map((tp) => tp.pokemonId))];

    // Get Pokemon details
    const pokemon = await Promise.all(pokemonIds.map((id) => ctx.db.get(id)));

    return pokemon.filter((p) => p !== null);
  },
});

export const searchPokemon = query({
  args: {
    species: v.optional(v.string()),
    nature: v.optional(v.string()),
    ability: v.optional(v.string()),
    move: v.optional(v.string()),
    formatLegal: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    const limit = args.limit || 50;

    // Get all Pokemon from public teams (using index for performance)
    const publicTeams = await ctx.db
      .query("teams")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .collect();

    const publicTeamIds = publicTeams.map((team) => team._id);

    // Get all Pokemon from public teams (using index for performance)
    const allTeamPokemon = [];
    for (const teamId of publicTeamIds) {
      const teamPokemon = await ctx.db
        .query("teamPokemon")
        .withIndex("by_team", (q) => q.eq("teamId", teamId))
        .collect();
      allTeamPokemon.push(...teamPokemon);
    }

    // Get unique Pokemon IDs
    const pokemonIds = [...new Set(allTeamPokemon.map((tp) => tp.pokemonId))];

    // Get Pokemon details
    const allPokemon = await Promise.all(
      pokemonIds.map((id) => ctx.db.get(id))
    );

    // Filter Pokemon based on search criteria
    let filteredPokemon = allPokemon.filter((pokemon) => {
      if (!pokemon) return false;

      if (
        args.species &&
        !pokemon.species.toLowerCase().includes(args.species.toLowerCase())
      ) {
        return false;
      }

      if (
        args.nature &&
        !pokemon.nature.toLowerCase().includes(args.nature.toLowerCase())
      ) {
        return false;
      }

      if (
        args.ability &&
        !pokemon.ability.toLowerCase().includes(args.ability.toLowerCase())
      ) {
        return false;
      }

      if (args.move) {
        const moveQuery = args.move.toLowerCase();
        const hasMove = [
          pokemon.move1,
          pokemon.move2,
          pokemon.move3,
          pokemon.move4,
        ]
          .filter((move) => move)
          .some((move) => move!.toLowerCase().includes(moveQuery));
        if (!hasMove) return false;
      }

      if (
        args.formatLegal !== undefined &&
        pokemon.formatLegal !== args.formatLegal
      ) {
        return false;
      }

      return true;
    });

    // Limit results
    filteredPokemon = filteredPokemon.slice(0, limit);

    return filteredPokemon;
  },
});

export const getPokemonBySpecies = query({
  args: {
    species: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    const limit = args.limit || 20;

    // Get Pokemon by species from public teams (using index for performance)
    const publicTeams = await ctx.db
      .query("teams")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .collect();

    const publicTeamIds = publicTeams.map((team) => team._id);

    // Get all Pokemon from public teams (using index for performance)
    const allTeamPokemon = [];
    for (const teamId of publicTeamIds) {
      const teamPokemon = await ctx.db
        .query("teamPokemon")
        .withIndex("by_team", (q) => q.eq("teamId", teamId))
        .collect();
      allTeamPokemon.push(...teamPokemon);
    }

    // Get unique Pokemon IDs
    const pokemonIds = [...new Set(allTeamPokemon.map((tp) => tp.pokemonId))];

    // Get Pokemon details and filter by species
    const pokemon = await Promise.all(pokemonIds.map((id) => ctx.db.get(id)));

    const speciesPokemon = pokemon
      .filter(
        (p) => p && p.species.toLowerCase() === args.species.toLowerCase()
      )
      .slice(0, limit);

    return speciesPokemon;
  },
});
