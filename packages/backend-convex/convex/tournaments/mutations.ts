import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";
import { requirePermission, logTournamentEvent } from "../helpers";
import { PERMISSIONS } from "../permissionKeys";

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    format: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check permission to create tournaments in this organization
    await requirePermission(
      ctx,
      user.profile._id,
      PERMISSIONS.TOURNAMENT_CREATE,
      "organization",
      args.organizationId
    );

    // Validate dates
    if (args.startDate && args.endDate && args.endDate < args.startDate) {
      throw new Error("End date must be after start date");
    }

    // Check if slug is unique within organization (using compound index for performance)
    const existing = await ctx.db
      .query("tournaments")
      .withIndex("by_org_slug", (q) =>
        q.eq("organizationId", args.organizationId).eq("slug", args.slug)
      )
      .first();

    if (existing) {
      throw new Error(
        `Tournament with slug '${args.slug}' already exists in this organization`
      );
    }

    // Create tournament
    const tournamentId = await ctx.db.insert("tournaments", {
      organizationId: args.organizationId,
      name: args.name,
      slug: args.slug,
      startDate: args.startDate,
      endDate: args.endDate,
      format: args.format,
      status: "draft",
      rentalTeamPhotosEnabled: false,
      rentalTeamPhotosRequired: false,
      participants: [],
      currentRound: 0,
    });

    await logTournamentEvent(
      ctx,
      "tournament_created",
      tournamentId,
      user.profile._id,
      {
        organizationId: args.organizationId,
        name: args.name,
        slug: args.slug,
        format: args.format ?? null,
      }
    );

    // Return the tournament with its slug
    const tournament = await ctx.db.get(tournamentId);
    return tournament;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("tournaments"),
    status: v.union(
      v.literal("draft"),
      v.literal("upcoming"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.id);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check permission to update this tournament
    await requirePermission(
      ctx,
      user.profile._id,
      PERMISSIONS.TOURNAMENT_UPDATE,
      "tournament",
      args.id
    );

    // Update status
    const oldStatus = tournament.status;
    await ctx.db.patch(args.id, { status: args.status });

    await logTournamentEvent(
      ctx,
      "tournament_status_changed",
      args.id,
      user.profile._id,
      {
        oldStatus,
        newStatus: args.status,
      }
    );

    return { success: true };
  },
});

export const update = mutation({
  args: {
    id: v.id("tournaments"),
    data: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      format: v.optional(v.string()),
      status: v.optional(
        v.union(
          v.literal("draft"),
          v.literal("upcoming"),
          v.literal("active"),
          v.literal("paused"),
          v.literal("completed"),
          v.literal("cancelled")
        )
      ),
      maxParticipants: v.optional(v.number()),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      registrationDeadline: v.optional(v.number()),
      roundTimeMinutes: v.optional(v.number()),
      swissRounds: v.optional(v.number()),
      topCutSize: v.optional(v.number()),
      featured: v.optional(v.boolean()),
      rentalTeamPhotosEnabled: v.optional(v.boolean()),
      rentalTeamPhotosRequired: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.id);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check permission to update this tournament
    await requirePermission(
      ctx,
      user.profile._id,
      PERMISSIONS.TOURNAMENT_UPDATE,
      "tournament",
      args.id
    );

    // Validate dates if provided
    if (
      args.data.startDate &&
      args.data.endDate &&
      args.data.endDate < args.data.startDate
    ) {
      throw new Error("End date must be after start date");
    }

    if (
      args.data.registrationDeadline &&
      args.data.startDate &&
      args.data.registrationDeadline > args.data.startDate
    ) {
      throw new Error("Registration deadline must be before start date");
    }

    // Filter out undefined values
    const updates = Object.fromEntries(
      Object.entries(args.data).filter(([_, value]) => value !== undefined)
    );

    // Update tournament
    await ctx.db.patch(args.id, updates);

    return { success: true };
  },
});

export const deleteTournament = mutation({
  args: {
    id: v.id("tournaments"),
    confirmPermanentDelete: v.optional(v.boolean()), // Must be true to actually delete
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.id);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check permission to delete this tournament
    await requirePermission(
      ctx,
      user.profile._id,
      PERMISSIONS.TOURNAMENT_DELETE,
      "tournament",
      args.id
    );

    // Check if tournament can be deleted (not in progress or completed)
    if (tournament.status === "active" || tournament.status === "completed") {
      throw new Error(
        "Cannot delete a tournament that is in progress or completed. Use archive instead to preserve historical data."
      );
    }

    // Recommend archiving instead of deleting
    if (!args.confirmPermanentDelete) {
      throw new Error(
        "Permanent deletion is not recommended. Use archiveTournament instead to preserve historical data. " +
          "If you really want to permanently delete, set confirmPermanentDelete to true."
      );
    }

    // Prevent deletion of archived tournaments (must restore first)
    if (tournament.archivedAt) {
      throw new Error(
        "Cannot permanently delete an archived tournament. Restore it first if you need to delete it."
      );
    }

    // Delete related data first
    // Delete registrations (using index for performance)
    const registrations = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.id))
      .collect();

    for (const registration of registrations) {
      await ctx.db.delete(registration._id);
    }

    // Delete phases (using index for performance)
    const phases = await ctx.db
      .query("tournamentPhases")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.id))
      .collect();

    for (const phase of phases) {
      await ctx.db.delete(phase._id);
    }

    // Finally delete the tournament
    await ctx.db.delete(args.id);

    return { success: true };
  },
});

/**
 * Archive a tournament (soft delete).
 * This preserves all tournament data including registrations, matches, standings, etc.
 * Archived tournaments are hidden from normal views but can be restored.
 */
export const archiveTournament = mutation({
  args: {
    id: v.id("tournaments"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.id);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check permission to delete/archive this tournament
    await requirePermission(
      ctx,
      user.profile._id,
      PERMISSIONS.TOURNAMENT_DELETE,
      "tournament",
      args.id
    );

    // Check if already archived
    if (tournament.archivedAt) {
      throw new Error("Tournament is already archived");
    }

    // Archive the tournament (soft delete)
    await ctx.db.patch(args.id, {
      archivedAt: Date.now(),
      archivedBy: user.profile._id,
      archiveReason: args.reason,
    });

    return { success: true, message: "Tournament archived successfully" };
  },
});

/**
 * Restore an archived tournament.
 * This makes the tournament visible again in normal views.
 */
export const restoreTournament = mutation({
  args: {
    id: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.id);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check permission to restore this tournament (same as delete permission)
    await requirePermission(
      ctx,
      user.profile._id,
      PERMISSIONS.TOURNAMENT_DELETE,
      "tournament",
      args.id
    );

    // Check if not archived
    if (!tournament.archivedAt) {
      throw new Error("Tournament is not archived");
    }

    // Restore the tournament
    await ctx.db.patch(args.id, {
      archivedAt: undefined,
      archivedBy: undefined,
      archiveReason: undefined,
    });

    return { success: true, message: "Tournament restored successfully" };
  },
});

// Export with proper name for the settings tab
export { deleteTournament as delete };
export { archiveTournament as archive };
export { restoreTournament as restore };
