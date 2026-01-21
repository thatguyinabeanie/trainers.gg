import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUserHelper } from "./auth";
import { requirePermission } from "./helpers";
import { PERMISSIONS } from "./permissionKeys";

// List tournaments with filters
export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Apply filters using indexes for performance
    let tournaments;
    if (args.organizationId) {
      tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_org", (q) =>
          q.eq("organizationId", args.organizationId!)
        )
        .order("desc")
        .take(limit + 1);
    } else if (args.status) {
      tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_status", (q) =>
          q.eq(
            "status",
            args.status as
              | "draft"
              | "upcoming"
              | "active"
              | "paused"
              | "completed"
              | "cancelled"
          )
        )
        .order("desc")
        .take(limit + 1);
    } else {
      tournaments = await ctx.db
        .query("tournaments")
        .order("desc")
        .take(limit + 1);
    }

    // Filter out archived tournaments
    tournaments = tournaments.filter((tournament) => !tournament.archivedAt);

    // Include organization and registration count (using index for performance)
    const tournamentsWithDetails = await Promise.all(
      tournaments.map(async (tournament) => {
        const org = await ctx.db.get(tournament.organizationId);
        const registrations = await ctx.db
          .query("tournamentRegistrations")
          .withIndex("by_tournament", (q) =>
            q.eq("tournamentId", tournament._id)
          )
          .collect();

        return {
          ...tournament,
          organization: org,
          _count: { registrations: registrations.length },
        };
      })
    );

    // Handle pagination
    let nextCursor: string | undefined;
    if (tournamentsWithDetails.length > limit) {
      const nextItem = tournamentsWithDetails.pop();
      nextCursor = nextItem?._id;
    }

    return {
      items: tournamentsWithDetails,
      nextCursor,
    };
  },
});

// Get tournament by org and slug
export const getByOrgAndSlug = query({
  args: {
    organizationSlug: v.string(),
    tournamentSlug: v.string(),
  },
  handler: async (ctx, args) => {
    // First get the organization (using index for performance)
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.organizationSlug))
      .first();

    if (!org) return null;

    // Then get the tournament (using compound index for performance)
    const tournament = await ctx.db
      .query("tournaments")
      .withIndex("by_org_slug", (q) =>
        q.eq("organizationId", org._id).eq("slug", args.tournamentSlug)
      )
      .first();

    if (!tournament) return null;

    // Check if tournament is archived
    if (tournament.archivedAt) return null;

    // Get additional details (using indexes for performance)
    const [registrations, phases, currentPhase] = await Promise.all([
      ctx.db
        .query("tournamentRegistrations")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect(),
      ctx.db
        .query("tournamentPhases")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect(),
      tournament.currentPhaseId ? ctx.db.get(tournament.currentPhaseId) : null,
    ]);

    return {
      ...tournament,
      organization: org,
      registrations,
      phases,
      currentPhase,
      _count: {
        registrations: registrations.length,
        phases: phases.length,
      },
    };
  },
});

// Create tournament
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    format: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    maxParticipants: v.optional(v.number()),
    topCutSize: v.optional(v.number()),
    swissRounds: v.optional(v.number()),
    tournamentFormat: v.optional(
      v.union(
        v.literal("swiss_only"),
        v.literal("swiss_with_cut"),
        v.literal("single_elimination"),
        v.literal("double_elimination")
      )
    ),
    roundTimeMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check organization permissions
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check permission to create tournaments in this organization
    await requirePermission(
      ctx,
      user.profile._id,
      PERMISSIONS.TOURNAMENT_CREATE,
      "organization",
      args.organizationId
    );

    // Check slug uniqueness within organization (using compound index for performance)
    const existing = await ctx.db
      .query("tournaments")
      .withIndex("by_org_slug", (q) =>
        q.eq("organizationId", args.organizationId).eq("slug", args.slug)
      )
      .first();

    if (existing) {
      throw new Error("Tournament slug already exists in this organization");
    }

    // Create tournament
    const tournamentId = await ctx.db.insert("tournaments", {
      organizationId: args.organizationId,
      name: args.name,
      slug: args.slug,
      format: args.format,
      status: "draft",
      startDate: args.startDate,
      endDate: args.endDate,
      maxParticipants: args.maxParticipants,
      topCutSize: args.topCutSize,
      swissRounds: args.swissRounds,
      tournamentFormat: args.tournamentFormat,
      roundTimeMinutes: args.roundTimeMinutes || 50,
      rentalTeamPhotosEnabled: true,
      rentalTeamPhotosRequired: false,
      participants: [],
      currentRound: 0,
    });

    // Create default Swiss phase
    if (
      args.tournamentFormat === "swiss_with_cut" ||
      args.tournamentFormat === "swiss_only"
    ) {
      await ctx.db.insert("tournamentPhases", {
        tournamentId,
        name: "Swiss Rounds",
        phaseOrder: 1,
        phaseType: "swiss",
        status: "pending",
        matchFormat: "best_of_3",
        roundTimeMinutes: args.roundTimeMinutes,
        plannedRounds: args.swissRounds,
        currentRound: 0,
      });
    }
    return { id: tournamentId, slug: args.slug };
  },
});

// Get tournament registrations
export const getRegistrations = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    // Include profile data
    const registrationsWithProfiles = await Promise.all(
      registrations.map(async (reg) => {
        const profile = await ctx.db.get(reg.profileId);
        const team = reg.teamId ? await ctx.db.get(reg.teamId) : null;
        return { ...reg, profile, team };
      })
    );

    return registrationsWithProfiles;
  },
});

// Register for tournament
export const register = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    teamName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check if already registered (using compound index for performance)
    const existing = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_profile", (q) =>
        q
          .eq("tournamentId", args.tournamentId)
          .eq("profileId", user.profile!._id)
      )
      .first();

    if (existing) {
      throw new Error("Already registered for this tournament");
    }

    // Check tournament status
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    if (tournament.status !== "upcoming") {
      throw new Error("Tournament is not open for registration");
    }

    // Check permission to register for tournaments
    await requirePermission(
      ctx,
      user.profile!._id,
      PERMISSIONS.TOURNAMENT_REGISTER,
      "tournament",
      args.tournamentId
    );

    // Create registration first, then check max participants atomically
    // This prevents race conditions where multiple users register simultaneously
    const registrationId = await ctx.db.insert("tournamentRegistrations", {
      tournamentId: args.tournamentId,
      profileId: user.profile!._id,
      status: "pending",
      registeredAt: Date.now(),
      teamName: args.teamName,
      notes: args.notes,
      rentalTeamPhotoVerified: false,
    });

    // Check max participants after insertion to prevent race conditions
    if (tournament.maxParticipants) {
      const currentRegs = await ctx.db
        .query("tournamentRegistrations")
        .withIndex("by_tournament", (q) =>
          q.eq("tournamentId", args.tournamentId)
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
