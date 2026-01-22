import { internalMutation, mutation } from "./_generated/server";
import { PermissionKey, PERMISSIONS } from "./permissionKeys";
import { Id, type DataModel } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

const rolesToPermissions: Record<string, PermissionKey[]> = {
  "Site Admin": [
    PERMISSIONS.ORG_CREATE,
    PERMISSIONS.ORG_REQUEST_APPROVE,
    PERMISSIONS.ORG_REQUEST_REJECT,
    PERMISSIONS.ORG_REQUEST_VIEW_ALL,
    PERMISSIONS.ORG_VIEW_ALL,
    PERMISSIONS.ORG_DELETE,
    PERMISSIONS.ADMIN_ASSUME_SITE_ADMIN,
    PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS,
    PERMISSIONS.ADMIN_MANAGE_AUDIT_LOGS,
    PERMISSIONS.ADMIN_MANAGE_TEMPLATES,
    PERMISSIONS.ADMIN_MANAGE_TEMPORARY_ROLES,
  ],
  Owner: [PERMISSIONS.ADMIN_ASSUME_SITE_ADMIN],
  Admin: [
    PERMISSIONS.ORG_UPDATE,
    PERMISSIONS.ORG_INVITE_MEMBERS,
    PERMISSIONS.ORG_VIEW_MEMBERS,
    PERMISSIONS.ORG_MANAGE_GROUP_ASSIGNMENTS,
    PERMISSIONS.ORG_REMOVE_MEMBER,
    PERMISSIONS.ORG_MANAGE_REQUESTS,
    PERMISSIONS.TOURNAMENT_CREATE,
    PERMISSIONS.TOURNAMENT_UPDATE,
    PERMISSIONS.TOURNAMENT_DELETE,
    PERMISSIONS.GROUP_CREATE,
    PERMISSIONS.GROUP_UPDATE,
    PERMISSIONS.GROUP_DELETE,
    PERMISSIONS.GROUP_MANAGE_MEMBERS,
    PERMISSIONS.ROLE_CREATE,
    PERMISSIONS.ROLE_UPDATE,
    PERMISSIONS.ROLE_ASSIGN_PERMISSIONS,
  ],
  "Tournament Director": [
    PERMISSIONS.TOURNAMENT_CREATE,
    PERMISSIONS.TOURNAMENT_UPDATE,
    PERMISSIONS.TOURNAMENT_DELETE,
    PERMISSIONS.TOURNAMENT_MANAGE_REGISTRATIONS,
    PERMISSIONS.MATCH_REPORT_RESULT,
  ],
  Judge: [PERMISSIONS.MATCH_REPORT_RESULT],
  Player: [
    PERMISSIONS.ORG_REQUEST_CREATE,
    PERMISSIONS.TOURNAMENT_REGISTER,
    PERMISSIONS.TOURNAMENT_WITHDRAW,
    PERMISSIONS.TOURNAMENT_SUBMIT_TEAM,
    PERMISSIONS.TEAM_CREATE,
    PERMISSIONS.TEAM_UPDATE,
    PERMISSIONS.TEAM_DELETE,
  ],
};

export const seedRbac = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 🚨 CRITICAL: Prevent running in production OR preview environments
    // Seeding must be explicitly enabled via ENABLE_SEEDING environment variable
    if (process.env.ENABLE_SEEDING !== "true") {
      throw new Error(
        "🚨 PRODUCTION SAFETY: Seeding is DISABLED. Set ENABLE_SEEDING=true environment variable in Convex dashboard for development deployments only. NEVER enable in production or preview."
      );
    }

    // 1. Seed Permissions
    const permissionKeys = Object.values(PERMISSIONS);
    const permissionIds = new Map<PermissionKey, Id<"permissions">>();

    for (const key of permissionKeys) {
      const existing = await ctx.db
        .query("permissions")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (!existing) {
        const id = await ctx.db.insert("permissions", {
          key,
          name: key.split(".").pop()?.replace(/_/g, " ") ?? "",
          description: `Allows to ${key}`,
        });
        permissionIds.set(key, id);
      } else {
        permissionIds.set(key, existing._id as Id<"permissions">);
      }
    }

    // 2. Seed Roles and Role-Permission links
    for (const roleName in rolesToPermissions) {
      let role = await ctx.db
        .query("roles")
        .withIndex("by_name", (q) => q.eq("name", roleName))
        .first();

      if (!role) {
        const roleId = await ctx.db.insert("roles", {
          name: roleName,
          description: `The ${roleName} role.`,
        });
        role = {
          _id: roleId,
          name: roleName,
          description: `The ${roleName} role.`,
          _creationTime: Date.now(),
        };
      }

      const permissionsForRole =
        rolesToPermissions[roleName as keyof typeof rolesToPermissions];
      if (!permissionsForRole) continue;

      for (const pKey of permissionsForRole) {
        const pId = permissionIds.get(pKey);
        if (pId && role) {
          const existingLink = await ctx.db
            .query("rolePermissions")
            .withIndex("by_role_permission", (q) =>
              q.eq("roleId", role!._id).eq("permissionId", pId)
            )
            .first();
          if (!existingLink) {
            await ctx.db.insert("rolePermissions", {
              roleId: role._id,
              permissionId: pId,
            });
          }
        }
      }
    }
    console.log("✅ RBAC seeding complete.");
  },
});

// Seeding mutation to create test users
export const createTestUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if users already exist
    const existingUsers = await ctx.db.query("users").collect();
    if (existingUsers.length > 0) {
      return {
        message: `Database already seeded (${existingUsers.length} users found)`,
        created: 0,
      };
    }

    const testUsers = [
      // Site Admin
      {
        email: "admin@battlestadium.local",
        name: "Site Administrator",
        username: "admin",
        displayName: "Site Administrator",
      },
      // Organization Staff
      {
        email: "organizer@battlestadium.local",
        name: "Tournament Organizer",
        username: "organizer",
        displayName: "Tournament Organizer",
      },
      {
        email: "judge@battlestadium.local",
        name: "Tournament Judge",
        username: "judge",
        displayName: "Tournament Judge",
      },
      {
        email: "staff@battlestadium.local",
        name: "Tournament Staff",
        username: "staff",
        displayName: "Tournament Staff",
      },
      // Players
      {
        email: "player1@battlestadium.local",
        name: "Player One",
        username: "player1",
        displayName: "Player One",
      },
      {
        email: "player2@battlestadium.local",
        name: "Player Two",
        username: "player2",
        displayName: "Player Two",
      },
      {
        email: "player3@battlestadium.local",
        name: "Player Three",
        username: "player3",
        displayName: "Player Three",
      },
      {
        email: "player4@battlestadium.local",
        name: "Player Four",
        username: "player4",
        displayName: "Player Four",
      },
      // Regular User
      {
        email: "user@battlestadium.local",
        name: "Regular User",
        username: "user",
        displayName: "Regular User",
      },
    ];

    let createdCount = 0;

    for (const userData of testUsers) {
      try {
        // Create user in auth system
        const userId = await ctx.db.insert("users", {
          clerkUserId: `clerk_${userData.email.replace("@", "_").replace(".", "_")}`,
          name: userData.name,
          email: userData.email,
        });

        // Create user profile
        await ctx.db.insert("profiles", {
          userId,
          username: userData.username,
          displayName: userData.displayName,
          tier: "free",
        });

        createdCount++;
      } catch (error) {
        console.log(`Failed to create user ${userData.email}:`, error);
      }
    }

    // Inline RBAC seeding to avoid circular scheduling dependencies
    console.log("Starting RBAC seeding...");

    // 1. Seed Permissions
    const permissionKeys = Object.values(PERMISSIONS);
    const permissionIds = new Map<PermissionKey, Id<"permissions">>();

    for (const key of permissionKeys) {
      const existing = await ctx.db
        .query("permissions")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (!existing) {
        const id = await ctx.db.insert("permissions", {
          key,
          name: key.split(".").pop()?.replace(/_/g, " ") ?? "",
          description: `Allows to ${key}`,
        });
        permissionIds.set(key, id);
      } else {
        permissionIds.set(key, existing._id as Id<"permissions">);
      }
    }

    // 2. Seed Roles and Role-Permission links
    for (const roleName in rolesToPermissions) {
      let role = await ctx.db
        .query("roles")
        .withIndex("by_name", (q) => q.eq("name", roleName))
        .first();

      if (!role) {
        const roleId = await ctx.db.insert("roles", {
          name: roleName,
          description: `The ${roleName} role.`,
        });
        role = {
          _id: roleId,
          name: roleName,
          description: `The ${roleName} role.`,
          _creationTime: Date.now(),
        };
      }

      const permissionsForRole =
        rolesToPermissions[roleName as keyof typeof rolesToPermissions];
      if (!permissionsForRole) continue;

      for (const pKey of permissionsForRole) {
        const pId = permissionIds.get(pKey);
        if (pId && role) {
          const existingLink = await ctx.db
            .query("rolePermissions")
            .withIndex("by_role_permission", (q) =>
              q.eq("roleId", role!._id).eq("permissionId", pId)
            )
            .first();
          if (!existingLink) {
            await ctx.db.insert("rolePermissions", {
              roleId: role._id,
              permissionId: pId,
            });
          }
        }
      }
    }

    console.log("✅ RBAC seeding complete.");

    // 3. Assign Site Admin role to admin user
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "admin@battlestadium.local"))
      .first();

    if (adminUser) {
      const adminProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", adminUser._id))
        .first();

      const siteAdminRole = await ctx.db
        .query("roles")
        .withIndex("by_name", (q) => q.eq("name", "Site Admin"))
        .first();

      if (adminProfile && siteAdminRole) {
        // Create a global "Platform" organization for site-wide roles
        const platformOrgId = await ctx.db.insert("organizations", {
          name: "Battle Stadium Platform",
          slug: "platform",
          description: "Site-wide administration organization",
          ownerProfileId: adminProfile._id,
          status: "active",
        });

        const platformGroupId = await ctx.db.insert("groups", {
          organizationId: platformOrgId,
          name: "Site Administrators",
          description: "Platform-wide administrators",
        });

        const siteAdminGroupRoleId = await ctx.db.insert("groupRoles", {
          groupId: platformGroupId,
          roleId: siteAdminRole._id,
        });

        await ctx.db.insert("organizationMembers", {
          organizationId: platformOrgId,
          profileId: adminProfile._id,
        });

        await ctx.db.insert("profileGroupRoles", {
          profileId: adminProfile._id,
          groupRoleId: siteAdminGroupRoleId,
        });

        console.log("✅ Site Admin role assigned to admin user");
      }
    }

    // 4. Create test organization for organizer user
    const organizerUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) =>
        q.eq("email", "organizer@battlestadium.local")
      )
      .first();

    if (organizerUser) {
      const organizerProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", organizerUser._id))
        .first();

      if (organizerProfile) {
        // Create organization
        const testOrgId = await ctx.db.insert("organizations", {
          name: "Community Pokemon League",
          slug: "community-pokemon-league",
          description: "A grassroots community for competitive Pokemon battles",
          ownerProfileId: organizerProfile._id,
          status: "active",
        });

        // Create default group
        const defaultGroupId = await ctx.db.insert("groups", {
          organizationId: testOrgId,
          name: "Members",
          description: "Default group for all organization members",
        });

        // Get or create Owner role
        let ownerRole = await ctx.db
          .query("roles")
          .withIndex("by_name", (q) => q.eq("name", "Owner"))
          .first();

        if (!ownerRole) {
          const ownerRoleId = await ctx.db.insert("roles", {
            name: "Owner",
            description: "Organization owner with full permissions",
          });

          // Assign all permissions to Owner role
          const allPermissions = await ctx.db.query("permissions").collect();
          for (const permission of allPermissions) {
            await ctx.db.insert("rolePermissions", {
              roleId: ownerRoleId,
              permissionId: permission._id,
            });
          }

          ownerRole = {
            _id: ownerRoleId,
            name: "Owner",
            description: "Organization owner with full permissions",
            _creationTime: Date.now(),
          };
        }

        // Add organizer to organization
        await ctx.db.insert("organizationMembers", {
          organizationId: testOrgId,
          profileId: organizerProfile._id,
        });

        // Create owner group role
        const ownerGroupRoleId = await ctx.db.insert("groupRoles", {
          groupId: defaultGroupId,
          roleId: ownerRole._id,
        });

        // Assign owner role to organizer
        await ctx.db.insert("profileGroupRoles", {
          profileId: organizerProfile._id,
          groupRoleId: ownerGroupRoleId,
        });

        console.log("✅ Test organization created for organizer user");
      }
    }

    // 5. Assign Player role to all player users
    const playerRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "Player"))
      .first();

    if (playerRole) {
      const playerEmails = [
        "player1@battlestadium.local",
        "player2@battlestadium.local",
        "player3@battlestadium.local",
        "player4@battlestadium.local",
        "user@battlestadium.local",
      ];

      for (const email of playerEmails) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", email))
          .first();

        if (user) {
          const profile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .first();

          if (profile && organizerUser) {
            const organizerProfile = await ctx.db
              .query("profiles")
              .withIndex("by_user", (q) => q.eq("userId", organizerUser._id))
              .first();

            if (organizerProfile) {
              // Get the test org
              const testOrg = await ctx.db
                .query("organizations")
                .withIndex("by_owner", (q) =>
                  q.eq("ownerProfileId", organizerProfile._id)
                )
                .first();

              if (testOrg) {
                // Get the default group
                const defaultGroup = await ctx.db
                  .query("groups")
                  .withIndex("by_org", (q) =>
                    q.eq("organizationId", testOrg._id)
                  )
                  .first();

                if (defaultGroup) {
                  // Add player to organization
                  const existingMember = await ctx.db
                    .query("organizationMembers")
                    .withIndex("by_org_profile", (q) =>
                      q
                        .eq("organizationId", testOrg._id)
                        .eq("profileId", profile._id)
                    )
                    .first();

                  if (!existingMember) {
                    await ctx.db.insert("organizationMembers", {
                      organizationId: testOrg._id,
                      profileId: profile._id,
                    });
                  }

                  // Create player group role if it doesn't exist
                  const existingGroupRole = await ctx.db
                    .query("groupRoles")
                    .withIndex("by_group_role", (q) =>
                      q
                        .eq("groupId", defaultGroup._id)
                        .eq("roleId", playerRole._id)
                    )
                    .first();

                  let playerGroupRoleId = existingGroupRole?._id;

                  if (!existingGroupRole) {
                    playerGroupRoleId = await ctx.db.insert("groupRoles", {
                      groupId: defaultGroup._id,
                      roleId: playerRole._id,
                    });
                  }

                  // Assign player role to user
                  if (playerGroupRoleId) {
                    const existingProfileRole = await ctx.db
                      .query("profileGroupRoles")
                      .withIndex("by_profile_group_role", (q) =>
                        q
                          .eq("profileId", profile._id)
                          .eq("groupRoleId", playerGroupRoleId)
                      )
                      .first();

                    if (!existingProfileRole) {
                      await ctx.db.insert("profileGroupRoles", {
                        profileId: profile._id,
                        groupRoleId: playerGroupRoleId,
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }

      console.log("✅ Player roles assigned to test users");
    }

    return {
      message: `Successfully created ${createdCount} test users with organizations and roles`,
      created: createdCount,
      users: testUsers.map((u) => u.email),
    };
  },
});

// Check if database needs seeding
export const needsSeeding = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const userCount = await ctx.db.query("users").collect();
    return userCount.length === 0;
  },
});

// Clear all test data (for development only)
export const clearTestData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // This is a simplified clear. A real one would need to clear all tables.
    const tables: (keyof DataModel)[] = [
      "users",
      "profiles",
      "organizations",
      "organizationMembers",
      "groups",
      "roles",
      "permissions",
      "groupRoles",
      "profileGroupRoles",
      "rolePermissions",
      "tournaments",
    ];
    for (const table of tables) {
      const items = await ctx.db.query(table).collect();
      await Promise.all(items.map((item) => ctx.db.delete(item._id)));
    }

    return {
      message: `Cleared test data from multiple tables.`,
    };
  },
});
