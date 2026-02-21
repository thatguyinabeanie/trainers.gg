import {
  createOrganization,
  updateOrganization,
  inviteToOrganization,
  acceptOrganizationInvitation,
  declineOrganizationInvitation,
  leaveOrganization,
  removeStaff,
  addStaffMember,
  addStaffToGroup,
  removeStaffFromGroup,
  changeStaffRole,
  removeStaffCompletely,
} from "../organizations";
import type { TypedClient } from "../../client";
import { createMockClient } from "@trainers/test-utils/mocks";
import { organizationFactory } from "@trainers/test-utils/factories";
import { getInvitationExpiryDate } from "../../constants";
import type { OrganizationSocialLink } from "@trainers/validators";

jest.mock("../../constants", () => ({
  getInvitationExpiryDate: jest.fn(),
}));

type MockQueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  update: jest.Mock;
  insert: jest.Mock;
  delete: jest.Mock;
  in: jest.Mock;
};

type MockAuthResponse = {
  data: { user: { id: string; email?: string } | null };
};

describe("Organization Mutations", () => {
  let mockClient: TypedClient;
  const mockUser = { id: "user-123", email: "test@example.com" };
  const mockExpiryDate = "2026-03-01T00:00:00.000Z";

  beforeEach(() => {
    mockClient = createMockClient() as unknown as TypedClient;
    jest.clearAllMocks();
    (getInvitationExpiryDate as jest.Mock).mockReturnValue(mockExpiryDate);
  });

  describe("createOrganization", () => {
    const orgData = {
      name: "Test Org",
      slug: "test-org",
      description: "A test organization",
      logoUrl: "https://test.org/logo.png",
    };

    // Helper: mock a successful create flow (slug check + insert + staff insert)
    function mockSuccessfulCreate(
      fromSpy: jest.SpyInstance,
      overrides?: Partial<ReturnType<typeof organizationFactory.build>>
    ) {
      const mockOrg = organizationFactory.build({
        name: orgData.name,
        slug: orgData.slug,
        ...overrides,
      });

      // Check slug uniqueness
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Create organization
      const insertMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockOrg, error: null }),
      } as unknown as MockQueryBuilder);

      // Add user as staff
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      return { mockOrg, insertMock };
    }

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should create organization successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const { mockOrg } = mockSuccessfulCreate(fromSpy);

      const result = await createOrganization(mockClient, orgData);

      expect(result).toEqual(mockOrg);
    });

    it("should create organization with valid social links", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const socialLinks: OrganizationSocialLink[] = [
        { platform: "discord", url: "https://discord.gg/test" },
        { platform: "twitter", url: "https://x.com/test" },
      ];
      const { insertMock } = mockSuccessfulCreate(fromSpy);

      await createOrganization(mockClient, { ...orgData, socialLinks });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          social_links: socialLinks,
        })
      );
    });

    it("should create organization with empty social links array", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const { insertMock } = mockSuccessfulCreate(fromSpy);

      await createOrganization(mockClient, { ...orgData, socialLinks: [] });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          social_links: [],
        })
      );
    });

    it.each([
      {
        desc: "invalid URL",
        links: [{ platform: "discord" as const, url: "not-a-url" }],
      },
      {
        desc: "unknown platform",
        links: [
          { platform: "myspace" as unknown, url: "https://myspace.com/test" },
        ],
      },
    ])(
      "should throw error for invalid social links ($desc)",
      async ({ links }) => {
        const fromSpy = jest.spyOn(mockClient, "from");

        // Check slug uniqueness
        fromSpy.mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        } as unknown as MockQueryBuilder);

        await expect(
          createOrganization(mockClient, {
            ...orgData,
            socialLinks: links as OrganizationSocialLink[],
          })
        ).rejects.toThrow("Invalid social links");
      }
    );

    it("should lowercase the slug", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const mockOrg = organizationFactory.build({ slug: "mixedcase" });

      const eqMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: eqMock,
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      const insertMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockOrg, error: null }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await createOrganization(mockClient, {
        name: "Test",
        slug: "MixedCase",
      });

      expect(eqMock).toHaveBeenCalledWith("slug", "mixedcase");
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "mixedcase" })
      );
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(createOrganization(mockClient, orgData)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if slug already taken", async () => {
      const existingOrg = organizationFactory.build({ slug: orgData.slug });
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existingOrg, error: null }),
      });

      await expect(createOrganization(mockClient, orgData)).rejects.toThrow(
        "Organization slug is already taken"
      );
    });

    it("should propagate database errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      const dbError = new Error("Database error");
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError }),
      } as unknown as MockQueryBuilder);

      await expect(createOrganization(mockClient, orgData)).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("updateOrganization", () => {
    const orgId = 1;
    const updates = {
      name: "Updated Name",
      description: "Updated description",
      logoUrl: "https://updated.org/logo.png",
    };

    // Helper: mock ownership check returning a specific owner
    function mockOwnershipCheck(
      fromSpy: jest.SpyInstance,
      ownerUserId: string
    ) {
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: organizationFactory.build({
            id: orgId,
            owner_user_id: ownerUserId,
          }),
          error: null,
        }),
      } as unknown as MockQueryBuilder);
    }

    // Helper: mock a successful update flow (ownership check + update)
    function mockSuccessfulUpdate(fromSpy: jest.SpyInstance) {
      mockOwnershipCheck(fromSpy, mockUser.id);

      const updateMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      return { updateMock };
    }

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should update organization successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      mockSuccessfulUpdate(fromSpy);

      const result = await updateOrganization(mockClient, orgId, updates);

      expect(result).toEqual({ success: true });
    });

    it("should only update provided fields", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const { updateMock } = mockSuccessfulUpdate(fromSpy);

      await updateOrganization(mockClient, orgId, { name: "New Name" });

      expect(updateMock).toHaveBeenCalledWith({ name: "New Name" });
    });

    it.each([
      {
        desc: "single social link",
        links: [
          { platform: "discord" as const, url: "https://discord.gg/test" },
        ],
      },
      {
        desc: "multiple social links",
        links: [
          { platform: "discord" as const, url: "https://discord.gg/test" },
          { platform: "twitter" as const, url: "https://x.com/test" },
          { platform: "youtube" as const, url: "https://youtube.com/c/test" },
        ],
      },
      {
        desc: "empty social links array",
        links: [] as OrganizationSocialLink[],
      },
    ])("should update with valid social links ($desc)", async ({ links }) => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const { updateMock } = mockSuccessfulUpdate(fromSpy);

      await updateOrganization(mockClient, orgId, { socialLinks: links });

      expect(updateMock).toHaveBeenCalledWith({
        social_links: links,
      });
    });

    it.each([
      {
        desc: "invalid URL",
        links: [{ platform: "discord" as const, url: "not-a-url" }],
      },
      {
        desc: "unknown platform",
        links: [
          { platform: "myspace" as unknown, url: "https://myspace.com/test" },
        ],
      },
    ])(
      "should throw error for invalid social links ($desc)",
      async ({ links }) => {
        const fromSpy = jest.spyOn(mockClient, "from");
        mockOwnershipCheck(fromSpy, mockUser.id);

        await expect(
          updateOrganization(mockClient, orgId, {
            socialLinks: links as OrganizationSocialLink[],
          })
        ).rejects.toThrow("Invalid social links");
      }
    );

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        updateOrganization(mockClient, orgId, updates)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if organization not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        updateOrganization(mockClient, orgId, updates)
      ).rejects.toThrow("Organization not found");
    });

    it("should throw error if user is not owner", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: organizationFactory.build({
            id: orgId,
            owner_user_id: "different-user",
          }),
          error: null,
        }),
      });

      await expect(
        updateOrganization(mockClient, orgId, updates)
      ).rejects.toThrow(
        "You don't have permission to update this organization"
      );
    });

    it("should propagate database errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      mockOwnershipCheck(fromSpy, mockUser.id);

      const dbError = new Error("Update failed");
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: dbError }),
      } as unknown as MockQueryBuilder);

      await expect(
        updateOrganization(mockClient, orgId, updates)
      ).rejects.toThrow("Update failed");
    });
  });

  describe("inviteToOrganization", () => {
    const orgId = 1;
    const invitedUserId = "user-456";

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should create invitation successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const mockInvitation = {
        id: 1,
        organization_id: orgId,
        invited_user_id: invitedUserId,
      };

      // Check not already staff
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Check no pending invitation
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Create invitation
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockInvitation,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await inviteToOrganization(
        mockClient,
        orgId,
        invitedUserId
      );

      expect(result).toEqual(mockInvitation);
    });

    it("should use correct expiry date from helper", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      const insertMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 1 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await inviteToOrganization(mockClient, orgId, invitedUserId);

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ expires_at: mockExpiryDate })
      );
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        inviteToOrganization(mockClient, orgId, invitedUserId)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if user is already staff", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
      });

      await expect(
        inviteToOrganization(mockClient, orgId, invitedUserId)
      ).rejects.toThrow("User is already staff of this organization");
    });

    it("should throw error if pending invitation exists", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Not staff
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Has pending invitation
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
      } as unknown as MockQueryBuilder);

      await expect(
        inviteToOrganization(mockClient, orgId, invitedUserId)
      ).rejects.toThrow("User already has a pending invitation");
    });
  });

  describe("acceptOrganizationInvitation", () => {
    const invitationId = 1;
    const mockInvitation = {
      id: invitationId,
      invited_user_id: mockUser.id,
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should accept invitation successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Get invitation
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockInvitation,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Update invitation
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await acceptOrganizationInvitation(
        mockClient,
        invitationId
      );

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        acceptOrganizationInvitation(mockClient, invitationId)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if invitation not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        acceptOrganizationInvitation(mockClient, invitationId)
      ).rejects.toThrow("Invitation not found");
    });

    it("should throw error if invitation is for different user", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockInvitation, invited_user_id: "different-user" },
          error: null,
        }),
      });

      await expect(
        acceptOrganizationInvitation(mockClient, invitationId)
      ).rejects.toThrow("This invitation is not for you");
    });

    it("should throw error if invitation is not pending", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockInvitation, status: "accepted" },
          error: null,
        }),
      });

      await expect(
        acceptOrganizationInvitation(mockClient, invitationId)
      ).rejects.toThrow("Invitation is no longer pending");
    });

    it("should throw error if invitation has expired", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockInvitation,
            expires_at: new Date(Date.now() - 86400000).toISOString(),
          },
          error: null,
        }),
      });

      await expect(
        acceptOrganizationInvitation(mockClient, invitationId)
      ).rejects.toThrow("Invitation has expired");
    });
  });

  describe("declineOrganizationInvitation", () => {
    const invitationId = 1;
    const mockInvitation = {
      id: invitationId,
      invited_user_id: mockUser.id,
      status: "pending",
    };

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should decline invitation successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockInvitation,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await declineOrganizationInvitation(
        mockClient,
        invitationId
      );

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        declineOrganizationInvitation(mockClient, invitationId)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if invitation not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        declineOrganizationInvitation(mockClient, invitationId)
      ).rejects.toThrow("Invitation not found");
    });

    it("should throw error if invitation is for different user", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockInvitation, invited_user_id: "different-user" },
          error: null,
        }),
      });

      await expect(
        declineOrganizationInvitation(mockClient, invitationId)
      ).rejects.toThrow("This invitation is not for you");
    });

    it("should throw error if invitation is not pending", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockInvitation, status: "declined" },
          error: null,
        }),
      });

      await expect(
        declineOrganizationInvitation(mockClient, invitationId)
      ).rejects.toThrow("Invitation is no longer pending");
    });
  });

  describe("leaveOrganization", () => {
    const orgId = 1;

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should leave organization successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Check user is not owner
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "different-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Delete staff record (with chained eq calls)
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      } as unknown as MockQueryBuilder);

      // Mock second eq call result
      (mockClient.eq as jest.Mock).mockResolvedValueOnce({ error: null });

      const result = await leaveOrganization(mockClient, orgId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(leaveOrganization(mockClient, orgId)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if user is owner", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      });

      await expect(leaveOrganization(mockClient, orgId)).rejects.toThrow(
        "Organization owner cannot leave. Transfer ownership first."
      );
    });

    it("should propagate delete errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "different-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const dbError = new Error("Delete failed");
      const secondEqMock = jest.fn().mockResolvedValue({ error: dbError });
      const firstEqMock = jest.fn().mockReturnValue({ eq: secondEqMock });
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({ eq: firstEqMock }),
      } as unknown as MockQueryBuilder);

      await expect(leaveOrganization(mockClient, orgId)).rejects.toThrow(
        "Delete failed"
      );
    });
  });

  describe("removeStaff", () => {
    const orgId = 1;
    const staffUserId = "user-456";

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should remove staff successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Verify ownership
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Delete staff (with chained eq calls)
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      } as unknown as MockQueryBuilder);

      (mockClient.eq as jest.Mock).mockResolvedValueOnce({ error: null });

      const result = await removeStaff(mockClient, orgId, staffUserId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(removeStaff(mockClient, orgId, staffUserId)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if organization not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(removeStaff(mockClient, orgId, staffUserId)).rejects.toThrow(
        "Organization not found"
      );
    });

    it("should throw error if user is not owner", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "different-user" },
          error: null,
        }),
      });

      await expect(removeStaff(mockClient, orgId, staffUserId)).rejects.toThrow(
        "Only the owner can remove staff"
      );
    });

    it("should throw error if trying to remove owner", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      });

      await expect(removeStaff(mockClient, orgId, mockUser.id)).rejects.toThrow(
        "Cannot remove the owner"
      );
    });
  });

  describe("addStaffMember", () => {
    const orgId = 1;
    const userId = "user-456";

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should add staff member successfully as owner", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isOrgOwner check - user IS the owner (will short circuit permission check)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkOrgPermission is still called (the logic is !ownerCheck && !permCheck)
      // Both are evaluated, so we need to mock the RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Check existing staff
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Insert staff
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await addStaffMember(mockClient, orgId, userId);

      expect(result).toEqual({ success: true });
    });

    it("should add staff member with permission check", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isOrgOwner check - get org
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "different-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkOrgPermission - has permission
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Check existing staff
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Insert staff
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await addStaffMember(mockClient, orgId, userId);

      expect(result).toEqual({ success: true });
      expect(rpcMock).toHaveBeenCalledWith("has_org_permission", {
        org_id: orgId,
        permission_key: "org.staff.manage",
      });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(addStaffMember(mockClient, orgId, userId)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if no permission", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isOrgOwner check - not owner
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "different-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkOrgPermission - no permission
      rpcMock.mockResolvedValueOnce({ data: false, error: null });

      await expect(addStaffMember(mockClient, orgId, userId)).rejects.toThrow(
        "You don't have permission to manage staff"
      );
    });

    it("should throw error if user is already staff", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isOrgOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock RPC (both checks are evaluated)
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Check existing staff - user already exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 1 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(addStaffMember(mockClient, orgId, userId)).rejects.toThrow(
        "User is already a staff member"
      );
    });
  });

  describe("addStaffToGroup", () => {
    const orgId = 1;
    const userId = "user-456";
    const groupId = 10;

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should add staff to group successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isOrgOwner check - get org (not owner)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "other-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkOrgPermission - has permission
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Verify group
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: groupId, organization_id: orgId },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Get group role
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 20 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Check existing staff
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Insert staff
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Get org groups
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest
          .fn()
          .mockResolvedValue({ data: [{ id: groupId }], error: null }),
      } as unknown as MockQueryBuilder);

      // Get group roles
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [{ id: 20 }], error: null }),
      } as unknown as MockQueryBuilder);

      // Delete existing user_group_roles (with chained eq and in)
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Insert user_group_role
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await addStaffToGroup(mockClient, orgId, userId, groupId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if group not found", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isOrgOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkOrgPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Verify group (not found)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      await expect(
        addStaffToGroup(mockClient, orgId, userId, groupId)
      ).rejects.toThrow("Group not found");
    });

    it("should throw error if group does not belong to organization", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isOrgOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkOrgPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Verify group (belongs to different org)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: groupId, organization_id: 999 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        addStaffToGroup(mockClient, orgId, userId, groupId)
      ).rejects.toThrow("Group does not belong to this organization");
    });

    it("should throw error if group has no role", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isOrgOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkOrgPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Verify group
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: groupId, organization_id: orgId },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Get group role (not found)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      await expect(
        addStaffToGroup(mockClient, orgId, userId, groupId)
      ).rejects.toThrow("Group has no associated role");
    });
  });

  describe("removeStaffFromGroup", () => {
    const orgId = 1;
    const userId = "user-456";

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should remove staff from group successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isOrgOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkOrgPermission RPC (both checks are evaluated)
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get org groups
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 10 }, { id: 20 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Get group roles
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: 30 }, { id: 40 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Delete user_group_roles (with chained eq and in)
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await removeStaffFromGroup(mockClient, orgId, userId);

      expect(result).toEqual({ success: true });
    });

    it("should return success if no groups exist", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isOrgOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkOrgPermission RPC (both checks are evaluated)
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get org groups - empty
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      } as unknown as MockQueryBuilder);

      const result = await removeStaffFromGroup(mockClient, orgId, userId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        removeStaffFromGroup(mockClient, orgId, userId)
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("changeStaffRole", () => {
    const orgId = 1;
    const userId = "user-456";
    const newGroupId = 10;

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should change staff role successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // changeStaffRole - isOrgOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // changeStaffRole - checkOrgPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get org to verify not changing owner role
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "different-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // addStaffToGroup - isOrgOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // addStaffToGroup - checkOrgPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Verify group
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: newGroupId, organization_id: orgId },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Get group role
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 20 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Check existing staff
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: { id: 1 }, error: null }),
      } as unknown as MockQueryBuilder);

      // Get org groups
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest
          .fn()
          .mockResolvedValue({ data: [{ id: newGroupId }], error: null }),
      } as unknown as MockQueryBuilder);

      // Get group roles
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [{ id: 20 }], error: null }),
      } as unknown as MockQueryBuilder);

      // Delete existing user_group_roles
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Insert user_group_role
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await changeStaffRole(
        mockClient,
        orgId,
        userId,
        newGroupId
      );

      expect(result).toEqual({ success: true });
    });

    it("should throw error if trying to change owner role", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // changeStaffRole - isOrgOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // changeStaffRole - checkOrgPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get org to verify if changing owner role (userId IS the owner)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: userId },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        changeStaffRole(mockClient, orgId, userId, newGroupId)
      ).rejects.toThrow("Cannot change the owner's role");
    });
  });

  describe("removeStaffCompletely", () => {
    const orgId = 1;
    const userId = "user-456";

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should remove staff completely", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // removeStaffCompletely - isOrgOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock RPC (both checks are evaluated)
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get org to verify not removing owner
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "different-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // removeStaffFromGroup - isOrgOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // removeStaffFromGroup - checkOrgPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get org groups
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      } as unknown as MockQueryBuilder);

      // Delete staff (with chained eq calls)
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      } as unknown as MockQueryBuilder);

      (mockClient.eq as jest.Mock).mockResolvedValueOnce({ error: null });

      const result = await removeStaffCompletely(mockClient, orgId, userId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if trying to remove owner", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isOrgOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkOrgPermission RPC (both checks are evaluated)
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get org to verify (owner_user_id IS the userId being removed)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        removeStaffCompletely(mockClient, orgId, mockUser.id)
      ).rejects.toThrow("Cannot remove the organization owner");
    });

    it("should throw error if trying to remove yourself", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isOrgOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkOrgPermission RPC (both checks are evaluated)
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get org to verify (owner is different, but userId === currentUser.id)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "different-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        removeStaffCompletely(mockClient, orgId, mockUser.id)
      ).rejects.toThrow(
        "Cannot remove yourself. Use 'Leave Organization' instead."
      );
    });
  });
});
