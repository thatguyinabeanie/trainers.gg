/**
 * Tests for Organization Service Layer
 */

import { describe, it, expect, jest } from "@jest/globals";
import {
  listOrganizationsService,
  getOrganizationBySlugService,
  createOrganizationService,
  updateOrganizationService,
  inviteToOrganizationService,
  acceptOrganizationInvitationService,
  declineOrganizationInvitationService,
  removeStaffService,
  leaveOrganizationService,
} from "../organizations";

// Mock Supabase client
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

// Mock Supabase functions
jest.mock("@trainers/supabase", () => ({
  listOrganizations: jest.fn(),
  getOrganizationBySlug: jest.fn(),
  createOrganization: jest.fn(),
  updateOrganization: jest.fn(),
  inviteToOrganization: jest.fn(),
  acceptOrganizationInvitation: jest.fn(),
  declineOrganizationInvitation: jest.fn(),
  removeStaff: jest.fn(),
  leaveOrganization: jest.fn(),
}));

describe("Organization Service", () => {
  describe("listOrganizationsService", () => {
    it("should return list of organizations", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { listOrganizations } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const mockOrganizations = [
        { id: 1, name: "Org 1", slug: "org-1" },
        { id: 2, name: "Org 2", slug: "org-2" },
      ];

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (listOrganizations as jest.Mock).mockResolvedValue(mockOrganizations);

      const result = await listOrganizationsService();

      expect(createClient).toHaveBeenCalled();
      expect(listOrganizations).toHaveBeenCalledWith(mockSupabase);
      expect(result).toEqual(mockOrganizations);
    });
  });

  describe("getOrganizationBySlugService", () => {
    it("should return organization by slug", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getOrganizationBySlug } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const slug = "test-org";
      const mockOrganization = { id: 1, name: "Test Org", slug };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (getOrganizationBySlug as jest.Mock).mockResolvedValue(mockOrganization);

      const result = await getOrganizationBySlugService(slug);

      expect(createClient).toHaveBeenCalled();
      expect(getOrganizationBySlug).toHaveBeenCalledWith(mockSupabase, slug);
      expect(result).toEqual(mockOrganization);
    });

    it("should throw error when organization not found", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getOrganizationBySlug } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const slug = "nonexistent";

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (getOrganizationBySlug as jest.Mock).mockResolvedValue(null);

      await expect(getOrganizationBySlugService(slug)).rejects.toThrow(
        "Organization not found"
      );
    });
  });

  describe("createOrganizationService", () => {
    it("should create a new organization", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { createOrganization } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const orgData = { name: "New Org", slug: "new-org" };
      const mockCreatedOrg = { id: 789, ...orgData };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (createOrganization as jest.Mock).mockResolvedValue(mockCreatedOrg);

      const result = await createOrganizationService(orgData);

      expect(createClient).toHaveBeenCalled();
      expect(createOrganization).toHaveBeenCalledWith(mockSupabase, orgData);
      expect(result).toEqual(mockCreatedOrg);
    });
  });

  describe("updateOrganizationService", () => {
    it("should update an organization", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { updateOrganization } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const organizationId = 123;
      const updates = { name: "Updated Name" };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (updateOrganization as jest.Mock).mockResolvedValue(undefined);

      await updateOrganizationService(organizationId, updates);

      expect(createClient).toHaveBeenCalled();
      expect(updateOrganization).toHaveBeenCalledWith(
        mockSupabase,
        organizationId,
        updates
      );
    });
  });

  describe("inviteToOrganizationService", () => {
    it("should invite a user to an organization", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { inviteToOrganization } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const organizationId = 123;
      const invitedUserId = "user-456";

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (inviteToOrganization as jest.Mock).mockResolvedValue(undefined);

      await inviteToOrganizationService(organizationId, invitedUserId);

      expect(createClient).toHaveBeenCalled();
      expect(inviteToOrganization).toHaveBeenCalledWith(
        mockSupabase,
        organizationId,
        invitedUserId
      );
    });
  });

  describe("acceptOrganizationInvitationService", () => {
    it("should accept an organization invitation", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { acceptOrganizationInvitation } =
        await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const invitationId = 789;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (acceptOrganizationInvitation as jest.Mock).mockResolvedValue(undefined);

      await acceptOrganizationInvitationService(invitationId);

      expect(createClient).toHaveBeenCalled();
      expect(acceptOrganizationInvitation).toHaveBeenCalledWith(
        mockSupabase,
        invitationId
      );
    });
  });

  describe("declineOrganizationInvitationService", () => {
    it("should decline an organization invitation", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { declineOrganizationInvitation } =
        await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const invitationId = 789;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (declineOrganizationInvitation as jest.Mock).mockResolvedValue(undefined);

      await declineOrganizationInvitationService(invitationId);

      expect(createClient).toHaveBeenCalled();
      expect(declineOrganizationInvitation).toHaveBeenCalledWith(
        mockSupabase,
        invitationId
      );
    });
  });

  describe("removeStaffService", () => {
    it("should remove a staff member", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { removeStaff } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const organizationId = 123;
      const userId = "user-456";

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (removeStaff as jest.Mock).mockResolvedValue(undefined);

      await removeStaffService(organizationId, userId);

      expect(createClient).toHaveBeenCalled();
      expect(removeStaff).toHaveBeenCalledWith(
        mockSupabase,
        organizationId,
        userId
      );
    });
  });

  describe("leaveOrganizationService", () => {
    it("should leave an organization", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { leaveOrganization } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const organizationId = 123;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (leaveOrganization as jest.Mock).mockResolvedValue(undefined);

      await leaveOrganizationService(organizationId);

      expect(createClient).toHaveBeenCalled();
      expect(leaveOrganization).toHaveBeenCalledWith(
        mockSupabase,
        organizationId
      );
    });
  });
});
