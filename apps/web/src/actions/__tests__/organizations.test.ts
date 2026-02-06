/**
 * @jest-environment node
 */

import { updateTag } from "next/cache";
import * as supabaseModule from "@trainers/supabase";
import {
  createOrganization,
  updateOrganization,
  inviteToOrganization,
  acceptOrganizationInvitation,
  declineOrganizationInvitation,
  leaveOrganization,
  removeStaff,
} from "../organizations";

// Mock Next.js cache
jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
}));

// Mock Supabase server client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabase),
}));

// Mock @trainers/supabase mutations
jest.mock("@trainers/supabase");

describe("Organization Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createOrganization", () => {
    it("successfully creates an organization", async () => {
      const mockResult = { id: 1, slug: "test-org", name: "Test Org" };
      (supabaseModule.createOrganization as jest.Mock).mockResolvedValue(
        mockResult
      );

      const result = await createOrganization({
        name: "Test Org",
        slug: "test-org",
        description: "A test organization",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockResult);
      }
      expect(supabaseModule.createOrganization).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          name: "Test Org",
          slug: "test-org",
          description: "A test organization",
        })
      );
      expect(updateTag).toHaveBeenCalledWith("organizations-list");
    });

    it("creates organization with minimal required fields", async () => {
      const mockResult = { id: 1, slug: "minimal", name: "Minimal" };
      (supabaseModule.createOrganization as jest.Mock).mockResolvedValue(
        mockResult
      );

      const result = await createOrganization({
        name: "Minimal",
        slug: "minimal",
      });

      expect(result.success).toBe(true);
      expect(supabaseModule.createOrganization).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          name: "Minimal",
          slug: "minimal",
        })
      );
    });

    it("creates organization with all optional fields", async () => {
      const mockResult = { id: 1, slug: "full", name: "Full Org" };
      (supabaseModule.createOrganization as jest.Mock).mockResolvedValue(
        mockResult
      );

      const result = await createOrganization({
        name: "Full Org",
        slug: "full",
        description: "Full description",
        website: "https://example.com",
        logoUrl: "https://example.com/logo.png",
      });

      expect(result.success).toBe(true);
      expect(supabaseModule.createOrganization).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          website: "https://example.com",
          logoUrl: "https://example.com/logo.png",
        })
      );
    });

    it("returns error when creation fails", async () => {
      (supabaseModule.createOrganization as jest.Mock).mockRejectedValue(
        new Error("Slug already exists")
      );

      const result = await createOrganization({
        name: "Test",
        slug: "duplicate",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to create organization");
      }
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("returns error when unauthorized", async () => {
      (supabaseModule.createOrganization as jest.Mock).mockRejectedValue(
        new Error("Not authenticated")
      );

      const result = await createOrganization({
        name: "Test",
        slug: "test",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to create organization");
      }
    });
  });

  describe("updateOrganization", () => {
    it("successfully updates organization", async () => {
      (supabaseModule.updateOrganization as jest.Mock).mockResolvedValue({});

      const result = await updateOrganization(
        1,
        {
          name: "Updated Name",
          description: "Updated description",
        },
        "test-org"
      );

      expect(result.success).toBe(true);
      expect(supabaseModule.updateOrganization).toHaveBeenCalledWith(
        mockSupabase,
        1,
        expect.objectContaining({
          name: "Updated Name",
          description: "Updated description",
        })
      );
      expect(updateTag).toHaveBeenCalledWith("organizations-list");
      expect(updateTag).toHaveBeenCalledWith("organization:test-org");
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("revalidates list when display data changes", async () => {
      (supabaseModule.updateOrganization as jest.Mock).mockResolvedValue({});

      await updateOrganization(1, { name: "New Name" });

      expect(updateTag).toHaveBeenCalledWith("organizations-list");
    });

    it("revalidates list when logo changes", async () => {
      (supabaseModule.updateOrganization as jest.Mock).mockResolvedValue({});

      await updateOrganization(1, { logoUrl: "https://new-logo.png" });

      expect(updateTag).toHaveBeenCalledWith("organizations-list");
    });

    it("does not revalidate list when only website changes", async () => {
      (supabaseModule.updateOrganization as jest.Mock).mockResolvedValue({});

      await updateOrganization(1, { website: "https://newsite.com" }, "org");

      expect(updateTag).toHaveBeenCalledWith("organization:org");
      expect(updateTag).toHaveBeenCalledWith("organization:1");
      expect(updateTag).not.toHaveBeenCalledWith("organizations-list");
    });

    it("updates without slug parameter", async () => {
      (supabaseModule.updateOrganization as jest.Mock).mockResolvedValue({});

      const result = await updateOrganization(1, { name: "Test" });

      expect(result.success).toBe(true);
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("returns error when update fails", async () => {
      (supabaseModule.updateOrganization as jest.Mock).mockRejectedValue(
        new Error("Organization not found")
      );

      const result = await updateOrganization(999, { name: "Test" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to update organization");
      }
    });

    it("returns error when unauthorized", async () => {
      (supabaseModule.updateOrganization as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await updateOrganization(1, { name: "Test" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to update organization");
      }
    });
  });

  describe("inviteToOrganization", () => {
    it("successfully invites a user", async () => {
      const mockResult = { id: 1 };
      (supabaseModule.inviteToOrganization as jest.Mock).mockResolvedValue(
        mockResult
      );

      const result = await inviteToOrganization(1, "user-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.invitationId).toBe(1);
      }
      expect(supabaseModule.inviteToOrganization).toHaveBeenCalledWith(
        mockSupabase,
        1,
        "user-123"
      );
    });

    it("returns error when invitation fails", async () => {
      (supabaseModule.inviteToOrganization as jest.Mock).mockRejectedValue(
        new Error("User already invited")
      );

      const result = await inviteToOrganization(1, "user-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to send invitation");
      }
    });

    it("returns error when user not found", async () => {
      (supabaseModule.inviteToOrganization as jest.Mock).mockRejectedValue(
        new Error("User does not exist")
      );

      const result = await inviteToOrganization(1, "nonexistent-user");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to send invitation");
      }
    });

    it("returns error when not authorized to invite", async () => {
      (supabaseModule.inviteToOrganization as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await inviteToOrganization(1, "user-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to send invitation");
      }
    });
  });

  describe("acceptOrganizationInvitation", () => {
    it("successfully accepts invitation", async () => {
      (
        supabaseModule.acceptOrganizationInvitation as jest.Mock
      ).mockResolvedValue({});

      const result = await acceptOrganizationInvitation(1, "test-org");

      expect(result.success).toBe(true);
      expect(supabaseModule.acceptOrganizationInvitation).toHaveBeenCalledWith(
        mockSupabase,
        1
      );
      expect(updateTag).toHaveBeenCalledWith("organization:test-org");
    });

    it("accepts invitation without slug", async () => {
      (
        supabaseModule.acceptOrganizationInvitation as jest.Mock
      ).mockResolvedValue({});

      const result = await acceptOrganizationInvitation(1);

      expect(result.success).toBe(true);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("returns error when acceptance fails", async () => {
      (
        supabaseModule.acceptOrganizationInvitation as jest.Mock
      ).mockRejectedValue(new Error("Invitation not found"));

      const result = await acceptOrganizationInvitation(999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to accept invitation");
      }
    });

    it("returns error when invitation already accepted", async () => {
      (
        supabaseModule.acceptOrganizationInvitation as jest.Mock
      ).mockRejectedValue(new Error("Invitation already accepted"));

      const result = await acceptOrganizationInvitation(1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to accept invitation");
      }
    });
  });

  describe("declineOrganizationInvitation", () => {
    it("successfully declines invitation", async () => {
      (
        supabaseModule.declineOrganizationInvitation as jest.Mock
      ).mockResolvedValue({});

      const result = await declineOrganizationInvitation(1);

      expect(result.success).toBe(true);
      expect(supabaseModule.declineOrganizationInvitation).toHaveBeenCalledWith(
        mockSupabase,
        1
      );
    });

    it("returns error when decline fails", async () => {
      (
        supabaseModule.declineOrganizationInvitation as jest.Mock
      ).mockRejectedValue(new Error("Invitation not found"));

      const result = await declineOrganizationInvitation(999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to decline invitation");
      }
    });

    it("returns error when invitation already declined", async () => {
      (
        supabaseModule.declineOrganizationInvitation as jest.Mock
      ).mockRejectedValue(new Error("Invitation already declined"));

      const result = await declineOrganizationInvitation(1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to decline invitation");
      }
    });
  });

  describe("leaveOrganization", () => {
    it("successfully leaves organization", async () => {
      (supabaseModule.leaveOrganization as jest.Mock).mockResolvedValue({});

      const result = await leaveOrganization(1, "test-org");

      expect(result.success).toBe(true);
      expect(supabaseModule.leaveOrganization).toHaveBeenCalledWith(
        mockSupabase,
        1
      );
      expect(updateTag).toHaveBeenCalledWith("organization:test-org");
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("leaves organization without slug", async () => {
      (supabaseModule.leaveOrganization as jest.Mock).mockResolvedValue({});

      const result = await leaveOrganization(1);

      expect(result.success).toBe(true);
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("returns error when leave fails", async () => {
      (supabaseModule.leaveOrganization as jest.Mock).mockRejectedValue(
        new Error("Not a member")
      );

      const result = await leaveOrganization(1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to leave organization");
      }
    });

    it("returns error when last owner tries to leave", async () => {
      (supabaseModule.leaveOrganization as jest.Mock).mockRejectedValue(
        new Error("Cannot leave as last owner")
      );

      const result = await leaveOrganization(1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to leave organization");
      }
    });
  });

  describe("removeStaff", () => {
    it("successfully removes staff member", async () => {
      (supabaseModule.removeStaff as jest.Mock).mockResolvedValue({});

      const result = await removeStaff(1, "user-123", "test-org");

      expect(result.success).toBe(true);
      expect(supabaseModule.removeStaff).toHaveBeenCalledWith(
        mockSupabase,
        1,
        "user-123"
      );
      expect(updateTag).toHaveBeenCalledWith("organization:test-org");
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("removes staff without slug", async () => {
      (supabaseModule.removeStaff as jest.Mock).mockResolvedValue({});

      const result = await removeStaff(1, "user-123");

      expect(result.success).toBe(true);
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("returns error when removal fails", async () => {
      (supabaseModule.removeStaff as jest.Mock).mockRejectedValue(
        new Error("Staff member not found")
      );

      const result = await removeStaff(1, "nonexistent-user");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to remove staff");
      }
    });

    it("returns error when not authorized", async () => {
      (supabaseModule.removeStaff as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await removeStaff(1, "user-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to remove staff");
      }
    });

    it("returns error when trying to remove owner", async () => {
      (supabaseModule.removeStaff as jest.Mock).mockRejectedValue(
        new Error("Cannot remove owner")
      );

      const result = await removeStaff(1, "owner-id");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to remove staff");
      }
    });
  });
});
