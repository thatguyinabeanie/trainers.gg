import { v } from "convex/values";
import { mutation, MutationCtx } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";
import { requirePermission } from "../helpers";
import { PERMISSIONS } from "../permissionKeys";
import { Id } from "../_generated/dataModel";

export const createTeam = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get identity directly from auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated - no identity found");
    }

    // Get current user
    let user = await getCurrentUserHelper(ctx);
    if (!user) {
      // Auto-create user if they don't exist (e.g., webhook didn't fire)
      const userId = await ctx.db.insert("users", {
        clerkUserId: identity.subject,
        email: identity.email || undefined,
        name:
          identity.name || identity.givenName || identity.nickname || undefined,
        image: identity.pictureUrl || undefined,
      });

      const newUser = await ctx.db.get(userId);
      if (!newUser) {
        throw new Error("Failed to create user account");
      }

      user = {
        id: newUser._id,
        clerkUserId: newUser.clerkUserId,
        email: newUser.email,
        name: newUser.name,
        image: newUser.image,
        profile: null,
      };
    }
    if (!user.profile) {
      // Auto-create profile if it doesn't exist
      const uniqueUsername = `user_${(user.clerkUserId || "unknown").slice(-8)}`;
      const profileId = await ctx.db.insert("profiles", {
        userId: user.id,
        displayName: user.name || user.email || "User",
        username: uniqueUsername,
        tier: "free",
      });

      // Update user with main profile
      await ctx.db.patch(user.id, { mainProfileId: profileId });

      const profile = await ctx.db.get(profileId);
      if (!profile) {
        throw new Error("Failed to create profile");
      }
      user.profile = profile;
    }

    // Any authenticated user can create teams - no special permission needed

    // Validate team name length
    if (args.name.trim().length < 1 || args.name.length > 100) {
      throw new Error("Team name must be between 1 and 100 characters");
    }

    // Create team
    const teamId = await ctx.db.insert("teams", {
      name: args.name.trim(),
      description: args.description?.trim(),
      createdBy: user.profile._id,
      isPublic: args.isPublic,
      formatLegal: false, // Will be calculated when Pokemon are added
      tags: args.tags.filter((tag) => tag.trim().length > 0),
      notes: args.notes?.trim(),
    });

    const team = await ctx.db.get(teamId);
    return team;
  },
});

export const updateTeam = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { teamId, ...updates } = args;

    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Get the team
    const team = await ctx.db.get(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Check if user owns the team or has permission
    if (team.createdBy !== user.profile._id) {
      await requirePermission(
        ctx,
        user.profile._id,
        PERMISSIONS.TEAM_UPDATE,
        "team",
        teamId
      );
    }

    // Validate name if provided
    if (updates.name !== undefined) {
      if (updates.name.trim().length < 1 || updates.name.length > 100) {
        throw new Error("Team name must be between 1 and 100 characters");
      }
      updates.name = updates.name.trim();
    }

    // Clean up other fields
    if (updates.description !== undefined) {
      updates.description = updates.description?.trim();
    }
    if (updates.notes !== undefined) {
      updates.notes = updates.notes?.trim();
    }
    if (updates.tags !== undefined) {
      updates.tags = updates.tags.filter((tag) => tag.trim().length > 0);
    }

    // Update team
    await ctx.db.patch(teamId, updates);

    const updatedTeam = await ctx.db.get(teamId);
    return updatedTeam;
  },
});

export const deleteTeam = mutation({
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

    // Check if user owns the team or has permission
    if (team.createdBy !== user.profile._id) {
      await requirePermission(
        ctx,
        user.profile._id,
        PERMISSIONS.TEAM_DELETE,
        "team",
        args.teamId
      );
    }

    // Check if team is used in any tournament registrations
    const registrations = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    if (registrations.length > 0) {
      throw new Error("Cannot delete team that is registered for tournaments");
    }

    // Delete all Pokemon relationships first
    const teamPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    for (const tp of teamPokemon) {
      await ctx.db.delete(tp._id);
    }

    // Delete the team
    await ctx.db.delete(args.teamId);

    return { success: true };
  },
});

export const addPokemonToTeam = mutation({
  args: {
    teamId: v.id("teams"),
    pokemonId: v.id("pokemon"),
    teamPosition: v.number(),
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

    // Check if user owns the team or has permission
    if (team.createdBy !== user.profile._id) {
      await requirePermission(
        ctx,
        user.profile._id,
        PERMISSIONS.TEAM_UPDATE,
        "team",
        args.teamId
      );
    }

    // Get the Pokemon
    const pokemon = await ctx.db.get(args.pokemonId);
    if (!pokemon) {
      throw new Error("Pokemon not found");
    }

    // Validate team position (1-6 for VGC format)
    if (args.teamPosition < 1 || args.teamPosition > 6) {
      throw new Error("Team position must be between 1 and 6");
    }

    // Check if Pokemon is already on this team
    const existingPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_team_pokemon", (q) =>
        q.eq("teamId", args.teamId).eq("pokemonId", args.pokemonId)
      )
      .first();

    if (existingPokemon) {
      throw new Error("Pokemon is already on this team");
    }

    // Check if position is already occupied
    const positionOccupied = await ctx.db
      .query("teamPokemon")
      .withIndex("by_team_position", (q) =>
        q.eq("teamId", args.teamId).eq("teamPosition", args.teamPosition)
      )
      .first();

    if (positionOccupied) {
      throw new Error(`Position ${args.teamPosition} is already occupied`);
    }

    // Check team size limit (max 6 Pokemon)
    const currentTeamSize = await ctx.db
      .query("teamPokemon")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    if (currentTeamSize.length >= 6) {
      throw new Error("Team cannot have more than 6 Pokemon");
    }

    // Add Pokemon to team
    const teamPokemonId = await ctx.db.insert("teamPokemon", {
      teamId: args.teamId,
      pokemonId: args.pokemonId,
      teamPosition: args.teamPosition,
    });

    // Update team's format legality
    await updateTeamFormatLegality(ctx, args.teamId);

    const teamPokemon = await ctx.db.get(teamPokemonId);
    return teamPokemon;
  },
});

export const removePokemonFromTeam = mutation({
  args: {
    teamId: v.id("teams"),
    pokemonId: v.id("pokemon"),
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

    // Check if user owns the team or has permission
    if (team.createdBy !== user.profile._id) {
      await requirePermission(
        ctx,
        user.profile._id,
        PERMISSIONS.TEAM_UPDATE,
        "team",
        args.teamId
      );
    }

    // Find the team-Pokemon relationship
    const teamPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_team_pokemon", (q) =>
        q.eq("teamId", args.teamId).eq("pokemonId", args.pokemonId)
      )
      .first();

    if (!teamPokemon) {
      throw new Error("Pokemon not found on this team");
    }

    // Remove Pokemon from team
    await ctx.db.delete(teamPokemon._id);

    // Update team's format legality
    await updateTeamFormatLegality(ctx, args.teamId);

    return { success: true };
  },
});

export const reorderTeamPokemon = mutation({
  args: {
    teamId: v.id("teams"),
    pokemonId: v.id("pokemon"),
    newPosition: v.number(),
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

    // Check if user owns the team or has permission
    if (team.createdBy !== user.profile._id) {
      await requirePermission(
        ctx,
        user.profile._id,
        PERMISSIONS.TEAM_UPDATE,
        "team",
        args.teamId
      );
    }

    // Validate new position
    if (args.newPosition < 1 || args.newPosition > 6) {
      throw new Error("Team position must be between 1 and 6");
    }

    // Find the Pokemon on the team
    const teamPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_team_pokemon", (q) =>
        q.eq("teamId", args.teamId).eq("pokemonId", args.pokemonId)
      )
      .first();

    if (!teamPokemon) {
      throw new Error("Pokemon not found on this team");
    }

    const oldPosition = teamPokemon.teamPosition;
    if (oldPosition === args.newPosition) {
      return { success: true }; // No change needed
    }

    // Get all team Pokemon to handle position swapping
    const allTeamPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Find Pokemon at the new position (if any)
    const pokemonAtNewPosition = allTeamPokemon.find(
      (tp) => tp.teamPosition === args.newPosition
    );

    // Update positions
    if (pokemonAtNewPosition) {
      // Swap positions
      await ctx.db.patch(pokemonAtNewPosition._id, {
        teamPosition: oldPosition,
      });
    }

    await ctx.db.patch(teamPokemon._id, {
      teamPosition: args.newPosition,
    });

    return { success: true };
  },
});

export const createAndAddPokemonToTeam = mutation({
  args: {
    teamId: v.id("teams"),
    pokemon: v.object({
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
    }),
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

    // Check if user owns the team
    if (team.createdBy !== user.profile._id) {
      throw new Error("You can only add Pokemon to your own teams");
    }

    // Check team size limit (max 6 Pokemon)
    const currentTeamSize = await ctx.db
      .query("teamPokemon")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    if (currentTeamSize.length >= 6) {
      throw new Error("Team cannot have more than 6 Pokemon");
    }

    // Find the next available position
    const usedPositions = currentTeamSize.map((tp) => tp.teamPosition);
    let teamPosition = 1;
    while (usedPositions.includes(teamPosition) && teamPosition <= 6) {
      teamPosition++;
    }

    // Create the Pokemon
    const pokemonId = await ctx.db.insert("pokemon", {
      ...args.pokemon,
      formatLegal: true, // We'll implement proper legality checking later
    });

    // Add Pokemon to team
    await ctx.db.insert("teamPokemon", {
      teamId: args.teamId,
      pokemonId,
      teamPosition,
    });

    // Update team's format legality
    await updateTeamFormatLegality(ctx, args.teamId);

    return {
      pokemonId,
      teamPosition,
      success: true,
    };
  },
});

export const updatePokemon = mutation({
  args: {
    pokemonId: v.id("pokemon"),
    updates: v.object({
      nickname: v.optional(v.string()),
      level: v.optional(v.number()),
      nature: v.optional(v.string()),
      ability: v.optional(v.string()),
      heldItem: v.optional(v.string()),
      gender: v.optional(v.union(v.literal("Male"), v.literal("Female"))),
      isShiny: v.optional(v.boolean()),
      teraType: v.optional(v.string()),
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
    }),
  },
  handler: async (ctx, args) => {
    const { pokemonId, updates } = args;

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

    // Find which team this Pokemon belongs to
    const teamPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_pokemon", (q) => q.eq("pokemonId", pokemonId))
      .first();

    if (!teamPokemon) {
      throw new Error("Pokemon is not on any team");
    }

    // Get the team
    const team = await ctx.db.get(teamPokemon.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Check if user owns the team
    if (team.createdBy !== user.profile._id) {
      throw new Error("You can only edit Pokemon on your own teams");
    }

    // Validate EVs if provided
    if (
      updates.evHp !== undefined ||
      updates.evAttack !== undefined ||
      updates.evDefense !== undefined ||
      updates.evSpecialAttack !== undefined ||
      updates.evSpecialDefense !== undefined ||
      updates.evSpeed !== undefined
    ) {
      const totalEvs =
        (updates.evHp ?? pokemon.evHp) +
        (updates.evAttack ?? pokemon.evAttack) +
        (updates.evDefense ?? pokemon.evDefense) +
        (updates.evSpecialAttack ?? pokemon.evSpecialAttack) +
        (updates.evSpecialDefense ?? pokemon.evSpecialDefense) +
        (updates.evSpeed ?? pokemon.evSpeed);

      if (totalEvs > 510) {
        throw new Error("Total EVs cannot exceed 510");
      }

      // Check individual EV limits
      const evFields = [
        "evHp",
        "evAttack",
        "evDefense",
        "evSpecialAttack",
        "evSpecialDefense",
        "evSpeed",
      ] as const;
      for (const field of evFields) {
        const value = updates[field];
        if (value !== undefined && (value < 0 || value > 252)) {
          throw new Error(`${field} must be between 0 and 252`);
        }
      }
    }

    // Validate IVs if provided
    const ivFields = [
      "ivHp",
      "ivAttack",
      "ivDefense",
      "ivSpecialAttack",
      "ivSpecialDefense",
      "ivSpeed",
    ] as const;
    for (const field of ivFields) {
      const value = updates[field];
      if (value !== undefined && (value < 0 || value > 31)) {
        throw new Error(`${field} must be between 0 and 31`);
      }
    }

    // Validate level if provided
    if (
      updates.level !== undefined &&
      (updates.level < 1 || updates.level > 100)
    ) {
      throw new Error("Level must be between 1 and 100");
    }

    // Update the Pokemon
    await ctx.db.patch(pokemonId, updates);

    // Update team's format legality
    await updateTeamFormatLegality(ctx, teamPokemon.teamId);

    const updatedPokemon = await ctx.db.get(pokemonId);
    return updatedPokemon;
  },
});

// Helper function to update team format legality
async function updateTeamFormatLegality(
  ctx: MutationCtx,
  teamId: Id<"teams">
): Promise<void> {
  // Get all Pokemon on the team
  const teamPokemon = await ctx.db
    .query("teamPokemon")
    .withIndex("by_team", (q) => q.eq("teamId", teamId))
    .collect();

  // Get Pokemon details
  const pokemonDetails = await Promise.all(
    teamPokemon.map((tp) => ctx.db.get(tp.pokemonId))
  );

  // Check if all Pokemon are format legal
  const allLegal = pokemonDetails.every(
    (pokemon) => pokemon && pokemon.formatLegal
  );

  // Update team format legality
  await ctx.db.patch(teamId, {
    formatLegal: allLegal && pokemonDetails.length > 0,
  });
}
