import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";
import { enforceRateLimit } from "../lib/rateLimit";
import { z } from "zod";
import type { Id } from "../_generated/dataModel";
import { DEFAULT_CHECK_IN_WINDOW_MINUTES } from "../lib/tournamentConstants";
import { logTournamentEvent } from "../helpers";

// Zod validation schemas
const checkInSchema = z.object({
  tournamentId: z.custom<Id<"tournaments">>(),
});

const undoCheckInSchema = z.object({
  tournamentId: z.custom<Id<"tournaments">>(),
});

export const checkIn = mutation({
  args: {
    data: v.object({
      tournamentId: v.id("tournaments"),
    }),
  },
  handler: async (ctx, args) => {
    // Validate input with Zod
    const validated = checkInSchema.parse(args.data);

    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }
    const profileId = user.profile._id;

    // Rate limit check-in attempts to prevent spam
    await enforceRateLimit(ctx, profileId, "tournament_checkin");

    // Find existing registration
    const registration = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_profile", (q) =>
        q.eq("tournamentId", validated.tournamentId).eq("profileId", profileId)
      )
      .first();

    if (!registration) {
      throw new Error("You are not registered for this tournament");
    }

    if (registration.status === "checked_in") {
      throw new Error("You are already checked in");
    }

    if (registration.status === "dropped") {
      throw new Error("You have dropped from this tournament");
    }

    if (registration.status === "withdrawn") {
      throw new Error("You have withdrawn from this tournament");
    }

    if (registration.status === "waitlist") {
      throw new Error(
        "Cannot check in - you are on the waitlist. You will be notified if a spot opens up."
      );
    }

    // Only registered and confirmed statuses can check in
    if (
      registration.status !== "registered" &&
      registration.status !== "confirmed"
    ) {
      throw new Error(
        `Cannot check in with registration status: ${registration.status}`
      );
    }

    // Get tournament to validate check-in window
    const tournament = await ctx.db.get(validated.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Validate tournament status - only allow check-in for upcoming tournaments
    if (tournament.status !== "upcoming") {
      throw new Error(
        `Cannot check in to tournament with status: ${tournament.status}. Check-in is only available for upcoming tournaments.`
      );
    }

    // Simple check-in window based on tournament start time
    // Check-in opens based on configurable window
    const now = Date.now();
    const checkInWindowMinutes =
      tournament.checkInWindowMinutes || DEFAULT_CHECK_IN_WINDOW_MINUTES;
    const checkInStartTime = tournament.startDate
      ? tournament.startDate - checkInWindowMinutes * 60 * 1000
      : null;
    const checkInEndTime = tournament.startDate || null;

    if (checkInStartTime && now < checkInStartTime) {
      throw new Error("Check-in has not started yet");
    }

    if (checkInEndTime && now > checkInEndTime) {
      throw new Error("Check-in window has closed");
    }

    // Update registration status
    await ctx.db.patch(registration._id, {
      status: "checked_in",
      checkedInAt: Date.now(),
    });

    await logTournamentEvent(
      ctx,
      "player_checked_in",
      validated.tournamentId,
      profileId,
      { registrationId: registration._id }
    );

    return { success: true };
  },
});

export const undoCheckIn = mutation({
  args: {
    data: v.object({
      tournamentId: v.id("tournaments"),
    }),
  },
  handler: async (ctx, args) => {
    // Validate input with Zod
    const validated = undoCheckInSchema.parse(args.data);

    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }
    const profileId = user.profile._id;

    // Find existing registration
    const registration = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_profile", (q) =>
        q.eq("tournamentId", validated.tournamentId).eq("profileId", profileId)
      )
      .first();

    if (!registration) {
      throw new Error("You are not registered for this tournament");
    }

    if (registration.status !== "checked_in") {
      throw new Error("You are not checked in");
    }

    // Get tournament to validate check-in window is still open
    const tournament = await ctx.db.get(validated.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check if check-in window is still open
    const now = Date.now();
    const checkInEndTime = tournament.startDate || null;

    if (checkInEndTime && now > checkInEndTime) {
      throw new Error("Check-in window has closed, cannot undo check-in");
    }

    // Update registration status back to registered
    await ctx.db.patch(registration._id, {
      status: "registered",
      checkedInAt: undefined, // Clear check-in timestamp
    });

    await logTournamentEvent(
      ctx,
      "player_checkin_undone",
      validated.tournamentId,
      profileId,
      { registrationId: registration._id }
    );

    return { success: true };
  },
});

export const getCheckInStatus = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      return {
        isRegistered: false,
        isCheckedIn: false,
        checkInOpen: false,
        checkInStartTime: null,
        checkInEndTime: null,
      };
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    const registration = await ctx.db
      .query("tournamentRegistrations")
      .withIndex("by_tournament_profile", (q) =>
        q
          .eq("tournamentId", args.tournamentId)
          .eq("profileId", user.profile!._id)
      )
      .first();

    const now = Date.now();
    // Check-in opens based on configurable window
    const checkInWindowMinutes =
      tournament.checkInWindowMinutes || DEFAULT_CHECK_IN_WINDOW_MINUTES;
    const checkInStartTime = tournament.startDate
      ? tournament.startDate - checkInWindowMinutes * 60 * 1000
      : null;
    const checkInEndTime = tournament.startDate || null;

    const checkInOpen =
      (!checkInStartTime || now >= checkInStartTime) &&
      (!checkInEndTime || now <= checkInEndTime);

    return {
      isRegistered: !!registration,
      isCheckedIn: registration?.status === "checked_in",
      checkInOpen,
      checkInStartTime,
      checkInEndTime,
      registrationStatus: registration?.status || null,
    };
  },
});

export const getCheckInStats = query({
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

    const total = registrations.length;
    const checkedIn = registrations.filter(
      (r) => r.status === "checked_in"
    ).length;
    const registered = registrations.filter(
      (r) => r.status === "registered"
    ).length;
    const dropped = registrations.filter((r) => r.status === "dropped").length;
    const waitlist = registrations.filter(
      (r) => r.status === "waitlist"
    ).length;

    // Batch fetch profiles to avoid N+1 query pattern
    const checkedInRegs = registrations.filter(
      (r) => r.status === "checked_in"
    );
    const profileIds = checkedInRegs.map((r) => r.profileId);
    const profiles = await Promise.all(profileIds.map((id) => ctx.db.get(id)));
    const profileMap = new Map(profiles.map((p, i) => [profileIds[i], p]));

    const checkedInList = checkedInRegs.map((reg) => ({
      profileId: reg.profileId,
      displayName: profileMap.get(reg.profileId)?.displayName || "Unknown",
      checkedInAt: reg.checkedInAt || reg._creationTime, // Use actual check-in time, fallback to creation time for legacy records
    }));

    return {
      total,
      checkedIn,
      registered,
      dropped,
      waitlist,
      checkedInPercentage:
        total > 0 ? Math.round((checkedIn / total) * 100) : 0,
      checkedInList: checkedInList.sort(
        (a, b) => b.checkedInAt - a.checkedInAt
      ),
    };
  },
});
