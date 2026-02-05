import { PERMISSIONS } from "../permissions";

describe("PERMISSIONS", () => {
  it("is a non-empty object", () => {
    expect(Object.keys(PERMISSIONS).length).toBeGreaterThan(0);
  });

  describe("organization permissions", () => {
    it("has organization create permission", () => {
      expect(PERMISSIONS.ORG_CREATE).toBe("organization.create");
    });

    it("has organization request permissions", () => {
      expect(PERMISSIONS.ORG_REQUEST_CREATE).toBe(
        "organization.request.create"
      );
      expect(PERMISSIONS.ORG_REQUEST_APPROVE).toBe(
        "organization.request.approve"
      );
      expect(PERMISSIONS.ORG_REQUEST_REJECT).toBe(
        "organization.request.reject"
      );
      expect(PERMISSIONS.ORG_REQUEST_VIEW_ALL).toBe(
        "organization.request.view.all"
      );
    });

    it("has organization view permissions", () => {
      expect(PERMISSIONS.ORG_VIEW_ALL).toBe("organization.view.all");
      expect(PERMISSIONS.ORG_VIEW_OWN).toBe("organization.view.own");
    });

    it("has organization management permissions", () => {
      expect(PERMISSIONS.ORG_UPDATE).toBe("organization.update");
      expect(PERMISSIONS.ORG_DELETE).toBe("organization.delete");
      expect(PERMISSIONS.ORG_INVITE_STAFF).toBe("organization.invite_staff");
      expect(PERMISSIONS.ORG_VIEW_STAFF).toBe("organization.view_staff");
      expect(PERMISSIONS.ORG_MANAGE_GROUP_ASSIGNMENTS).toBe(
        "organization.manage_group_assignments"
      );
      expect(PERMISSIONS.ORG_REMOVE_STAFF).toBe("organization.remove_staff");
      expect(PERMISSIONS.ORG_REQUEST_JOIN).toBe("organization.request_join");
      expect(PERMISSIONS.ORG_MANAGE_REQUESTS).toBe(
        "organization.manage_requests"
      );
    });
  });

  describe("role permissions", () => {
    it("has role CRUD permissions", () => {
      expect(PERMISSIONS.ROLE_CREATE).toBe("role.create");
      expect(PERMISSIONS.ROLE_VIEW_ALL).toBe("role.list");
      expect(PERMISSIONS.ROLE_VIEW_DETAIL).toBe("role.view.detail");
      expect(PERMISSIONS.ROLE_UPDATE).toBe("role.update");
      expect(PERMISSIONS.ROLE_ASSIGN_PERMISSIONS).toBe(
        "role.assign_permissions"
      );
    });
  });

  describe("permission meta-permissions", () => {
    it("has permission CRUD operations", () => {
      expect(PERMISSIONS.PERMISSION_CREATE).toBe("permission.create");
      expect(PERMISSIONS.PERMISSION_VIEW_ALL).toBe("permission.list");
      expect(PERMISSIONS.PERMISSION_VIEW_DETAIL).toBe("permission.view.detail");
      expect(PERMISSIONS.PERMISSION_UPDATE).toBe("permission.update");
      expect(PERMISSIONS.PERMISSION_DELETE).toBe("permission.delete");
    });
  });

  describe("group permissions", () => {
    it("has group CRUD and management permissions", () => {
      expect(PERMISSIONS.GROUP_CREATE).toBe("group.create");
      expect(PERMISSIONS.GROUP_VIEW_ALL).toBe("group.list");
      expect(PERMISSIONS.GROUP_VIEW_DETAIL).toBe("group.view.detail");
      expect(PERMISSIONS.GROUP_UPDATE).toBe("group.update");
      expect(PERMISSIONS.GROUP_DELETE).toBe("group.delete");
      expect(PERMISSIONS.GROUP_MANAGE_STAFF).toBe("group.manage_staff");
      expect(PERMISSIONS.GROUP_MANAGE_AVAILABLE_ROLES).toBe(
        "group.manage_available_roles"
      );
    });
  });

  describe("user profile permissions", () => {
    it("has user profile permissions", () => {
      expect(PERMISSIONS.USER_PROFILE_VIEW_ALL).toBe("user_profile.list");
      expect(PERMISSIONS.USER_PROFILE_VIEW_DETAIL).toBe(
        "user_profile.view.detail"
      );
      expect(PERMISSIONS.USER_PROFILE_UPDATE).toBe("user_profile.update");
    });
  });

  describe("tournament permissions", () => {
    it("has tournament CRUD permissions", () => {
      expect(PERMISSIONS.TOURNAMENT_CREATE).toBe("tournament.create");
      expect(PERMISSIONS.TOURNAMENT_VIEW).toBe("tournament.view");
      expect(PERMISSIONS.TOURNAMENT_UPDATE).toBe("tournament.update");
      expect(PERMISSIONS.TOURNAMENT_DELETE).toBe("tournament.delete");
    });

    it("has tournament management permissions", () => {
      expect(PERMISSIONS.TOURNAMENT_MANAGE_REGISTRATIONS).toBe(
        "tournament.manage_registrations"
      );
      expect(PERMISSIONS.TOURNAMENT_REGISTER).toBe("tournament.register");
      expect(PERMISSIONS.TOURNAMENT_WITHDRAW).toBe("tournament.withdraw");
      expect(PERMISSIONS.TOURNAMENT_SUBMIT_TEAM).toBe("tournament.submit_team");
    });

    it("has tournament invitation permissions", () => {
      expect(PERMISSIONS.TOURNAMENT_INVITE_PLAYERS).toBe(
        "tournament.invite_players"
      );
      expect(PERMISSIONS.TOURNAMENT_MANAGE_INVITATIONS).toBe(
        "tournament.manage_invitations"
      );
      expect(PERMISSIONS.TOURNAMENT_RESPOND_TO_INVITATION).toBe(
        "tournament.respond_to_invitation"
      );
    });

    it("has TOURNAMENT_MANAGE as an alias for TOURNAMENT_UPDATE", () => {
      expect(PERMISSIONS.TOURNAMENT_MANAGE).toBe(PERMISSIONS.TOURNAMENT_UPDATE);
      expect(PERMISSIONS.TOURNAMENT_MANAGE).toBe("tournament.update");
    });
  });

  describe("template permissions", () => {
    it("has template CRUD permissions", () => {
      expect(PERMISSIONS.TEMPLATE_CREATE).toBe("template.create");
      expect(PERMISSIONS.TEMPLATE_UPDATE).toBe("template.update");
      expect(PERMISSIONS.TEMPLATE_DELETE).toBe("template.delete");
    });
  });

  describe("team permissions", () => {
    it("has team CRUD permissions", () => {
      expect(PERMISSIONS.TEAM_CREATE).toBe("team.create");
      expect(PERMISSIONS.TEAM_UPDATE).toBe("team.update");
      expect(PERMISSIONS.TEAM_DELETE).toBe("team.delete");
    });
  });

  describe("pokemon permissions", () => {
    it("has pokemon CRUD permissions", () => {
      expect(PERMISSIONS.POKEMON_CREATE).toBe("pokemon.create");
      expect(PERMISSIONS.POKEMON_UPDATE).toBe("pokemon.update");
      expect(PERMISSIONS.POKEMON_DELETE).toBe("pokemon.delete");
    });
  });

  describe("match permissions", () => {
    it("has match result reporting permission", () => {
      expect(PERMISSIONS.MATCH_REPORT_RESULT).toBe("match.report_result");
    });
  });

  describe("admin permissions", () => {
    it("has admin management permissions", () => {
      expect(PERMISSIONS.ADMIN_MANAGE_TEMPLATES).toBe("admin.manage_templates");
      expect(PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS).toBe("admin.view_audit_logs");
      expect(PERMISSIONS.ADMIN_MANAGE_AUDIT_LOGS).toBe(
        "admin.manage_audit_logs"
      );
      expect(PERMISSIONS.ADMIN_ASSUME_SITE_ADMIN).toBe(
        "admin.assume_site_admin"
      );
      expect(PERMISSIONS.ADMIN_MANAGE_TEMPORARY_ROLES).toBe(
        "admin.manage_temporary_roles"
      );
    });
  });

  describe("value integrity", () => {
    it("all permission values are non-empty strings", () => {
      for (const [_key, value] of Object.entries(PERMISSIONS)) {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it("all permission values follow the dot-notation pattern", () => {
      for (const value of Object.values(PERMISSIONS)) {
        // Each value should contain at least one dot (category.action)
        expect(value).toMatch(/^[a-z_]+(\.[a-z_]+)+$/);
      }
    });

    it("has no duplicate permission values (excluding intentional aliases)", () => {
      const _values = Object.values(PERMISSIONS);
      const entries = Object.entries(PERMISSIONS);

      // Find actual duplicates
      const valueCounts = new Map<string, string[]>();
      for (const [key, value] of entries) {
        const existing = valueCounts.get(value) || [];
        existing.push(key);
        valueCounts.set(value, existing);
      }

      // The only known alias is TOURNAMENT_MANAGE -> TOURNAMENT_UPDATE
      // Both map to "tournament.update"
      for (const [value, keys] of valueCounts) {
        if (keys.length > 1) {
          // Verify this is the known alias
          expect(keys.sort()).toEqual(
            ["TOURNAMENT_MANAGE", "TOURNAMENT_UPDATE"].sort()
          );
          expect(value).toBe("tournament.update");
        }
      }
    });

    it("satisfies the PermissionKey type for all values", () => {
      // This test verifies at runtime that every value in PERMISSIONS
      // is a valid PermissionKey. The `satisfies` in the source enforces
      // this at compile time, but this confirms it at runtime too.
      const allValues = Object.values(PERMISSIONS);
      // Since the object uses `as const satisfies Record<string, PermissionKey>`,
      // every value must be assignable to PermissionKey.
      // We verify there are no unexpected values by checking they all
      // match the expected dot-notation pattern.
      for (const value of allValues) {
        expect(value).toMatch(/^[a-z_]+\./);
      }
    });
  });
});
