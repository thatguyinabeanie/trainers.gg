import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * COMPREHENSIVE SEED DATA FOR DEVELOPMENT
 * This mutation creates a fully functional application with realistic data
 * for every piece of the application to develop and test against.
 *
 * ⚠️ FOR DEVELOPMENT ONLY - NEVER RUN IN PRODUCTION
 */

export const seedComprehensiveData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 🚨 CRITICAL: Prevent running in production OR preview environments
    // Seeding must be explicitly enabled via ENABLE_SEEDING environment variable
    if (process.env.ENABLE_SEEDING !== "true") {
      throw new Error(
        "🚨 PRODUCTION SAFETY: Seeding is DISABLED. Set ENABLE_SEEDING=true environment variable in Convex dashboard for development deployments only. NEVER enable in production or preview.",
      );
    }

    console.log("🌱 Starting comprehensive data seeding (idempotent)...");

    const stats = {
      users: 0,
      usersUpdated: 0,
      profiles: 0,
      profilesUpdated: 0,
      organizations: 0,
      organizationsUpdated: 0,
      tournaments: 0,
      tournamentsUpdated: 0,
      registrations: 0,
      matches: 0,
      teams: 0,
    };

    // === STEP 1: Create Users and Profiles ===
    console.log("👥 Creating users and profiles...");

    const userProfiles: Array<{
      userId: Id<"users">;
      profileId: Id<"profiles">;
      email: string;
      userType: string;
    }> = [];

    const usersData = [
      // Admins
      {
        email: "admin@battlestadium.local",
        name: "Site Admin",
        username: "admin",
        displayName: "Site Administrator",
        userType: "admin",
        tier: "free" as const,
      },
      {
        email: "superadmin@battlestadium.local",
        name: "Super Admin",
        username: "superadmin",
        displayName: "Super Administrator",
        userType: "admin",
        tier: "free" as const,
      },

      // Tournament Organizers
      {
        email: "organizer1@battlestadium.local",
        name: "Sarah Chen",
        username: "organizer1",
        displayName: "Sarah Chen",
        userType: "organizer",
        tier: "player_pro" as const,
      },
      {
        email: "organizer2@battlestadium.local",
        name: "Marcus Rodriguez",
        username: "organizer2",
        displayName: "Marcus Rodriguez",
        userType: "organizer",
        tier: "free" as const,
      },
      {
        email: "organizer3@battlestadium.local",
        name: "Emma Thompson",
        username: "organizer3",
        displayName: "Emma Thompson",
        userType: "organizer",
        tier: "player_pro" as const,
      },
      {
        email: "organizer4@battlestadium.local",
        name: "David Kim",
        username: "organizer4",
        displayName: "David Kim",
        userType: "organizer",
        tier: "free" as const,
      },

      // Tournament Judges/Staff
      {
        email: "judge1@battlestadium.local",
        name: "Judge Williams",
        username: "judge1",
        displayName: "Judge Williams",
        userType: "judge",
        tier: "free" as const,
      },
      {
        email: "judge2@battlestadium.local",
        name: "Judge Martinez",
        username: "judge2",
        displayName: "Judge Martinez",
        userType: "judge",
        tier: "free" as const,
      },
      {
        email: "staff1@battlestadium.local",
        name: "Staff Member",
        username: "staff1",
        displayName: "Tournament Staff",
        userType: "staff",
        tier: "free" as const,
      },

      // Competitive Players (varied skill levels)
      {
        email: "player1@battlestadium.local",
        name: 'Alex "Apex" Johnson',
        username: "apex_alex",
        displayName: "Apex Alex",
        userType: "competitive",
        tier: "player_pro" as const,
      },
      {
        email: "player2@battlestadium.local",
        name: 'Riley "Storm" Lee',
        username: "storm_riley",
        displayName: "Storm Riley",
        userType: "competitive",
        tier: "player_pro" as const,
      },
      {
        email: "player3@battlestadium.local",
        name: 'Jordan "Phoenix" Taylor',
        username: "phoenix_jordan",
        displayName: "Phoenix Jordan",
        userType: "competitive",
        tier: "free" as const,
      },
      {
        email: "player4@battlestadium.local",
        name: 'Morgan "Blaze" Davis',
        username: "blaze_morgan",
        displayName: "Blaze Morgan",
        userType: "competitive",
        tier: "player_pro" as const,
      },
      {
        email: "player5@battlestadium.local",
        name: 'Casey "Thunder" Wilson',
        username: "thunder_casey",
        displayName: "Thunder Casey",
        userType: "competitive",
        tier: "free" as const,
      },
      {
        email: "player6@battlestadium.local",
        name: 'Sam "Frost" Anderson',
        username: "frost_sam",
        displayName: "Frost Sam",
        userType: "competitive",
        tier: "free" as const,
      },
      {
        email: "player7@battlestadium.local",
        name: 'Jamie "Vortex" Brown',
        username: "vortex_jamie",
        displayName: "Vortex Jamie",
        userType: "competitive",
        tier: "player_pro" as const,
      },
      {
        email: "player8@battlestadium.local",
        name: 'Taylor "Nova" Garcia',
        username: "nova_taylor",
        displayName: "Nova Taylor",
        userType: "competitive",
        tier: "free" as const,
      },
      {
        email: "player9@battlestadium.local",
        name: 'Drew "Eclipse" Martinez',
        username: "eclipse_drew",
        displayName: "Eclipse Drew",
        userType: "competitive",
        tier: "free" as const,
      },
      {
        email: "player10@battlestadium.local",
        name: 'Quinn "Zephyr" Lopez',
        username: "zephyr_quinn",
        displayName: "Zephyr Quinn",
        userType: "competitive",
        tier: "free" as const,
      },

      // Casual/New Players
      {
        email: "newbie1@battlestadium.local",
        name: "Chris Newbie",
        username: "newbie1",
        displayName: "ChrisN",
        userType: "casual",
        tier: "free" as const,
      },
      {
        email: "newbie2@battlestadium.local",
        name: "Pat Starter",
        username: "newbie2",
        displayName: "PatS",
        userType: "casual",
        tier: "free" as const,
      },
      {
        email: "newbie3@battlestadium.local",
        name: "Terry Beginner",
        username: "newbie3",
        displayName: "TerryB",
        userType: "casual",
        tier: "free" as const,
      },

      // Content Creators/Coaches
      {
        email: "coach1@battlestadium.local",
        name: "Coach Jessica",
        username: "coach_jess",
        displayName: "Coach Jess",
        userType: "coach",
        tier: "coach_premium" as const,
      },
      {
        email: "coach2@battlestadium.local",
        name: "Coach Ryan",
        username: "coach_ryan",
        displayName: "Coach Ryan",
        userType: "coach",
        tier: "coach_premium" as const,
      },
      {
        email: "streamer1@battlestadium.local",
        name: "Streamer Mike",
        username: "streamer_mike",
        displayName: "StreamMike",
        userType: "streamer",
        tier: "player_pro" as const,
      },
    ];

    for (const userData of usersData) {
      // Check if user already exists by email
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", userData.email))
        .first();

      let userId: Id<"users">;
      if (existingUser) {
        // Update existing user
        await ctx.db.patch(existingUser._id, {
          name: userData.name,
          username: userData.username,
          updatedAt: Date.now(),
        });
        userId = existingUser._id;
        stats.usersUpdated++;
      } else {
        // Create new user
        userId = await ctx.db.insert("users", {
          clerkUserId: `clerk_${userData.email.replace("@", "_").replace(".", "_")}`,
          name: userData.name,
          email: userData.email,
          username: userData.username,
          createdAt: Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000, // Random date in last 90 days
          updatedAt: Date.now(),
          lastSignInAt: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // Last 7 days
          lastActiveAt: Date.now() - Math.random() * 24 * 60 * 60 * 1000, // Last 24 hours
        });
        stats.users++;
      }

      // Check if profile already exists
      const existingProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      let profileId: Id<"profiles">;
      if (existingProfile) {
        // Update existing profile
        await ctx.db.patch(existingProfile._id, {
          username: userData.username,
          displayName: userData.displayName,
          tier: userData.tier,
        });
        profileId = existingProfile._id;
        stats.profilesUpdated++;
      } else {
        // Create new profile
        profileId = await ctx.db.insert("profiles", {
          userId,
          username: userData.username,
          displayName: userData.displayName,
          tier: userData.tier,
          bio:
            userData.userType === "competitive"
              ? `Competitive VGC player specializing in ${["Rain", "Sun", "Trick Room", "Hyper Offense", "Balance"][Math.floor(Math.random() * 5)]} teams`
              : undefined,
        });
        stats.profiles++;
      }

      userProfiles.push({
        userId,
        profileId,
        email: userData.email,
        userType: userData.userType,
      });
    }

    console.log(
      `✅ Users: ${stats.users} created, ${stats.usersUpdated} updated | Profiles: ${stats.profiles} created, ${stats.profilesUpdated} updated`,
    );

    // === STEP 2: Create Organizations ===
    console.log("🏢 Creating organizations...");

    const organizations: Array<{
      id: Id<"organizations">;
      name: string;
      ownerEmail: string;
      status: string;
    }> = [];

    const orgsData = [
      {
        name: "Pokémon Masters League",
        slug: "pokemon-masters-league",
        description:
          "Premier competitive VGC tournament organization hosting weekly and monthly events",
        ownerEmail: "organizer1@battlestadium.local",
        status: "active" as const,
        tier: "partner" as const,
        discordUrl: "https://discord.gg/pokemonmasters",
        twitterUrl: "https://twitter.com/pokemonmasters",
        websiteUrl: "https://pokemonmasters.gg",
      },
      {
        name: "Grassroots Gaming Community",
        slug: "grassroots-gaming",
        description:
          "Community-driven tournaments for players of all skill levels",
        ownerEmail: "organizer2@battlestadium.local",
        status: "active" as const,
        tier: "verified" as const,
        discordUrl: "https://discord.gg/grassrootsgaming",
        twitterUrl: "https://twitter.com/grassrootsgaming",
      },
      {
        name: "Competitive Trainers United",
        slug: "competitive-trainers",
        description:
          "Elite competitive Pokemon battles and strategy discussions",
        ownerEmail: "organizer3@battlestadium.local",
        status: "active" as const,
        tier: "verified" as const,
        discordUrl: "https://discord.gg/competitivetrainers",
        websiteUrl: "https://competitivetrainers.com",
      },
      {
        name: "Discord VGC Hub",
        slug: "discord-vgc-hub",
        description: "Large Discord community hosting daily tournaments",
        ownerEmail: "organizer4@battlestadium.local",
        status: "active" as const,
        tier: "regular" as const,
        discordUrl: "https://discord.gg/vgchub",
      },
      {
        name: "Regional Championship Series",
        slug: "regional-championship",
        description: "Official regional championship qualifiers",
        ownerEmail: "admin@battlestadium.local",
        status: "active" as const,
        tier: "partner" as const,
        twitterUrl: "https://twitter.com/regionalchamps",
        websiteUrl: "https://regionalchampionshipseries.com",
      },
      {
        name: "Casual Friday Battles",
        slug: "casual-friday",
        description: "Friendly weekly tournaments for casual players",
        ownerEmail: "organizer2@battlestadium.local",
        status: "active" as const,
        tier: "regular" as const,
        discordUrl: "https://discord.gg/casualfriday",
      },
      {
        name: "Pending Org Request",
        slug: "pending-org",
        description: "This organization is awaiting approval",
        ownerEmail: "newbie1@battlestadium.local",
        status: "pending" as const,
        tier: "regular" as const,
      },
    ];

    for (const orgData of orgsData) {
      const owner = userProfiles.find((u) => u.email === orgData.ownerEmail);
      if (!owner) continue;

      // Check if organization already exists (idempotency)
      const existingOrg = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", orgData.slug))
        .first();

      let orgId: Id<"organizations">;
      if (existingOrg) {
        // Update existing organization
        await ctx.db.patch(existingOrg._id, {
          name: orgData.name,
          description: orgData.description,
          ownerProfileId: owner.profileId,
          status: orgData.status,
          tier: orgData.tier,
          discordUrl: orgData.discordUrl,
          twitterUrl: orgData.twitterUrl,
          websiteUrl: orgData.websiteUrl,
          subscriptionTier:
            orgData.tier === "partner"
              ? "enterprise"
              : orgData.tier === "verified"
                ? "organization_plus"
                : "free",
        });
        orgId = existingOrg._id;
        stats.organizationsUpdated++;
      } else {
        // Create new organization
        orgId = await ctx.db.insert("organizations", {
          name: orgData.name,
          slug: orgData.slug,
          description: orgData.description,
          ownerProfileId: owner.profileId,
          status: orgData.status,
          tier: orgData.tier,
          discordUrl: orgData.discordUrl,
          twitterUrl: orgData.twitterUrl,
          websiteUrl: orgData.websiteUrl,
          subscriptionTier:
            orgData.tier === "partner"
              ? "enterprise"
              : orgData.tier === "verified"
                ? "organization_plus"
                : "free",
        });
        stats.organizations++;
      }

      // Add owner as member (only if not already a member)
      const existingMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_profile", (q) =>
          q.eq("organizationId", orgId).eq("profileId", owner.profileId),
        )
        .first();

      if (!existingMembership) {
        await ctx.db.insert("organizationMembers", {
          organizationId: orgId,
          profileId: owner.profileId,
        });
      }

      organizations.push({
        id: orgId,
        name: orgData.name,
        ownerEmail: orgData.ownerEmail,
        status: orgData.status,
      });

      // Add staff members to larger orgs with proper RBAC roles
      if (orgData.tier === "partner" || orgData.tier === "verified") {
        // Get roles
        const adminRole = await ctx.db
          .query("roles")
          .withIndex("by_name", (q) => q.eq("name", "Admin"))
          .first();

        const judgeRole = await ctx.db
          .query("roles")
          .withIndex("by_name", (q) => q.eq("name", "Judge"))
          .first();

        const tournamentDirectorRole = await ctx.db
          .query("roles")
          .withIndex("by_name", (q) => q.eq("name", "Tournament Director"))
          .first();

        // Create staff group
        const staffGroupId = await ctx.db.insert("groups", {
          organizationId: orgId,
          name: "Staff",
          description: "Tournament staff and administrators",
        });

        // Create admin group
        const adminGroupId = await ctx.db.insert("groups", {
          organizationId: orgId,
          name: "Administrators",
          description: "Organization administrators",
        });

        // Add judges as staff
        const judges = userProfiles
          .filter((u) => u.userType === "judge")
          .slice(0, 2);
        for (const judge of judges) {
          await ctx.db.insert("organizationMembers", {
            organizationId: orgId,
            profileId: judge.profileId,
          });

          if (judgeRole) {
            const groupRoleId = await ctx.db.insert("groupRoles", {
              groupId: staffGroupId,
              roleId: judgeRole._id,
            });

            await ctx.db.insert("profileGroupRoles", {
              profileId: judge.profileId,
              groupRoleId,
            });
          }
        }

        // Add staff members with Tournament Director role
        const staffMembers = userProfiles
          .filter((u) => u.userType === "staff")
          .slice(0, 1);
        for (const staff of staffMembers) {
          await ctx.db.insert("organizationMembers", {
            organizationId: orgId,
            profileId: staff.profileId,
          });

          if (tournamentDirectorRole) {
            const groupRoleId = await ctx.db.insert("groupRoles", {
              groupId: staffGroupId,
              roleId: tournamentDirectorRole._id,
            });

            await ctx.db.insert("profileGroupRoles", {
              profileId: staff.profileId,
              groupRoleId,
            });
          }
        }

        // Add an admin to larger orgs
        if (orgData.tier === "partner") {
          const adminUser = userProfiles.find(
            (u) => u.userType === "organizer" && u.email !== orgData.ownerEmail,
          );
          if (adminUser && adminRole) {
            await ctx.db.insert("organizationMembers", {
              organizationId: orgId,
              profileId: adminUser.profileId,
            });

            const groupRoleId = await ctx.db.insert("groupRoles", {
              groupId: adminGroupId,
              roleId: adminRole._id,
            });

            await ctx.db.insert("profileGroupRoles", {
              profileId: adminUser.profileId,
              groupRoleId,
            });
          }
        }
      }

      // Add some players as members
      const playerMembers = userProfiles
        .filter((u) => u.userType === "competitive" || u.userType === "casual")
        .slice(0, 10);
      for (const player of playerMembers) {
        const existing = await ctx.db
          .query("organizationMembers")
          .withIndex("by_org_profile", (q) =>
            q.eq("organizationId", orgId).eq("profileId", player.profileId),
          )
          .first();

        if (!existing) {
          await ctx.db.insert("organizationMembers", {
            organizationId: orgId,
            profileId: player.profileId,
          });
        }
      }
    }

    console.log(`✅ Created ${stats.organizations} organizations`);

    // === STEP 3: Create Tournaments in Various States ===
    console.log("🏆 Creating tournaments...");

    const activeOrgs = organizations.filter((o) => o.status === "active");
    const players = userProfiles.filter(
      (u) => u.userType === "competitive" || u.userType === "casual",
    );

    const tournamentsData = [
      // Completed Tournaments
      {
        name: "Winter Championship 2024",
        status: "completed" as const,
        format: "VGC 2024 Reg F",
        orgIndex: 0,
        registrants: 16,
        daysAgo: 14,
      },
      {
        name: "November Monthly Finals",
        status: "completed" as const,
        format: "VGC 2024 Reg F",
        orgIndex: 1,
        registrants: 32,
        daysAgo: 21,
      },
      {
        name: "Halloween Spooky Cup",
        status: "completed" as const,
        format: "VGC 2024 Reg E",
        orgIndex: 2,
        registrants: 24,
        daysAgo: 60,
      },
      {
        name: "September Qualifier",
        status: "completed" as const,
        format: "VGC 2024 Reg E",
        orgIndex: 0,
        registrants: 32,
        daysAgo: 90,
      },

      // Active Tournaments
      {
        name: "Weekly Swiss Tournament #47",
        status: "active" as const,
        format: "VGC 2025 Reg A",
        orgIndex: 0,
        registrants: 28,
        daysAgo: 0,
      },
      {
        name: "Friday Night Battles",
        status: "active" as const,
        format: "VGC 2025 Reg A",
        orgIndex: 3,
        registrants: 16,
        daysAgo: 0,
      },

      // Upcoming Tournaments
      {
        name: "January Major Qualifier",
        status: "upcoming" as const,
        format: "VGC 2025 Reg A",
        orgIndex: 0,
        registrants: 42,
        daysAgo: -7,
      },
      {
        name: "New Year Championship",
        status: "upcoming" as const,
        format: "VGC 2025 Reg A",
        orgIndex: 4,
        registrants: 64,
        daysAgo: -14,
      },
      {
        name: "Grassroots Open #12",
        status: "upcoming" as const,
        format: "VGC 2025 Reg A",
        orgIndex: 1,
        registrants: 20,
        daysAgo: -3,
      },
      {
        name: "Weekend Warrior Cup",
        status: "upcoming" as const,
        format: "VGC 2025 Reg A",
        orgIndex: 2,
        registrants: 16,
        daysAgo: -2,
      },

      // Draft Tournaments
      {
        name: "February Circuit Planning",
        status: "draft" as const,
        format: "VGC 2025 Reg A",
        orgIndex: 0,
        registrants: 0,
        daysAgo: -30,
      },
      {
        name: "Spring Season Prep",
        status: "draft" as const,
        format: "VGC 2025 Reg B",
        orgIndex: 1,
        registrants: 0,
        daysAgo: -45,
      },
    ];

    const tournaments: Array<{
      id: Id<"tournaments">;
      name: string;
      status: string;
      orgId: Id<"organizations">;
      registrantIds: Id<"profiles">[];
    }> = [];

    for (const tourney of tournamentsData) {
      if (tourney.orgIndex >= activeOrgs.length) continue;

      const org = activeOrgs[tourney.orgIndex];
      if (!org) continue;

      const startDate = Date.now() + tourney.daysAgo * 24 * 60 * 60 * 1000;

      const tournamentId = await ctx.db.insert("tournaments", {
        organizationId: org.id,
        name: tourney.name,
        slug: tourney.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        format: tourney.format,
        status: tourney.status,
        startDate,
        endDate:
          tourney.status === "completed"
            ? startDate + 2 * 24 * 60 * 60 * 1000
            : undefined,
        maxParticipants: 64,
        tournamentFormat: "swiss_with_cut",
        swissRounds: 5,
        topCutSize: 8,
        roundTimeMinutes: 50,
        rentalTeamPhotosEnabled: false,
        rentalTeamPhotosRequired: false,
        currentRound:
          tourney.status === "completed"
            ? 7
            : tourney.status === "active"
              ? 3
              : 0,
        participants: [],
      });

      // Register players
      const registrantCount = Math.min(tourney.registrants, players.length);
      const registrants = players.slice(0, registrantCount);
      const registrantIds: Id<"profiles">[] = [];

      for (let i = 0; i < registrants.length; i++) {
        const player = registrants[i];
        if (!player) continue;

        await ctx.db.insert("tournamentRegistrations", {
          tournamentId,
          profileId: player.profileId,
          status: "confirmed",
          registeredAt: startDate - Math.random() * 7 * 24 * 60 * 60 * 1000,
          rentalTeamPhotoVerified: false,
        });

        registrantIds.push(player.profileId);
        stats.registrations++;
      }

      tournaments.push({
        id: tournamentId,
        name: tourney.name,
        status: tourney.status,
        orgId: org.id,
        registrantIds,
      });

      stats.tournaments++;
    }

    console.log(
      `✅ Created ${stats.tournaments} tournaments with ${stats.registrations} registrations`,
    );

    // === STEP 4: Create Tournament Phases, Rounds, and Matches ===
    console.log("⚔️  Creating tournament phases, rounds, and matches...");

    const completedTournaments = tournaments.filter(
      (t) => t.status === "completed",
    );
    const activeTournaments = tournaments.filter((t) => t.status === "active");

    for (const tournament of [...completedTournaments, ...activeTournaments]) {
      // Create Swiss Phase
      const swissPhaseId = await ctx.db.insert("tournamentPhases", {
        tournamentId: tournament.id,
        name: "Swiss Rounds",
        phaseOrder: 1,
        phaseType: "swiss",
        status: tournament.status === "completed" ? "completed" : "active",
        matchFormat: "best_of_3",
        plannedRounds: 5,
        currentRound: tournament.status === "completed" ? 5 : 3,
        startedAt:
          Date.now() -
          (tournament.status === "completed"
            ? 14 * 24 * 60 * 60 * 1000
            : 2 * 60 * 60 * 1000),
        completedAt:
          tournament.status === "completed"
            ? Date.now() - 13 * 24 * 60 * 60 * 1000
            : undefined,
      });

      // Create 5 Swiss rounds
      for (let roundNum = 1; roundNum <= 5; roundNum++) {
        const roundStatus =
          tournament.status === "completed"
            ? "completed"
            : roundNum < 3
              ? "completed"
              : roundNum === 3
                ? "active"
                : "pending";

        const roundId = await ctx.db.insert("tournamentRounds", {
          phaseId: swissPhaseId,
          roundNumber: roundNum,
          name: `Round ${roundNum}`,
          status: roundStatus,
          startTime:
            roundStatus !== "pending"
              ? Date.now() - (5 - roundNum) * 60 * 60 * 1000
              : undefined,
          endTime:
            roundStatus === "completed"
              ? Date.now() - ((5 - roundNum) * 60 * 60 * 1000 - 50 * 60 * 1000)
              : undefined,
          timeExtensionMinutes: 0,
        });

        // Create matches for this round (pair players randomly)
        if (roundStatus !== "pending") {
          const matchCount = Math.floor(tournament.registrantIds.length / 2);

          for (let matchNum = 0; matchNum < matchCount; matchNum++) {
            const player1Idx = matchNum * 2;
            const player2Idx = matchNum * 2 + 1;

            if (
              player1Idx >= tournament.registrantIds.length ||
              player2Idx >= tournament.registrantIds.length
            )
              break;

            const player1Id = tournament.registrantIds[player1Idx];
            const player2Id = tournament.registrantIds[player2Idx];
            const winnerId = Math.random() > 0.5 ? player1Id : player2Id;
            const isCompleted = roundStatus === "completed";

            await ctx.db.insert("tournamentMatches", {
              roundId,
              profile1Id: player1Id,
              profile2Id: player2Id,
              winnerProfileId: isCompleted ? winnerId : undefined,
              matchPoints1: isCompleted ? (winnerId === player1Id ? 3 : 0) : 0,
              matchPoints2: isCompleted ? (winnerId === player2Id ? 3 : 0) : 0,
              gameWins1: isCompleted
                ? winnerId === player1Id
                  ? 2
                  : Math.floor(Math.random() * 2)
                : 0,
              gameWins2: isCompleted
                ? winnerId === player2Id
                  ? 2
                  : Math.floor(Math.random() * 2)
                : 0,
              isBye: false,
              status: isCompleted ? "completed" : "active",
              tableNumber: matchNum + 1,
              player1MatchConfirmed: isCompleted,
              player2MatchConfirmed: isCompleted,
              matchConfirmedAt: isCompleted
                ? Date.now() -
                  ((5 - roundNum) * 60 * 60 * 1000 - 45 * 60 * 1000)
                : undefined,
              staffRequested: false,
              startTime: Date.now() - (5 - roundNum) * 60 * 60 * 1000,
              endTime: isCompleted
                ? Date.now() -
                  ((5 - roundNum) * 60 * 60 * 1000 - 40 * 60 * 1000)
                : undefined,
            });

            stats.matches++;
          }
        }
      }

      // Create Top Cut Phase for completed tournaments
      if (tournament.status === "completed") {
        const topCutPhaseId = await ctx.db.insert("tournamentPhases", {
          tournamentId: tournament.id,
          name: "Top 8 Bracket",
          phaseOrder: 2,
          phaseType: "single_elimination",
          status: "completed",
          matchFormat: "best_of_3",
          currentRound: 3,
          bracketSize: 8,
          totalRounds: 3,
          startedAt: Date.now() - 13 * 24 * 60 * 60 * 1000,
          completedAt:
            Date.now() - 13 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000,
        });

        // Create Top 8 rounds (Quarterfinals, Semifinals, Finals)
        const topCutRounds = ["Quarterfinals", "Semifinals", "Finals"];
        const topPlayers = tournament.registrantIds.slice(0, 8);

        for (let roundIdx = 0; roundIdx < topCutRounds.length; roundIdx++) {
          const roundId = await ctx.db.insert("tournamentRounds", {
            phaseId: topCutPhaseId,
            roundNumber: roundIdx + 1,
            name: topCutRounds[roundIdx],
            status: "completed",
            startTime:
              Date.now() - 13 * 24 * 60 * 60 * 1000 + roundIdx * 90 * 60 * 1000,
            endTime:
              Date.now() -
              13 * 24 * 60 * 60 * 1000 +
              (roundIdx + 1) * 90 * 60 * 1000,
            timeExtensionMinutes: 0,
          });

          const matchesThisRound = Math.pow(2, 2 - roundIdx); // 4, 2, 1

          for (let matchIdx = 0; matchIdx < matchesThisRound; matchIdx++) {
            const player1Id = topPlayers[matchIdx * 2];
            const player2Id = topPlayers[matchIdx * 2 + 1];
            const winnerId = player1Id; // Player 1 advances for simplicity

            await ctx.db.insert("tournamentMatches", {
              roundId,
              profile1Id: player1Id,
              profile2Id: player2Id,
              winnerProfileId: winnerId,
              matchPoints1: 3,
              matchPoints2: 0,
              gameWins1: 2,
              gameWins2: Math.floor(Math.random() * 2),
              isBye: false,
              status: "completed",
              tableNumber: matchIdx + 1,
              player1MatchConfirmed: true,
              player2MatchConfirmed: true,
              matchConfirmedAt:
                Date.now() -
                13 * 24 * 60 * 60 * 1000 +
                (roundIdx + 1) * 90 * 60 * 1000 -
                10 * 60 * 1000,
              staffRequested: false,
              startTime:
                Date.now() -
                13 * 24 * 60 * 60 * 1000 +
                roundIdx * 90 * 60 * 1000,
              endTime:
                Date.now() -
                13 * 24 * 60 * 60 * 1000 +
                roundIdx * 90 * 60 * 1000 +
                50 * 60 * 1000,
            });

            stats.matches++;
          }
        }
      }
    }

    console.log(
      `✅ Created tournament structures with ${stats.matches} matches`,
    );

    // === STEP 4.5: Calculate Player Stats from Match History ===
    console.log("📊 Calculating player stats from match history...");

    for (const tournament of [...completedTournaments, ...activeTournaments]) {
      // Get all phases for this tournament
      const phases = await ctx.db
        .query("tournamentPhases")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament.id))
        .collect();

      // Use indexed queries to get rounds for each phase
      const tournamentRounds = [];
      for (const phase of phases) {
        const phaseRounds = await ctx.db
          .query("tournamentRounds")
          .withIndex("by_phase", (q) => q.eq("phaseId", phase._id))
          .collect();
        tournamentRounds.push(...phaseRounds);
      }

      // Use indexed queries to get completed matches for each round
      const tournamentMatches = [];
      for (const round of tournamentRounds) {
        const roundMatches = await ctx.db
          .query("tournamentMatches")
          .withIndex("by_round", (q) => q.eq("roundId", round._id))
          .collect()
          .then((matches) => matches.filter((m) => m.status === "completed"));
        tournamentMatches.push(...roundMatches);
      }

      // Calculate stats for each player
      for (const profileId of tournament.registrantIds) {
        const playerMatches = tournamentMatches.filter(
          (m) => m.profile1Id === profileId || m.profile2Id === profileId,
        );

        let matchWins = 0;
        let matchLosses = 0;
        let gameWins = 0;
        let gameLosses = 0;
        const opponentIds: string[] = [];

        for (const match of playerMatches) {
          const isPlayer1 = match.profile1Id === profileId;
          const won = match.winnerProfileId === profileId;
          const opponentId = isPlayer1 ? match.profile2Id : match.profile1Id;

          if (opponentId) {
            opponentIds.push(opponentId);
          }

          if (won) {
            matchWins++;
          } else {
            matchLosses++;
          }

          gameWins += isPlayer1 ? match.gameWins1 : match.gameWins2;
          gameLosses += isPlayer1 ? match.gameWins2 || 0 : match.gameWins1 || 0;
        }

        const matchesPlayed = matchWins + matchLosses;
        const matchPoints = matchWins * 3;
        const matchWinPercentage =
          matchesPlayed > 0 ? matchWins / matchesPlayed : 0;
        const gameWinPercentage =
          gameWins + gameLosses > 0 ? gameWins / (gameWins + gameLosses) : 0;

        // Calculate opponent win percentages (simplified)
        let totalOpponentWinRate = 0;
        let opponentCount = 0;
        for (const oppId of opponentIds) {
          const oppMatches = tournamentMatches.filter(
            (m) => m.profile1Id === oppId || m.profile2Id === oppId,
          );
          const oppWins = oppMatches.filter(
            (m) => m.winnerProfileId === oppId,
          ).length;
          const oppPlayed = oppMatches.length;
          if (oppPlayed > 0) {
            totalOpponentWinRate += oppWins / oppPlayed;
            opponentCount++;
          }
        }
        const opponentMatchWinPercentage =
          opponentCount > 0 ? totalOpponentWinRate / opponentCount : 0.5;

        await ctx.db.insert("tournamentPlayerStats", {
          tournamentId: tournament.id,
          profileId,
          matchPoints,
          matchesPlayed,
          matchWins,
          matchLosses,
          matchWinPercentage,
          gameWins,
          gameLosses,
          gameWinPercentage,
          opponentMatchWinPercentage,
          opponentGameWinPercentage: opponentMatchWinPercentage,
          opponentOpponentMatchWinPercentage: 0.5,
          strengthOfSchedule: opponentMatchWinPercentage,
          buchholzScore: matchPoints * opponentMatchWinPercentage,
          modifiedBuchholzScore: matchPoints * opponentMatchWinPercentage * 0.9,
          currentStanding: 0, // Will be calculated by ranking
          standingsNeedRecalc: false,
          hasReceivedBye: false,
          isDropped: false,
          finalRanking:
            tournament.status === "completed" ? undefined : undefined, // Will be set by ranking system
          opponentHistory: opponentIds,
          roundsPlayed: matchesPlayed,
        });
      }
    }

    console.log("✅ Calculated player stats from match history");

    // === STEP 5: Create Pokemon Teams ===
    console.log("🎮 Creating Pokemon teams...");

    const competitivePlayers = userProfiles
      .filter((u) => u.userType === "competitive")
      .slice(0, 10);

    const samplePokemon = [
      {
        species: "Rillaboom",
        ability: "Grassy Surge",
        move1: "Grassy Glide",
        move2: "Fake Out",
        move3: "Wood Hammer",
        move4: "U-turn",
      },
      {
        species: "Incineroar",
        ability: "Intimidate",
        move1: "Fake Out",
        move2: "Flare Blitz",
        move3: "Parting Shot",
        move4: "Knock Off",
      },
      {
        species: "Urshifu-Rapid-Strike",
        ability: "Unseen Fist",
        move1: "Surging Strikes",
        move2: "Close Combat",
        move3: "Aqua Jet",
        move4: "Detect",
      },
      {
        species: "Raging Bolt",
        ability: "Protosynthesis",
        move1: "Thunderclap",
        move2: "Dragon Pulse",
        move3: "Thunderbolt",
        move4: "Calm Mind",
      },
      {
        species: "Flutter Mane",
        ability: "Protosynthesis",
        move1: "Moonblast",
        move2: "Shadow Ball",
        move3: "Protect",
        move4: "Icy Wind",
      },
      {
        species: "Amoonguss",
        ability: "Regenerator",
        move1: "Spore",
        move2: "Rage Powder",
        move3: "Pollen Puff",
        move4: "Protect",
      },
    ];

    for (const player of competitivePlayers) {
      // Create 2-3 teams per player
      const teamCount = 2 + Math.floor(Math.random() * 2);

      for (let t = 0; t < teamCount; t++) {
        const teamId = await ctx.db.insert("teams", {
          name: `${["Rain", "Sun", "Trick Room", "Hyper Offense", "Balance", "Weather", "Tailwind"][Math.floor(Math.random() * 7)]} Team ${t + 1}`,
          description: "Competitive VGC team for ranked battles",
          createdBy: player.profileId,
          isPublic: Math.random() > 0.5,
          formatLegal: true,
          tags: ["VGC2025", "Competitive", "RegA"],
          notes: "Updated for current meta",
        });

        // Add 6 Pokemon to the team
        for (let p = 0; p < 6; p++) {
          const pokeData = samplePokemon[p];
          if (!pokeData) continue;

          const natureOptions = [
            "Adamant",
            "Jolly",
            "Timid",
            "Modest",
            "Bold",
            "Careful",
          ] as const;
          const itemOptions = [
            "Assault Vest",
            "Life Orb",
            "Choice Scarf",
            "Focus Sash",
            "Sitrus Berry",
          ] as const;

          const nature =
            natureOptions[Math.floor(Math.random() * natureOptions.length)] ??
            "Adamant";
          const heldItem =
            itemOptions[Math.floor(Math.random() * itemOptions.length)] ??
            "Assault Vest";

          const pokemonId = await ctx.db.insert("pokemon", {
            species: pokeData.species,
            level: 50,
            nature,
            ability: pokeData.ability,
            heldItem,
            isShiny: Math.random() > 0.9,
            move1: pokeData.move1,
            move2: pokeData.move2,
            move3: pokeData.move3,
            move4: pokeData.move4,
            evHp: Math.floor(Math.random() * 252),
            evAttack: Math.floor(Math.random() * 252),
            evDefense: Math.floor(Math.random() * 252),
            evSpecialAttack: Math.floor(Math.random() * 252),
            evSpecialDefense: Math.floor(Math.random() * 252),
            evSpeed: Math.floor(Math.random() * 252),
            ivHp: 31,
            ivAttack: 31,
            ivDefense: 31,
            ivSpecialAttack: 31,
            ivSpecialDefense: 31,
            ivSpeed: 31,
            formatLegal: true,
          });

          await ctx.db.insert("teamPokemon", {
            teamId,
            pokemonId,
            teamPosition: p + 1,
          });
        }

        stats.teams++;
      }
    }

    console.log(`✅ Created ${stats.teams} Pokemon teams`);

    const summary = {
      success: true,
      message: "Comprehensive seed data created successfully",
      stats,
      details: {
        users: stats.users,
        profiles: stats.profiles,
        organizations: stats.organizations,
        tournaments: stats.tournaments,
        registrations: stats.registrations,
        matches: stats.matches,
        teams: stats.teams,
      },
      clerkSyncInstructions: {
        message: "⚠️ Seeded users need to be synced with Clerk",
        command: "bun src/scripts/sync-seed-users-with-clerk.ts",
        note: "Run the above command to create Clerk accounts for all seeded users",
      },
    };

    console.log("🎉 Comprehensive seeding complete!");
    console.log(JSON.stringify(summary, null, 2));
    console.log("\n⚠️  IMPORTANT: Seeded users are not yet synced with Clerk!");
    console.log("   Run: bun src/scripts/sync-seed-users-with-clerk.ts");
    console.log(
      "   This will create Clerk accounts so users can authenticate.\n",
    );

    return summary;
  },
});
