import { PERMISSIONS } from "../permissionKeys";
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";
import { requirePermission } from "../helpers";
import { z } from "zod";
import type { Id } from "../_generated/dataModel";

// Zod validation schemas
const registerSchema = z.object({
  tournamentId: z.custom<Id<"tournaments">>(),
  teamName: z.string().min(1).max(100).optional(),
  notes: z.string().max(500).optional(),
});

// Register for a tournament
export const register = mutation({
  args: {
    data: v.object({
      tournamentId: v.id("tournaments"),
      teamName: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Validate input with Zod
    const validated = registerSchema.parse(args.data);
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    const profileId = user.profile._id;

    // Check if already registered
    const existing = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_profile", (q) =>
        q.eq("tournamentId", validated.tournamentId).eq("profileId", profileId)
      )
      .first();

    if (existing) {
      throw new Error("Already registered for this tournament");
    }

    // Check tournament status
    const tournament = await ctx.db.get(validated.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    if (tournament.status !== "upcoming") {
      throw new Error("Tournament is not open for registration");
    }

    // Check permission to register for tournaments
    await requirePermission(
      ctx,
      profileId,
      PERMISSIONS.TOURNAMENT_REGISTER,
      "tournament",
      validated.tournamentId
    );

    // Create registration first, then check max participants atomically
    // This prevents race conditions where multiple users register simultaneously
    const registrationId = await ctx.db.insert("tournamentRegistrations", {
      tournamentId: validated.tournamentId,
      profileId: profileId,
      status: "pending",
      registeredAt: Date.now(),
      teamName: validated.teamName,
      notes: validated.notes,
      rentalTeamPhotoVerified: false,
    });

    // Check max participants after insertion to prevent race conditions
    if (tournament.maxParticipants) {
      const currentRegs = await ctx.db
        .query("tournamentRegistrations")
        .withIndex("by_tournament", (q) =>
          q.eq("tournamentId", validated.tournamentId)
        )
        .collect();

      if (currentRegs.length > tournament.maxParticipants) {
        // Rollback: Delete the registration we just created
        await ctx.db.delete(registrationId);
        throw new Error("Tournament is full");
      }
    }

    return { success: true, registrationId };
  },
});

// Withdraw registration from a tournament
export const withdraw = mutation({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    const profileId = user.profile._id;

    // Find the registration
    const registration = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_profile", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("profileId", profileId)
      )
      .first();

    if (!registration) {
      throw new Error("Not registered for this tournament");
    }

    // Check tournament status - can't withdraw from active/completed tournaments
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    if (tournament.status === "active" || tournament.status === "completed") {
      throw new Error("Cannot withdraw from active or completed tournament");
    }

    // Delete the registration
    await ctx.db.delete(registration._id);

    return { success: true };
  },
});

// Submit team for tournament
export const submitTeam = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    const profileId = user.profile._id;

    // Find the registration
    const registration = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_profile", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("profileId", profileId)
      )
      .first();

    if (!registration) {
      throw new Error("Not registered for this tournament");
    }

    // Check permission to submit teams
    await requirePermission(
      ctx,
      profileId,
      PERMISSIONS.TOURNAMENT_SUBMIT_TEAM,
      "tournament",
      args.tournamentId
    );

    // Verify team ownership
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    if (team.createdBy !== profileId) {
      throw new Error("You can only submit teams you created");
    }

    // Verify team has 6 Pokemon
    const teamPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    if (teamPokemon.length !== 6) {
      throw new Error("Team must have exactly 6 Pokemon");
    }

    // Update registration with team
    await ctx.db.patch(registration._id, {
      teamId: args.teamId,
    });

    return { success: true };
  },
});

// Get registration status for current user
export const getMyRegistration = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      return null;
    }

    const profileId = user.profile._id;

    const registration = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_profile", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("profileId", profileId)
      )
      .first();

    return registration;
  },
});

// Get submitted team for registration
export const getMySubmittedTeam = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      return null;
    }

    const profileId = user.profile._id;

    const registration = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_profile", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("profileId", profileId)
      )
      .first();

    if (!registration?.teamId) {
      return null;
    }

    const team = await ctx.db.get(registration.teamId);
    if (!team) {
      return null;
    }

    // Get Pokemon in the team
    const teamPokemon = await ctx.db
      .query("teamPokemon")
      .withIndex("by_team", (q) => q.eq("teamId", registration.teamId!))
      .collect();

    return {
      ...team,
      pokemon: teamPokemon,
    };
  },
});

// Get all registrations for a tournament (admin only)
export const getTournamentRegistrations = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check permission to view tournament registrations
    await requirePermission(
      ctx,
      user.profile._id,
      PERMISSIONS.TOURNAMENT_MANAGE,
      "tournament",
      args.tournamentId
    );

    const registrations = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    // Get profile info for each registration
    const registrationsWithProfiles = await Promise.all(
      registrations.map(async (registration) => {
        const profile = await ctx.db.get(registration.profileId);
        let team = null;
        if (registration.teamId) {
          team = await ctx.db.get(registration.teamId);
        }
        return {
          ...registration,
          profile,
          team,
        };
      })
    );

    return registrationsWithProfiles;
  },
});

// Get registration stats for a tournament
export const getRegistrationStats = query({
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

    const stats = {
      total: registrations.length,
      pending: registrations.filter((r) => r.status === "pending").length,
      checkedIn: registrations.filter((r) => r.status === "checked_in").length,
      withdrawn: registrations.filter((r) => r.status === "withdrawn").length,
      withTeams: registrations.filter((r) => r.teamId).length,
    };

    return stats;
  },
});
