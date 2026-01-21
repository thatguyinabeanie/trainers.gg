import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  // Clerk-integrated users table
  users: defineTable({
    // Clerk user ID (primary identifier) - optional during migration
    clerkUserId: v.optional(v.string()),
    // Basic user info from Clerk
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    username: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    // Custom field for linking to profiles
    mainProfileId: v.optional(v.id("profiles")),

    // Timestamps from Clerk
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    lastSignInAt: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),

    // Account status
    isLocked: v.optional(v.boolean()),

    // External OAuth accounts
    externalAccounts: v.optional(
      v.array(
        v.object({
          provider: v.string(),
          providerUserId: v.string(),
          email: v.optional(v.string()),
          username: v.optional(v.string()),
        })
      )
    ),

    // Clerk metadata - flexible JSON object with string keys
    // https://clerk.com/docs/users/metadata
    // Using v.any() here is acceptable for third-party metadata that we don't control
    publicMetadata: v.optional(
      v.record(
        v.string(),
        v.union(v.string(), v.number(), v.boolean(), v.null())
      )
    ),

    // Legacy fields from Convex Auth (optional during migration)
    passwordHash: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
  })
    .index("by_clerk_user", ["clerkUserId"])
    .index("by_email", ["email"])
    .index("by_mainProfile", ["mainProfileId"])
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_username", ["username"])
    .index("by_last_active", ["lastActiveAt"]),

  // ========== User Profiles ==========
  profiles: defineTable({
    userId: v.id("users"), // References Convex Auth users table
    displayName: v.string(),
    username: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    battleTag: v.optional(v.string()),
    // Subscription tier for individual users
    tier: v.optional(
      v.union(
        v.literal("free"),
        v.literal("player_pro"),
        v.literal("coach_premium")
      )
    ),
    tierExpiresAt: v.optional(v.number()), // Unix timestamp for subscription expiry
    tierStartedAt: v.optional(v.number()), // Unix timestamp for subscription start
  })
    .index("by_user", ["userId"])
    .index("by_username", ["username"])
    .index("by_user_display", ["userId", "displayName"])
    .index("by_tier", ["tier"])
    .index("by_tier_expiry", ["tierExpiresAt"]),

  // ========== Organizations & RBAC ==========
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()), // Emoji icon for the organization
    logoUrl: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("rejected")
    ),
    ownerProfileId: v.id("profiles"),
    // Social media and community links
    discordUrl: v.optional(v.string()),
    twitterUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    // Organization tiers for tournament fee structures and features
    tier: v.optional(
      v.union(v.literal("regular"), v.literal("verified"), v.literal("partner"))
    ),
    // Subscription tier for premium organization features
    subscriptionTier: v.optional(
      v.union(
        v.literal("free"),
        v.literal("organization_plus"),
        v.literal("enterprise")
      )
    ),
    subscriptionExpiresAt: v.optional(v.number()),
    subscriptionStartedAt: v.optional(v.number()),
    // Platform fee percentage for tournament entry fees (e.g., 0.05 = 5%)
    platformFeePercentage: v.optional(v.float64()),
  })
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerProfileId"])
    .index("by_tier", ["tier"])
    .index("by_subscription_tier", ["subscriptionTier"])
    .index("by_subscription_expiry", ["subscriptionExpiresAt"]),

  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    profileId: v.id("profiles"),
  })
    .index("by_org", ["organizationId"])
    .index("by_profile", ["profileId"])
    .index("by_org_profile", ["organizationId", "profileId"]),

  organizationInvitations: defineTable({
    organizationId: v.id("organizations"),
    invitedProfileId: v.id("profiles"),
    invitedByProfileId: v.id("profiles"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("expired")
    ),
    expiresAt: v.optional(v.number()),
  })
    .index("by_org", ["organizationId"])
    .index("by_invited", ["invitedProfileId"])
    .index("by_org_invited", ["organizationId", "invitedProfileId"])
    .index("by_invited_status", ["invitedProfileId", "status"]),

  organizationRequests: defineTable({
    requestedByProfileId: v.id("profiles"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    reviewedByProfileId: v.optional(v.id("profiles")),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    createdOrganizationId: v.optional(v.id("organizations")),
  })
    .index("by_requester", ["requestedByProfileId"])
    .index("by_status", ["status"])
    .index("by_slug", ["slug"]),

  groups: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_name", ["organizationId", "name"]),

  roles: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
  }).index("by_name", ["name"]),

  permissions: defineTable({
    key: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  })
    .index("by_key", ["key"])
    .index("by_name", ["name"]),

  groupRoles: defineTable({
    groupId: v.id("groups"),
    roleId: v.id("roles"),
  })
    .index("by_group", ["groupId"])
    .index("by_role", ["roleId"])
    .index("by_group_role", ["groupId", "roleId"]),

  profileGroupRoles: defineTable({
    profileId: v.id("profiles"),
    groupRoleId: v.id("groupRoles"),
  })
    .index("by_profile", ["profileId"])
    .index("by_group_role", ["groupRoleId"])
    .index("by_profile_group_role", ["profileId", "groupRoleId"]),

  rolePermissions: defineTable({
    roleId: v.id("roles"),
    permissionId: v.id("permissions"),
  })
    .index("by_role", ["roleId"])
    .index("by_permission", ["permissionId"])
    .index("by_role_permission", ["roleId", "permissionId"]),

  // ========== Tournaments ==========
  tournaments: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    format: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("upcoming"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    registrationDeadline: v.optional(v.number()),
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
    checkInWindowMinutes: v.optional(v.number()), // Configurable check-in window (default 60)
    featured: v.optional(v.boolean()),
    prizePool: v.optional(v.string()),
    rentalTeamPhotosEnabled: v.boolean(),
    rentalTeamPhotosRequired: v.boolean(),
    templateId: v.optional(v.id("tournamentTemplates")),
    currentPhaseId: v.optional(v.id("tournamentPhases")),
    currentRound: v.number(),
    participants: v.array(v.id("profiles")),
    tournamentState: v.optional(
      v.record(
        v.string(),
        v.union(v.string(), v.number(), v.boolean(), v.null())
      )
    ), // Complex state object - uses record for flexible key-value pairs
    // Archive/soft-delete fields
    archivedAt: v.optional(v.number()), // Timestamp when tournament was archived
    archivedBy: v.optional(v.id("profiles")), // Profile ID of user who archived it
    archiveReason: v.optional(v.string()), // Optional reason for archiving
  })
    .index("by_org", ["organizationId"])
    .index("by_slug", ["slug"])
    .index("by_org_slug", ["organizationId", "slug"])
    .index("by_status", ["status"])
    .index("by_archived", ["archivedAt"]) // Query non-archived tournaments
    .index("by_org_archived", ["organizationId", "archivedAt"]), // Query org's non-archived tournaments

  tournamentPhases: defineTable({
    tournamentId: v.id("tournaments"),
    name: v.string(),
    phaseOrder: v.number(),
    phaseType: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("completed")
    ),
    matchFormat: v.string(),
    roundTimeMinutes: v.optional(v.number()),
    plannedRounds: v.optional(v.number()),
    currentRound: v.number(),
    advancementType: v.optional(v.string()),
    advancementCount: v.optional(v.number()),
    bracketSize: v.optional(v.number()),
    totalRounds: v.optional(v.number()),
    bracketFormat: v.optional(v.string()),
    seedingMethod: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_order", ["tournamentId", "phaseOrder"]),

  tournamentRounds: defineTable({
    phaseId: v.id("tournamentPhases"),
    roundNumber: v.number(),
    name: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("completed")
    ),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    timeExtensionMinutes: v.number(),
  })
    .index("by_phase", ["phaseId"])
    .index("by_phase_number", ["phaseId", "roundNumber"]),

  tournamentMatches: defineTable({
    roundId: v.id("tournamentRounds"),
    profile1Id: v.optional(v.id("profiles")),
    profile2Id: v.optional(v.id("profiles")),
    winnerProfileId: v.optional(v.id("profiles")),
    matchPoints1: v.number(),
    matchPoints2: v.number(),
    gameWins1: v.number(),
    gameWins2: v.number(),
    isBye: v.boolean(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("completed")
    ),
    tableNumber: v.optional(v.number()),
    player1MatchConfirmed: v.boolean(),
    player2MatchConfirmed: v.boolean(),
    matchConfirmedAt: v.optional(v.number()),
    staffRequested: v.boolean(),
    staffRequestedAt: v.optional(v.number()),
    staffResolvedBy: v.optional(v.id("profiles")),
    staffNotes: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  })
    .index("by_round", ["roundId"])
    .index("by_round_status", ["roundId", "status"])
    .index("by_profile1", ["profile1Id"])
    .index("by_profile2", ["profile2Id"])
    .index("by_profile1_status", ["profile1Id", "status"])
    .index("by_profile2_status", ["profile2Id", "status"])
    .index("by_players", ["profile1Id", "profile2Id"]),

  tournamentRegistrations: defineTable({
    tournamentId: v.id("tournaments"),
    profileId: v.id("profiles"),
    status: v.union(
      v.literal("pending"),
      v.literal("registered"),
      v.literal("confirmed"),
      v.literal("waitlist"),
      v.literal("checked_in"),
      v.literal("dropped"),
      v.literal("withdrawn")
    ),
    registeredAt: v.number(),
    checkedInAt: v.optional(v.number()), // When the player actually checked in
    teamName: v.optional(v.string()),
    notes: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    rentalTeamPhotoUrl: v.optional(v.string()),
    rentalTeamPhotoKey: v.optional(v.string()),
    rentalTeamPhotoUploadedAt: v.optional(v.number()),
    rentalTeamPhotoVerified: v.boolean(),
    rentalTeamPhotoVerifiedBy: v.optional(v.id("profiles")),
    rentalTeamPhotoVerifiedAt: v.optional(v.number()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_profile", ["profileId"])
    .index("by_team", ["teamId"])
    .index("by_tournament_profile", ["tournamentId", "profileId"])
    .index("by_tournament_status", ["tournamentId", "status"])
    .index("by_tournament_status_registered", [
      "tournamentId",
      "status",
      "registeredAt",
    ]), // For waitlist position calculations and chronological sorting

  tournamentInvitations: defineTable({
    tournamentId: v.id("tournaments"),
    invitedProfileId: v.id("profiles"),
    invitedByProfileId: v.id("profiles"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("expired")
    ),
    message: v.optional(v.string()), // Personal message from inviter
    expiresAt: v.optional(v.number()), // Unix timestamp when invitation expires
    invitedAt: v.number(), // When invitation was sent
    respondedAt: v.optional(v.number()), // When invitation was accepted/declined
    // Track if invitation led to registration
    registrationId: v.optional(v.id("tournamentRegistrations")),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_invited", ["invitedProfileId"])
    .index("by_inviter", ["invitedByProfileId"])
    .index("by_tournament_invited", ["tournamentId", "invitedProfileId"])
    .index("by_tournament_status", ["tournamentId", "status"])
    .index("by_invited_status", ["invitedProfileId", "status"])
    .index("by_expires", ["expiresAt"]), // For cleanup of expired invitations

  tournamentPlayerStats: defineTable({
    tournamentId: v.id("tournaments"),
    profileId: v.id("profiles"),
    matchPoints: v.number(),
    matchesPlayed: v.number(),
    matchWins: v.number(),
    matchLosses: v.number(),
    matchWinPercentage: v.float64(),
    gameWins: v.number(),
    gameLosses: v.number(),
    gameWinPercentage: v.float64(),
    opponentMatchWinPercentage: v.float64(),
    opponentGameWinPercentage: v.float64(),
    opponentOpponentMatchWinPercentage: v.float64(),
    strengthOfSchedule: v.float64(),
    buchholzScore: v.float64(),
    modifiedBuchholzScore: v.float64(),
    lastTiebreakerUpdate: v.optional(v.number()),
    currentStanding: v.optional(v.number()),
    standingsNeedRecalc: v.boolean(),
    hasReceivedBye: v.boolean(),
    isDropped: v.boolean(),
    currentSeed: v.optional(v.number()),
    finalRanking: v.optional(v.number()),
    opponentHistory: v.array(v.string()),
    roundsPlayed: v.number(),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_profile", ["profileId"])
    .index("by_tournament_profile", ["tournamentId", "profileId"]),

  tournamentPairings: defineTable({
    tournamentId: v.id("tournaments"),
    roundId: v.id("tournamentRounds"),
    matchId: v.optional(v.id("tournamentMatches")),
    profile1Id: v.optional(v.id("profiles")),
    profile2Id: v.optional(v.id("profiles")),
    pairingType: v.string(),
    isBye: v.boolean(),
    tableNumber: v.optional(v.number()),
    profile1Seed: v.optional(v.number()),
    profile2Seed: v.optional(v.number()),
    pairingReason: v.optional(v.string()),
    algorithmNotes: v.optional(v.string()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_round", ["roundId"])
    .index("by_round_profile1", ["roundId", "profile1Id"])
    .index("by_round_profile2", ["roundId", "profile2Id"]),

  tournamentStandings: defineTable({
    tournamentId: v.id("tournaments"),
    profileId: v.id("profiles"),
    roundNumber: v.number(),
    matchPoints: v.number(),
    gameWins: v.number(),
    gameLosses: v.number(),
    matchWinPercentage: v.float64(),
    gameWinPercentage: v.float64(),
    opponentMatchWinPercentage: v.float64(),
    opponentGameWinPercentage: v.float64(),
    rank: v.optional(v.number()),
  })
    .index("by_tournament_round", ["tournamentId", "roundNumber"])
    .index("by_tournament_profile_round", [
      "tournamentId",
      "profileId",
      "roundNumber",
    ]),

  tournamentOpponentHistory: defineTable({
    tournamentId: v.id("tournaments"),
    profileId: v.id("profiles"),
    opponentId: v.id("profiles"),
    roundNumber: v.number(),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_profile", ["tournamentId", "profileId"])
    .index("by_tournament_profile_opponent", [
      "tournamentId",
      "profileId",
      "opponentId",
    ]),

  tournamentEvents: defineTable({
    tournamentId: v.id("tournaments"),
    eventType: v.string(),
    eventData: v.optional(
      v.record(
        v.string(),
        v.union(v.string(), v.number(), v.boolean(), v.null())
      )
    ),
    createdBy: v.optional(v.id("profiles")),
    createdAt: v.number(),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_type", ["eventType"])
    .index("by_tournament_type", ["tournamentId", "eventType"]),

  // ========== Pokemon Teams ==========
  teams: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("profiles"),
    isPublic: v.boolean(),
    formatLegal: v.boolean(),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_creator", ["createdBy"])
    .index("by_public", ["isPublic"]),

  pokemon: defineTable({
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
    formatLegal: v.boolean(),
  }).index("by_species", ["species"]),

  teamPokemon: defineTable({
    teamId: v.id("teams"),
    pokemonId: v.id("pokemon"),
    teamPosition: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_team_position", ["teamId", "teamPosition"])
    .index("by_team_pokemon", ["teamId", "pokemonId"])
    .index("by_pokemon", ["pokemonId"]),

  tournamentRegistrationPokemon: defineTable({
    tournamentRegistrationId: v.id("tournamentRegistrations"),
    pokemonId: v.id("pokemon"),
    teamPosition: v.number(),
  })
    .index("by_registration", ["tournamentRegistrationId"])
    .index("by_registration_position", [
      "tournamentRegistrationId",
      "teamPosition",
    ])
    .index("by_registration_pokemon", [
      "tournamentRegistrationId",
      "pokemonId",
    ]),

  // ========== Subscriptions & Monetization ==========
  subscriptions: defineTable({
    entityId: v.union(v.id("profiles"), v.id("organizations")),
    entityType: v.union(v.literal("profile"), v.literal("organization")),
    tier: v.string(), // The specific tier name (e.g., "player_pro", "organization_plus")
    status: v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("expired"),
      v.literal("past_due")
    ),
    startedAt: v.number(),
    expiresAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    // Stripe subscription ID for payment processing
    stripeSubscriptionId: v.optional(v.string()),
    // Monthly or annual billing
    billingInterval: v.optional(
      v.union(v.literal("monthly"), v.literal("annual"))
    ),
    // Amount in cents (e.g., 999 = $9.99)
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
  })
    .index("by_entity", ["entityId", "entityType"])
    .index("by_status", ["status"])
    .index("by_expiry", ["expiresAt"])
    .index("by_stripe", ["stripeSubscriptionId"]),

  // Track feature usage for tier limits and analytics
  featureUsage: defineTable({
    entityId: v.union(v.id("profiles"), v.id("organizations")),
    entityType: v.union(v.literal("profile"), v.literal("organization")),
    featureKey: v.string(), // e.g., "tournaments_created", "api_calls", "storage_used"
    periodStart: v.number(), // Start of the billing period
    periodEnd: v.number(), // End of the billing period
    usage: v.number(), // Current usage count
    limit: v.optional(v.number()), // Tier-based limit (null = unlimited)
  })
    .index("by_entity", ["entityId", "entityType"])
    .index("by_entity_feature", ["entityId", "entityType", "featureKey"])
    .index("by_period", ["periodStart", "periodEnd"]),

  // ========== Templates ==========
  tournamentTemplates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    isPublic: v.boolean(),
    templateConfig: v.record(
      v.string(),
      v.union(v.string(), v.number(), v.boolean(), v.null())
    ),
    createdBy: v.id("profiles"),
    useCount: v.number(),
    isOfficial: v.boolean(),
    tags: v.array(v.string()),
  })
    .index("by_org", ["organizationId"])
    .index("by_creator", ["createdBy"])
    .index("by_public", ["isPublic"])
    .index("by_official", ["isOfficial"]),

  tournamentTemplatePhases: defineTable({
    templateId: v.id("tournamentTemplates"),
    name: v.string(),
    phaseOrder: v.number(),
    phaseType: v.string(),
    phaseConfig: v.record(
      v.string(),
      v.union(v.string(), v.number(), v.boolean(), v.null())
    ),
  })
    .index("by_template", ["templateId"])
    .index("by_template_order", ["templateId", "phaseOrder"]),

  // ========== LEGACY CONVEX AUTH TABLES (TO BE REMOVED) ==========
  // These tables exist in the database but are no longer used
  // Keep them in schema temporarily to avoid validation errors
  authAccounts: defineTable({
    userId: v.optional(v.id("users")),
    provider: v.optional(v.string()),
    providerAccountId: v.optional(v.string()),
    type: v.optional(v.string()),
    access_token: v.optional(v.string()),
    refresh_token: v.optional(v.string()),
    expires_at: v.optional(v.number()),
    token_type: v.optional(v.string()),
    scope: v.optional(v.string()),
    id_token: v.optional(v.string()),
    session_state: v.optional(v.string()),
  }),

  authSessions: defineTable({
    userId: v.optional(v.id("users")),
    sessionToken: v.optional(v.string()),
    expires: v.optional(v.number()),
  }),

  authVerificationCodes: defineTable({
    accountId: v.optional(v.string()),
    code: v.optional(v.string()),
    expirationTime: v.optional(v.number()),
  }),

  authRefreshTokens: defineTable({
    sessionId: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    expirationTime: v.optional(v.number()),
    parentRefreshTokenId: v.optional(v.string()),
  }),

  authVerifiers: defineTable({
    signature: v.optional(v.string()),
  }),

  authRateLimits: defineTable({
    identifier: v.optional(v.string()),
    count: v.optional(v.number()),
    expirationTime: v.optional(v.number()),
  }),

  // ========== Rate Limiting ==========
  // Database-backed sliding window rate limiter for abuse prevention
  rateLimits: defineTable({
    // Composite key: "userId:action" (e.g., "abc123:tournament_registration")
    identifier: v.string(),
    // Array of request timestamps within the sliding window
    requestTimestamps: v.array(v.number()),
    // Start of the current sliding window (Unix timestamp)
    windowStart: v.number(),
    // When this record can be cleaned up (Unix timestamp)
    expiresAt: v.number(),
  })
    .index("by_identifier", ["identifier"])
    .index("by_expires", ["expiresAt"]),
});

export default schema;
