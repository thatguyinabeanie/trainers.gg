import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";
import { enforceRateLimit } from "../lib/rateLimit";
import { z } from "zod";
import type { Id } from "../_generated/dataModel";
import { logTournamentEvent } from "../helpers";

// Zod validation schemas
const registerForTournamentSchema = z.object({
  tournamentId: z.custom<Id<"tournaments">>(),
  teamId: z.custom<Id<"teams">>().optional(),
  teamName: z.string().min(1).max(100).optional(),
  notes: z.string().max(500).optional(),
});

const withdrawFromTournamentSchema = z.object({
  tournamentId: z.custom<Id<"tournaments">>(),
});

export const registerForTournament = mutation({
  args: {
    data: v.object({
      tournamentId: v.id("tournaments"),
      teamId: v.optional(v.id("teams")),
      teamName: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Validate input with Zod
    const validated = registerForTournamentSchema.parse(args.data);

    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Rate limit registration attempts to prevent spam
    await enforceRateLimit(ctx, user.profile._id, "tournament_registration");

    const tournament = await ctx.db.get(validated.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check if registration is open
    if (tournament.status !== "upcoming") {
      throw new Error("Tournament registration is not open");
    }

    if (
      tournament.registrationDeadline &&
      Date.now() > tournament.registrationDeadline
    ) {
      throw new Error("Registration deadline has passed");
    }

    // Check if already registered
    const existingRegistration = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_profile", (q) =>
        q
          .eq("tournamentId", validated.tournamentId)
          .eq("profileId", user.profile!._id)
      )
      .first();

    if (existingRegistration) {
      throw new Error("You are already registered for this tournament");
    }

    // Atomic registration with post-insert verification to handle race conditions
    // While Convex mutations are atomic, multiple concurrent registrations can all
    // check capacity before any complete, leading to over-registration.
    // Solution: Insert optimistically, then verify and adjust if needed.

    const registeredAt = Date.now();

    // Insert registration immediately to claim a spot
    const registrationId = await ctx.db.insert("tournamentRegistrations", {
      tournamentId: validated.tournamentId,
      profileId: user.profile._id,
      status: "registered", // Optimistically register
      teamId: validated.teamId,
      teamName: validated.teamName,
      notes: validated.notes,
      registeredAt,
      rentalTeamPhotoVerified: false,
    });

    // Post-insert verification: Check if we exceeded capacity
    if (tournament.maxParticipants) {
      // Use composite index by_tournament_status_registered for optimal performance
      // This index includes registeredAt, so results are pre-sorted by registration time
      const [registered, checkedIn] = await Promise.all([
        ctx.db
          .query("tournamentRegistrations")
          .withIndex("by_tournament_status_registered", (q) =>
            q
              .eq("tournamentId", validated.tournamentId)
              .eq("status", "registered")
          )
          .collect(),
        ctx.db
          .query("tournamentRegistrations")
          .withIndex("by_tournament_status_registered", (q) =>
            q
              .eq("tournamentId", validated.tournamentId)
              .eq("status", "checked_in")
          )
          .collect(),
      ]);

      const activeRegistrations = [...registered, ...checkedIn];

      // If over capacity, move excess registrations to waitlist
      // Sort by registration time to be fair (first come, first serve)
      if (activeRegistrations.length > tournament.maxParticipants) {
        const sortedByTime = activeRegistrations.sort(
          (a, b) => a.registeredAt - b.registeredAt
        );

        // Keep first maxParticipants as registered, rest go to waitlist
        const toWaitlist = sortedByTime.slice(tournament.maxParticipants);

        // Patch ALL excess registrations to waitlist (not just current user)
        // This ensures data consistency when multiple concurrent registrations exceed capacity
        await Promise.all(
          toWaitlist.map((reg) => ctx.db.patch(reg._id, { status: "waitlist" }))
        );

        // Check if our registration was in the excess
        const ourRegistration = toWaitlist.find(
          (r) => r._id === registrationId
        );

        if (ourRegistration) {
          await logTournamentEvent(
            ctx,
            "registration_waitlisted",
            validated.tournamentId,
            user.profile._id,
            {
              registrationId,
              position: toWaitlist.indexOf(ourRegistration) + 1,
            }
          );

          return {
            success: true,
            registrationId,
            status: "waitlist",
            message:
              "Tournament reached capacity during registration. You've been added to the waitlist.",
          };
        }
      }

      await logTournamentEvent(
        ctx,
        "player_registered",
        validated.tournamentId,
        user.profile._id,
        { registrationId, teamId: validated.teamId || null }
      );
    }

    return {
      success: true,
      registrationId,
      status: "registered",
    };
  },
});

export const withdrawFromTournament = mutation({
  args: {
    data: v.object({
      tournamentId: v.id("tournaments"),
    }),
  },
  handler: async (ctx, args) => {
    // Validate input with Zod
    const validated = withdrawFromTournamentSchema.parse(args.data);

    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    const registration = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_profile", (q) =>
        q
          .eq("tournamentId", validated.tournamentId)
          .eq("profileId", user.profile!._id)
      )
      .first();

    if (!registration) {
      throw new Error("You are not registered for this tournament");
    }

    const tournament = await ctx.db.get(validated.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Don't allow withdrawal if tournament has started
    if (tournament.status === "active" || tournament.status === "completed") {
      throw new Error("Cannot withdraw from an active or completed tournament");
    }

    // Delete the registration
    await ctx.db.delete(registration._id);

    // If someone was on waitlist, promote them
    if (registration.status === "registered" && tournament.maxParticipants) {
      const waitlistEntry = await ctx.db
        .query("tournamentRegistrations")
        .withIndex("by_tournament_status_registered", (q) =>
          q.eq("tournamentId", validated.tournamentId).eq("status", "waitlist")
        )
        .first();

      if (waitlistEntry) {
        await ctx.db.patch(waitlistEntry._id, {
          status: "registered",
        });

        await logTournamentEvent(
          ctx,
          "player_promoted_from_waitlist",
          validated.tournamentId,
          user.profile._id,
          {
            promotedProfileId: waitlistEntry.profileId,
            registrationId: waitlistEntry._id,
          }
        );
      }
    }

    await logTournamentEvent(
      ctx,
      "player_withdrawn",
      validated.tournamentId,
      user.profile._id,
      {
        registrationId: registration._id,
        previousStatus: registration.status,
        teamId: registration.teamId || null,
      }
    );

    return { success: true };
  },
});

export const getRegistrationStatus = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Get all registrations
    const registrations = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    const activeRegistrations = registrations.filter(
      (r) => r.status === "registered" || r.status === "checked_in"
    );
    const waitlistCount = registrations.filter(
      (r) => r.status === "waitlist"
    ).length;

    // Check if user is registered (use already-fetched registrations to avoid N+1 query)
    let userRegistration = null;
    let userWaitlistPosition = null;
    if (user?.profile) {
      // Find user's registration from the existing registrations array
      // This avoids an additional database query (N+1 pattern)
      userRegistration =
        registrations.find((r) => r.profileId === user.profile!._id) || null;

      // If user is on waitlist, calculate their position
      if (userRegistration?.status === "waitlist") {
        const waitlistRegistrations = registrations
          .filter((r) => r.status === "waitlist")
          .sort((a, b) => a.registeredAt - b.registeredAt);

        userWaitlistPosition =
          waitlistRegistrations.findIndex(
            (r) => r.profileId === user.profile!._id
          ) + 1; // +1 because findIndex returns 0-based index
      }
    }

    // Check if registration is open
    const now = Date.now();
    const isRegistrationOpen =
      tournament.status === "upcoming" &&
      (!tournament.registrationDeadline ||
        tournament.registrationDeadline > now);

    const isFull = tournament.maxParticipants
      ? activeRegistrations.length >= tournament.maxParticipants
      : false;

    return {
      tournament: {
        id: tournament._id,
        name: tournament.name,
        status: tournament.status,
        maxParticipants: tournament.maxParticipants || null,
        registrationDeadline: tournament.registrationDeadline || null,
      },
      registrationStats: {
        registered: activeRegistrations.length,
        waitlist: waitlistCount,
        total: registrations.length,
      },
      userStatus: userRegistration
        ? {
            status: userRegistration.status,
            registeredAt: userRegistration.registeredAt,
            teamId: userRegistration.teamId,
            waitlistPosition: userWaitlistPosition,
          }
        : null,
      isRegistrationOpen,
      isFull,
    };
  },
});

export const getUserTeams = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      return [];
    }

    // Get user's teams
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_creator", (q) => q.eq("createdBy", user.profile!._id))
      .collect();

    // Get Pokemon count for each team
    const teamsWithCounts = await Promise.all(
      teams.map(async (team) => {
        const pokemon = await ctx.db
          .query("teamPokemon")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect();

        return {
          ...team,
          pokemonCount: pokemon.length,
        };
      })
    );

    return teamsWithCounts.filter((team) => team.pokemonCount > 0);
  },
});
