import { v } from "convex/values";
import { mutation, MutationCtx } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";
import { requirePermission } from "../helpers";
import { PERMISSIONS } from "../permissionKeys";
import { Id, Doc } from "../_generated/dataModel";

export const createPokemon = mutation({
  args: {
    species: v.string(),
    nickname: v.optional(v.string()),
    level: v.number(),
    nature: v.string(),
    ability: v.string(),
    heldItem: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("Male"), v.literal("Female"))),
    isShiny: v.boolean(),
    move1: v.string(),
    move2: v.optional(v.string()),
    move3: v.optional(v.string()),
    move4: v.optional(v.string()),
    evHp: v.number(),
    evAttack: v.number(),
    evDefense: v.number(),
    evSpecialAttack: v.number(),
    evSpecialDefense: v.number(),
    evSpeed: v.number(),
    ivHp: v.number(),
    ivAttack: v.number(),
    ivDefense: v.number(),
    ivSpecialAttack: v.number(),
    ivSpecialDefense: v.number(),
    ivSpeed: v.number(),
    teraType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check permission to create Pokemon
    await requirePermission(ctx, user.profile._id, PERMISSIONS.POKEMON_CREATE);

    // Validate inputs
    validatePokemonStats(args);

    // Create Pokemon with basic format legality check
    const formatLegal = validateBasicFormatLegality(args);

    const pokemonId = await ctx.db.insert("pokemon", {
      species: args.species.trim(),
      nickname: args.nickname?.trim(),
      level: args.level,
      nature: args.nature.trim(),
      ability: args.ability.trim(),
      heldItem: args.heldItem?.trim(),
      gender: args.gender,
      isShiny: args.isShiny,
      move1: args.move1.trim(),
      move2: args.move2?.trim(),
      move3: args.move3?.trim(),
      move4: args.move4?.trim(),
      evHp: args.evHp,
      evAttack: args.evAttack,
      evDefense: args.evDefense,
      evSpecialAttack: args.evSpecialAttack,
      evSpecialDefense: args.evSpecialDefense,
      evSpeed: args.evSpeed,
      ivHp: args.ivHp,
      ivAttack: args.ivAttack,
      ivDefense: args.ivDefense,
      ivSpecialAttack: args.ivSpecialAttack,
      ivSpecialDefense: args.ivSpecialDefense,
      ivSpeed: args.ivSpeed,
      teraType: args.teraType?.trim(),
      formatLegal,
    });

    const pokemon = await ctx.db.get(pokemonId);
    return pokemon;
  },
});

export const updatePokemon = mutation({
  args: {
    pokemonId: v.id("pokemon"),
    species: v.optional(v.string()),
    nickname: v.optional(v.string()),
    level: v.optional(v.number()),
    nature: v.optional(v.string()),
    ability: v.optional(v.string()),
    heldItem: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("Male"), v.literal("Female"))),
    isShiny: v.optional(v.boolean()),
    move1: v.optional(v.string()),
    move2: v.optional(v.string()),
    move3: v.optional(v.string()),
    move4: v.optional(v.string()),
    evHp: v.optional(v.number()),
    evAttack: v.optional(v.number()),
    evDefense: v.optional(v.number()),
    evSpecialAttack: v.optional(v.number()),
    evSpecialDefense: v.optional(v.number()),
    evSpeed: v.optional(v.number()),
    ivHp: v.optional(v.number()),
    ivAttack: v.optional(v.number()),
    ivDefense: v.optional(v.number()),
    ivSpecialAttack: v.optional(v.number()),
    ivSpecialDefense: v.optional(v.number()),
    ivSpeed: v.optional(v.number()),
    teraType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { pokemonId, ...updates } = args;

    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Get the Pokemon
    const pokemon = await ctx.db.get(pokemonId);
    if (!pokemon) {
      throw new Error("Pokemon not found");
    }

    // Check if Pokemon is on any team owned by the user
    const teamPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_pokemon", (q) => q.eq("pokemonId", pokemonId))
      .collect();

    let canUpdate = false;
    for (const tp of teamPokemon) {
      const team = await ctx.db.get(tp.teamId);
      if (team && team.createdBy === user.profile._id) {
        canUpdate = true;
        break;
      }
    }

    if (!canUpdate) {
      await requirePermission(
        ctx,
        user.profile._id,
        PERMISSIONS.POKEMON_UPDATE,
        "pokemon",
        pokemonId
      );
    }

    // Clean string fields
    if (updates.species !== undefined) {
      updates.species = updates.species.trim();
    }
    if (updates.nickname !== undefined) {
      updates.nickname = updates.nickname?.trim();
    }
    if (updates.nature !== undefined) {
      updates.nature = updates.nature.trim();
    }
    if (updates.ability !== undefined) {
      updates.ability = updates.ability.trim();
    }
    if (updates.heldItem !== undefined) {
      updates.heldItem = updates.heldItem?.trim();
    }
    if (updates.move1 !== undefined) {
      updates.move1 = updates.move1.trim();
    }
    if (updates.move2 !== undefined) {
      updates.move2 = updates.move2?.trim();
    }
    if (updates.move3 !== undefined) {
      updates.move3 = updates.move3?.trim();
    }
    if (updates.move4 !== undefined) {
      updates.move4 = updates.move4?.trim();
    }
    if (updates.teraType !== undefined) {
      updates.teraType = updates.teraType?.trim();
    }

    // Validate stats if provided
    const updatedPokemon = { ...pokemon, ...updates };
    validatePokemonStats(updatedPokemon);

    // Recalculate format legality
    const formatLegal = validateBasicFormatLegality(updatedPokemon);
    (updates as { formatLegal?: boolean }).formatLegal = formatLegal;

    // Update Pokemon
    await ctx.db.patch(pokemonId, updates);

    // Update format legality for all teams containing this Pokemon
    for (const tp of teamPokemon) {
      await updateTeamFormatLegality(ctx, tp.teamId);
    }

    const updatedPokemonDoc = await ctx.db.get(pokemonId);
    return updatedPokemonDoc;
  },
});

export const deletePokemon = mutation({
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

    // Check if Pokemon is on any team owned by the user
    const teamPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_pokemon", (q) => q.eq("pokemonId", args.pokemonId))
      .collect();

    let canDelete = false;
    const teamsToUpdate: Id<"teams">[] = [];

    for (const tp of teamPokemon) {
      const team = await ctx.db.get(tp.teamId);
      if (team && team.createdBy === user.profile._id) {
        canDelete = true;
        teamsToUpdate.push(tp.teamId);
      }
    }

    if (!canDelete && teamPokemon.length > 0) {
      throw new Error("Cannot delete Pokemon that is on teams you don't own");
    }

    if (!canDelete) {
      await requirePermission(
        ctx,
        user.profile._id,
        PERMISSIONS.POKEMON_DELETE,
        "pokemon",
        args.pokemonId
      );
    }

    // Remove from all teams first
    for (const tp of teamPokemon) {
      await ctx.db.delete(tp._id);
    }

    // Delete the Pokemon
    await ctx.db.delete(args.pokemonId);

    // Update format legality for affected teams
    for (const teamId of teamsToUpdate) {
      await updateTeamFormatLegality(ctx, teamId);
    }

    return { success: true };
  },
});

// Helper function to validate Pokemon stats
function validatePokemonStats(pokemon: Partial<Doc<"pokemon">>): void {
  // Validate level
  if (pokemon.level && (pokemon.level < 1 || pokemon.level > 100)) {
    throw new Error("Pokemon level must be between 1 and 100");
  }

  // Validate EVs
  const totalEvs =
    (pokemon.evHp ?? 0) +
    (pokemon.evAttack ?? 0) +
    (pokemon.evDefense ?? 0) +
    (pokemon.evSpecialAttack ?? 0) +
    (pokemon.evSpecialDefense ?? 0) +
    (pokemon.evSpeed ?? 0);
  if (totalEvs > 510) {
    throw new Error("Total EVs cannot exceed 510");
  }

  // Validate individual EVs
  const evs = [
    pokemon.evHp,
    pokemon.evAttack,
    pokemon.evDefense,
    pokemon.evSpecialAttack,
    pokemon.evSpecialDefense,
    pokemon.evSpeed,
  ];
  for (const ev of evs) {
    if (ev && (ev < 0 || ev > 252)) {
      throw new Error("Individual EVs must be between 0 and 252");
    }
  }

  // Validate IVs
  const ivs = [
    pokemon.ivHp,
    pokemon.ivAttack,
    pokemon.ivDefense,
    pokemon.ivSpecialAttack,
    pokemon.ivSpecialDefense,
    pokemon.ivSpeed,
  ];
  for (const iv of ivs) {
    if (iv && (iv < 0 || iv > 31)) {
      throw new Error("Individual IVs must be between 0 and 31");
    }
  }

  // Validate required fields
  if (!pokemon.species || pokemon.species.trim().length === 0) {
    throw new Error("Species is required");
  }
  if (!pokemon.nature || pokemon.nature.trim().length === 0) {
    throw new Error("Nature is required");
  }
  if (!pokemon.ability || pokemon.ability.trim().length === 0) {
    throw new Error("Ability is required");
  }
  if (!pokemon.move1 || pokemon.move1.trim().length === 0) {
    throw new Error("At least one move is required");
  }
}

// Basic format legality validation (placeholder for more complex checks)
function validateBasicFormatLegality(
  pokemon: Partial<Doc<"pokemon">>
): boolean {
  try {
    // Basic checks that could cause immediate illegality
    if (pokemon.level && (pokemon.level < 1 || pokemon.level > 100))
      return false;

    const totalEvs =
      (pokemon.evHp ?? 0) +
      (pokemon.evAttack ?? 0) +
      (pokemon.evDefense ?? 0) +
      (pokemon.evSpecialAttack ?? 0) +
      (pokemon.evSpecialDefense ?? 0) +
      (pokemon.evSpeed ?? 0);
    if (totalEvs > 510) return false;

    // Check for required fields
    if (
      !pokemon.species ||
      !pokemon.nature ||
      !pokemon.ability ||
      !pokemon.move1
    ) {
      return false;
    }

    // More comprehensive checks would go here (move legality, ability legality, etc.)
    return true;
  } catch {
    return false;
  }
}

// Helper function to update team format legality
async function updateTeamFormatLegality(
  ctx: MutationCtx,
  teamId: Id<"teams">
): Promise<void> {
  const teamPokemon = await ctx.db
    .query("teamPokemon")
    .withIndex("by_team", (q) => q.eq("teamId", teamId))
    .collect();

  const pokemonDetails = await Promise.all(
    teamPokemon.map((tp) => ctx.db.get(tp.pokemonId))
  );

  const allLegal = pokemonDetails.every(
    (pokemon) => pokemon && pokemon.formatLegal
  );

  await ctx.db.patch(teamId, {
    formatLegal: allLegal && pokemonDetails.length > 0,
  });
}
