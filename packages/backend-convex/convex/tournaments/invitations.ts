import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";
import { hasPermission } from "../permissions";
import { PermissionKey } from "../permissionKeys";
import { z } from "zod";
import type { Id } from "../_generated/dataModel";

// Zod validation schemas
const sendTournamentInvitationSchema = z.object({
  tournamentId: z.custom<Id<"tournaments">>(),
  profileIds: z.array(z.custom<Id<"profiles">>()).min(1).max(50), // Limit bulk invitations
  message: z.string().max(500).optional(),
  expiresAt: z.number().optional(),
});

const respondToInvitationSchema = z.object({
  invitationId: z.custom<Id<"tournamentInvitations">>(),
  response: z.enum(["accept", "decline"]),
});

const _bulkInvitePlayersSchema = z.object({
  tournamentId: z.custom<Id<"tournaments">>(),
  filters: z
    .object({
      tier: z.array(z.string()).optional(),
      format: z.array(z.string()).optional(),
      region: z.array(z.string()).optional(),
      minRating: z.number().optional(),
      maxRating: z.number().optional(),
    })
    .optional(),
  message: z.string().max(500).optional(),
  maxInvites: z.number().min(1).max(100).default(25),
});

/**
 * Send tournament invitations to specific players
 */
export const sendTournamentInvitations = mutation({
  args: {
    data: v.object({
      tournamentId: v.id("tournaments"),
      profileIds: v.array(v.id("profiles")),
      message: v.optional(v.string()),
      expiresAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // Validate input with Zod
    const validated = sendTournamentInvitationSchema.parse(args.data);

    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check if user has permission to invite players to this tournament
    const hasInvitePermission = await hasPermission(
      ctx,
      user.profile._id,
      "tournament.invite_players" as PermissionKey
    );

    if (!hasInvitePermission) {
      throw new Error(
        "You do not have permission to invite players to tournaments"
      );
    }

    const tournament = await ctx.db.get(validated.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check if tournament is in a state where invitations can be sent
    if (
      tournament.status === "completed" ||
      tournament.status === "cancelled"
    ) {
      throw new Error(
        "Cannot send invitations to a completed or cancelled tournament"
      );
    }

    // Check if user has permission to manage this specific tournament
    // For now, we'll check if they're part of the organization that owns the tournament
    const organization = await ctx.db.get(tournament.organizationId);
    if (!organization) {
      throw new Error("Tournament organization not found");
    }

    const isMember = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_profile", (q) =>
        q
          .eq("organizationId", organization._id)
          .eq("profileId", user.profile!._id)
      )
      .first();

    const isOwner = organization.ownerProfileId === user.profile._id;

    if (!isMember && !isOwner) {
      throw new Error(
        "You do not have permission to send invitations for this tournament"
      );
    }

    // Validate that all target profiles exist
    const profiles = await Promise.all(
      validated.profileIds.map((profileId) => ctx.db.get(profileId))
    );

    const missingProfiles = profiles
      .map((profile, index) => ({ profile, index }))
      .filter(({ profile }) => !profile)
      .map(({ index }) => validated.profileIds[index]);

    if (missingProfiles.length > 0) {
      throw new Error(`Profile(s) not found: ${missingProfiles.join(", ")}`);
    }

    // Check for existing invitations to avoid duplicates
    const existingInvitations = await Promise.all(
      validated.profileIds.map((profileId) =>
        ctx.db
          .query("tournamentInvitations")
          .withIndex("by_tournament_invited", (q) =>
            q
              .eq("tournamentId", validated.tournamentId)
              .eq("invitedProfileId", profileId)
          )
          .filter((q) =>
            q.or(
              q.eq(q.field("status"), "pending"),
              q.eq(q.field("status"), "accepted")
            )
          )
          .first()
      )
    );

    // Filter out profiles that already have pending or accepted invitations
    const alreadyInvitedProfiles: Id<"profiles">[] = [];
    const newProfileIds: Id<"profiles">[] = [];

    validated.profileIds.forEach((profileId, index) => {
      if (existingInvitations[index]) {
        alreadyInvitedProfiles.push(profileId);
      } else {
        newProfileIds.push(profileId);
      }
    });

    if (newProfileIds.length === 0) {
      throw new Error(
        "All selected players have already been invited or have accepted invitations"
      );
    }

    // Set default expiration (7 days from now)
    const defaultExpiration = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const expiresAt = validated.expiresAt || defaultExpiration;

    // Create invitations for new profiles
    const invitationIds = await Promise.all(
      newProfileIds.map((profileId) =>
        ctx.db.insert("tournamentInvitations", {
          tournamentId: validated.tournamentId,
          invitedProfileId: profileId,
          invitedByProfileId: user.profile!._id,
          status: "pending",
          message: validated.message,
          expiresAt,
          invitedAt: Date.now(),
        })
      )
    );

    return {
      success: true,
      invitationsSent: invitationIds.length,
      alreadyInvited: alreadyInvitedProfiles.length,
      invitationIds,
      skippedProfiles: alreadyInvitedProfiles,
    };
  },
});

/**
 * Respond to a tournament invitation (accept or decline)
 */
export const respondToTournamentInvitation = mutation({
  args: {
    data: v.object({
      invitationId: v.id("tournamentInvitations"),
      response: v.union(v.literal("accept"), v.literal("decline")),
    }),
  },
  handler: async (ctx, args) => {
    // Validate input with Zod
    const validated = respondToInvitationSchema.parse(args.data);

    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    const invitation = await ctx.db.get(validated.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check if this invitation is for the current user
    if (invitation.invitedProfileId !== user.profile._id) {
      throw new Error("You can only respond to your own invitations");
    }

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      throw new Error(
        "This invitation has already been responded to or has expired"
      );
    }

    // Check if invitation has expired
    if (invitation.expiresAt && Date.now() > invitation.expiresAt) {
      // Mark as expired and return error
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("This invitation has expired");
    }

    const tournament = await ctx.db.get(invitation.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Update invitation status
    const newStatus = validated.response === "accept" ? "accepted" : "declined";
    await ctx.db.patch(invitation._id, {
      status: newStatus,
      respondedAt: Date.now(),
    });

    let registrationResult = null;

    // If accepting, automatically register for the tournament
    if (validated.response === "accept") {
      try {
        // Check if already registered
        const existingRegistration = await ctx.db
          .query("tournamentRegistrations")
          .withIndex("by_tournament_profile", (q) =>
            q
              .eq("tournamentId", tournament._id)
              .eq("profileId", user.profile!._id)
          )
          .first();

        if (existingRegistration) {
          // Link invitation to existing registration
          await ctx.db.patch(invitation._id, {
            registrationId: existingRegistration._id,
          });
          registrationResult = {
            status: existingRegistration.status,
            registrationId: existingRegistration._id,
            message: "You were already registered for this tournament",
          };
        } else {
          // Atomic registration with post-insert verification to handle race conditions
          // While Convex mutations are atomic, multiple concurrent invitation acceptances can all
          // check capacity before any complete, leading to over-registration.
          // Solution: Insert optimistically, then verify and adjust if needed.

          const registeredAt = Date.now();

          // Insert registration immediately to claim a spot
          const registrationId = await ctx.db.insert(
            "tournamentRegistrations",
            {
              tournamentId: tournament._id,
              profileId: user.profile._id,
              status: "registered", // Optimistically register
              registeredAt,
              rentalTeamPhotoVerified: false,
            }
          );

          // Link invitation to new registration
          await ctx.db.patch(invitation._id, {
            registrationId,
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
                    .eq("tournamentId", tournament._id)
                    .eq("status", "registered")
                )
                .collect(),
              ctx.db
                .query("tournamentRegistrations")
                .withIndex("by_tournament_status_registered", (q) =>
                  q
                    .eq("tournamentId", tournament._id)
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
                toWaitlist.map((reg) =>
                  ctx.db.patch(reg._id, { status: "waitlist" })
                )
              );

              // Check if our registration was in the excess
              const ourRegistration = toWaitlist.find(
                (r) => r._id === registrationId
              );

              if (ourRegistration) {
                registrationResult = {
                  status: "waitlist",
                  registrationId,
                  message:
                    "Tournament reached capacity. You've been added to the waitlist.",
                };
              } else {
                registrationResult = {
                  status: "registered",
                  registrationId,
                  message: "Successfully registered for the tournament!",
                };
              }
            } else {
              // Within capacity
              registrationResult = {
                status: "registered",
                registrationId,
                message: "Successfully registered for the tournament!",
              };
            }
          } else {
            // No capacity limit
            registrationResult = {
              status: "registered",
              registrationId,
              message: "Successfully registered for the tournament!",
            };
          }
        }
      } catch (error) {
        // If registration fails, revert invitation status
        await ctx.db.patch(invitation._id, {
          status: "pending",
          respondedAt: undefined,
        });
        throw new Error(`Failed to register for tournament: ${error}`);
      }
    }

    return {
      success: true,
      response: validated.response,
      invitation: {
        id: invitation._id,
        status: newStatus,
        tournament: {
          id: tournament._id,
          name: tournament.name,
        },
      },
      registration: registrationResult,
    };
  },
});

/**
 * Get tournament invitations sent by current user (organizer view)
 */
export const getTournamentInvitationsSent = query({
  args: {
    tournamentId: v.optional(v.id("tournaments")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    let invitations;

    if (args.tournamentId !== undefined) {
      // Use compound index when filtering by tournament
      invitations = await ctx.db
        .query("tournamentInvitations")
        .withIndex("by_tournament", (q) =>
          q.eq("tournamentId", args.tournamentId!)
        )
        .filter((q) => q.eq(q.field("invitedByProfileId"), user.profile!._id))
        .order("desc")
        .collect();
    } else {
      // Use inviter index when not filtering by tournament
      invitations = await ctx.db
        .query("tournamentInvitations")
        .withIndex("by_inviter", (q) =>
          q.eq("invitedByProfileId", user.profile!._id)
        )
        .order("desc")
        .collect();
    }

    // Enrich with tournament and profile data
    const enrichedInvitations = await Promise.all(
      invitations.map(async (invitation) => {
        const [tournament, invitedProfile] = await Promise.all([
          ctx.db.get(invitation.tournamentId),
          ctx.db.get(invitation.invitedProfileId),
        ]);

        return {
          ...invitation,
          tournament: tournament
            ? {
                id: tournament._id,
                name: tournament.name,
                status: tournament.status,
              }
            : null,
          invitedPlayer: invitedProfile
            ? {
                id: invitedProfile._id,
                username: invitedProfile.username,
                displayName: invitedProfile.displayName,
                avatarUrl: invitedProfile.avatarUrl,
              }
            : null,
        };
      })
    );

    return enrichedInvitations.filter(
      (invitation) => invitation.tournament && invitation.invitedPlayer
    );
  },
});

/**
 * Get tournament invitations received by current user (player view)
 */
export const getTournamentInvitationsReceived = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("declined"),
        v.literal("expired")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      return [];
    }

    let invitations;

    if (args.status !== undefined) {
      // Use compound index when filtering by status
      invitations = await ctx.db
        .query("tournamentInvitations")
        .withIndex("by_invited_status", (q) =>
          q.eq("invitedProfileId", user.profile!._id).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else {
      // Use invited index when not filtering by status
      invitations = await ctx.db
        .query("tournamentInvitations")
        .withIndex("by_invited", (q) =>
          q.eq("invitedProfileId", user.profile!._id)
        )
        .order("desc")
        .collect();
    }

    // Enrich with tournament and inviter data
    const enrichedInvitations = await Promise.all(
      invitations.map(async (invitation) => {
        const [tournament, inviterProfile] = await Promise.all([
          ctx.db.get(invitation.tournamentId),
          ctx.db.get(invitation.invitedByProfileId),
        ]);

        // Check if invitation has expired
        const isExpired =
          invitation.expiresAt && Date.now() > invitation.expiresAt;

        return {
          ...invitation,
          isExpired,
          tournament: tournament
            ? {
                id: tournament._id,
                name: tournament.name,
                status: tournament.status,
                format: tournament.format,
                startDate: tournament.startDate,
                organizationId: tournament.organizationId,
              }
            : null,
          invitedBy: inviterProfile
            ? {
                id: inviterProfile._id,
                username: inviterProfile.username,
                displayName: inviterProfile.displayName,
                avatarUrl: inviterProfile.avatarUrl,
              }
            : null,
        };
      })
    );

    return enrichedInvitations.filter(
      (invitation) => invitation.tournament && invitation.invitedBy
    );
  },
});

/**
 * Get tournament invitations overview for a specific tournament
 */
export const getTournamentInvitationsOverview = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check if user has permission to view tournament invitations
    const organization = await ctx.db.get(tournament.organizationId);
    if (!organization) {
      throw new Error("Tournament organization not found");
    }

    const isMember = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_profile", (q) =>
        q
          .eq("organizationId", organization._id)
          .eq("profileId", user.profile!._id)
      )
      .first();

    const isOwner = organization.ownerProfileId === user.profile._id;

    if (!isMember && !isOwner) {
      throw new Error(
        "You do not have permission to view invitations for this tournament"
      );
    }

    // Get all invitations for this tournament
    const invitations = await ctx.db
      .query("tournamentInvitations")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    // Group by status
    const stats = {
      pending: invitations.filter((i) => i.status === "pending").length,
      accepted: invitations.filter((i) => i.status === "accepted").length,
      declined: invitations.filter((i) => i.status === "declined").length,
      expired: invitations.filter((i) => i.status === "expired").length,
      total: invitations.length,
    };

    return {
      tournamentId: args.tournamentId,
      stats,
      recentInvitations: invitations
        .sort((a, b) => b.invitedAt - a.invitedAt)
        .slice(0, 10),
    };
  },
});

/**
 * Cleanup expired invitations (can be called periodically)
 */
export const cleanupExpiredInvitations = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expiredInvitations = await ctx.db
      .query("tournamentInvitations")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Mark all expired invitations as expired
    await Promise.all(
      expiredInvitations.map((invitation) =>
        ctx.db.patch(invitation._id, { status: "expired" })
      )
    );

    return {
      success: true,
      expiredCount: expiredInvitations.length,
    };
  },
});
