import {
  createCommunity,
  updateCommunity,
  inviteToCommunity,
  acceptCommunityInvitation,
  declineCommunityInvitation,
  leaveCommunity,
  removeStaff,
  addStaffMember,
  addStaffToGroup,
  removeStaffFromGroup,
  changeStaffRole,
  removeStaffCompletely,
} from "../communities";
import type { TypedClient } from "../../client";
import { createMockClient } from "@trainers/test-utils/mocks";
import { organizationFactory } from "@trainers/test-utils/factories";
import { getInvitationExpiryDate } from "../../constants";
import type { CommunitySocialLink } from "@trainers/validators";

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

describe("Community Mutations", () => {
  let mockClient: TypedClient;
  const mockUser = { id: "user-123", email: "test@example.com" };
  const mockExpiryDate = "2026-03-01T00:00:00.000Z";

  beforeEach(() => {
    mockClient = createMockClient() as unknown as TypedClient;
    jest.clearAllMocks();
    (getInvitationExpiryDate as jest.Mock).mockReturnValue(mockExpiryDate);
  });

  describe("createCommunity", () => {
    const communityData = {
      name: "Test Org",
      slug: "test-org",
      description: "A test community",
      logoUrl: "https://test.org/logo.png",
    };

    // Helper: mock a successful create flow (slug check + insert + staff insert)
    function mockSuccessfulCreate(
      fromSpy: jest.SpyInstance,
      overrides?: Partial<ReturnType<typeof organizationFactory.build>>
    ) {
      const mockOrg = organizationFactory.build({
        name: communityData.name,
        slug: communityData.slug,
        ...overrides,
      });

      // Check slug uniqueness
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Create community
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

    it("should create community successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const { mockOrg } = mockSuccessfulCreate(fromSpy);

      const result = await createCommunity(mockClient, communityData);

      expect(result).toEqual(mockOrg);
    });

    it("should create community with valid social links", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const socialLinks: CommunitySocialLink[] = [
        { platform: "discord", url: "https://discord.gg/test" },
        { platform: "twitter", url: "https://x.com/test" },
      ];
      const { insertMock } = mockSuccessfulCreate(fromSpy);

      await createCommunity(mockClient, { ...communityData, socialLinks });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          social_links: socialLinks,
        })
      );
    });

    it("should create community with empty social links array", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const { insertMock } = mockSuccessfulCreate(fromSpy);

      await createCommunity(mockClient, { ...communityData, socialLinks: [] });

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
          createCommunity(mockClient, {
            ...communityData,
            socialLinks: links as CommunitySocialLink[],
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

      await createCommunity(mockClient, {
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

      await expect(createCommunity(mockClient, communityData)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if slug already taken", async () => {
      const existingCommunity = organizationFactory.build({
        slug: communityData.slug,
      });
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: existingCommunity, error: null }),
      });

      await expect(createCommunity(mockClient, communityData)).rejects.toThrow(
        "Community slug is already taken"
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

      await expect(createCommunity(mockClient, communityData)).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("updateCommunity", () => {
    const communityId = 1;
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
            id: communityId,
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

    it("should update community successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      mockSuccessfulUpdate(fromSpy);

      const result = await updateCommunity(mockClient, communityId, updates);

      expect(result).toEqual({ success: true });
    });

    it("should only update provided fields", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const { updateMock } = mockSuccessfulUpdate(fromSpy);

      await updateCommunity(mockClient, communityId, { name: "New Name" });

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
        links: [] as CommunitySocialLink[],
      },
    ])("should update with valid social links ($desc)", async ({ links }) => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const { updateMock } = mockSuccessfulUpdate(fromSpy);

      await updateCommunity(mockClient, communityId, { socialLinks: links });

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
          updateCommunity(mockClient, communityId, {
            socialLinks: links as CommunitySocialLink[],
          })
        ).rejects.toThrow("Invalid social links");
      }
    );

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        updateCommunity(mockClient, communityId, updates)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if community not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        updateCommunity(mockClient, communityId, updates)
      ).rejects.toThrow("Community not found");
    });

    it("should throw error if user is not owner", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: organizationFactory.build({
            id: communityId,
            owner_user_id: "different-user",
          }),
          error: null,
        }),
      });

      await expect(
        updateCommunity(mockClient, communityId, updates)
      ).rejects.toThrow("You don't have permission to update this community");
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
        updateCommunity(mockClient, communityId, updates)
      ).rejects.toThrow("Update failed");
    });
  });

  describe("inviteToCommunity", () => {
    const communityId = 1;
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
        community_id: communityId,
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

      const result = await inviteToCommunity(
        mockClient,
        communityId,
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

      await inviteToCommunity(mockClient, communityId, invitedUserId);

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ expires_at: mockExpiryDate })
      );
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        inviteToCommunity(mockClient, communityId, invitedUserId)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if user is already staff", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
      });

      await expect(
        inviteToCommunity(mockClient, communityId, invitedUserId)
      ).rejects.toThrow("User is already staff of this community");
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
        inviteToCommunity(mockClient, communityId, invitedUserId)
      ).rejects.toThrow("User already has a pending invitation");
    });
  });

  describe("acceptCommunityInvitation", () => {
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

      const result = await acceptCommunityInvitation(mockClient, invitationId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        acceptCommunityInvitation(mockClient, invitationId)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if invitation not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        acceptCommunityInvitation(mockClient, invitationId)
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
        acceptCommunityInvitation(mockClient, invitationId)
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
        acceptCommunityInvitation(mockClient, invitationId)
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
        acceptCommunityInvitation(mockClient, invitationId)
      ).rejects.toThrow("Invitation has expired");
    });
  });

  describe("declineCommunityInvitation", () => {
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

      const result = await declineCommunityInvitation(mockClient, invitationId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        declineCommunityInvitation(mockClient, invitationId)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if invitation not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        declineCommunityInvitation(mockClient, invitationId)
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
        declineCommunityInvitation(mockClient, invitationId)
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
        declineCommunityInvitation(mockClient, invitationId)
      ).rejects.toThrow("Invitation is no longer pending");
    });
  });

  describe("leaveCommunity", () => {
    const communityId = 1;

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should leave community successfully", async () => {
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

      const result = await leaveCommunity(mockClient, communityId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(leaveCommunity(mockClient, communityId)).rejects.toThrow(
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

      await expect(leaveCommunity(mockClient, communityId)).rejects.toThrow(
        "Community owner cannot leave. Transfer ownership first."
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

      await expect(leaveCommunity(mockClient, communityId)).rejects.toThrow(
        "Delete failed"
      );
    });
  });

  describe("removeStaff", () => {
    const communityId = 1;
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

      const result = await removeStaff(mockClient, communityId, staffUserId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        removeStaff(mockClient, communityId, staffUserId)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if community not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        removeStaff(mockClient, communityId, staffUserId)
      ).rejects.toThrow("Community not found");
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

      await expect(
        removeStaff(mockClient, communityId, staffUserId)
      ).rejects.toThrow("Only the owner can remove staff");
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

      await expect(
        removeStaff(mockClient, communityId, mockUser.id)
      ).rejects.toThrow("Cannot remove the owner");
    });
  });

  describe("addStaffMember", () => {
    const communityId = 1;
    const userId = "user-456";

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should add staff member successfully as owner", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isCommunityOwner check - user IS the owner (will short circuit permission check)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkCommunityPermission is still called (the logic is !ownerCheck && !permCheck)
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

      const result = await addStaffMember(mockClient, communityId, userId);

      expect(result).toEqual({ success: true });
    });

    it("should add staff member with permission check", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isCommunityOwner check - get community
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "different-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkCommunityPermission - has permission
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

      const result = await addStaffMember(mockClient, communityId, userId);

      expect(result).toEqual({ success: true });
      expect(rpcMock).toHaveBeenCalledWith("has_community_permission", {
        p_community_id: communityId,
        permission_key: "community.staff.manage",
      });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        addStaffMember(mockClient, communityId, userId)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if no permission", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isCommunityOwner check - not owner
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "different-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkCommunityPermission - no permission
      rpcMock.mockResolvedValueOnce({ data: false, error: null });

      await expect(
        addStaffMember(mockClient, communityId, userId)
      ).rejects.toThrow("You don't have permission to manage staff");
    });

    it("should throw error if user is already staff", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isCommunityOwner check
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

      await expect(
        addStaffMember(mockClient, communityId, userId)
      ).rejects.toThrow("User is already a staff member");
    });
  });

  describe("addStaffToGroup", () => {
    const communityId = 1;
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

      // isCommunityOwner check - get community (not owner)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "other-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkCommunityPermission - has permission
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Verify group
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: groupId, community_id: communityId },
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

      // Get community groups
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

      const result = await addStaffToGroup(
        mockClient,
        communityId,
        userId,
        groupId
      );

      expect(result).toEqual({ success: true });
    });

    it("should throw error if group not found", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isCommunityOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkCommunityPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Verify group (not found)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      await expect(
        addStaffToGroup(mockClient, communityId, userId, groupId)
      ).rejects.toThrow("Group not found");
    });

    it("should throw error if group does not belong to community", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isCommunityOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkCommunityPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Verify group (belongs to different community)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: groupId, community_id: 999 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        addStaffToGroup(mockClient, communityId, userId, groupId)
      ).rejects.toThrow("Group does not belong to this community");
    });

    it("should throw error if group has no role", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isCommunityOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkCommunityPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Verify group
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: groupId, community_id: communityId },
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
        addStaffToGroup(mockClient, communityId, userId, groupId)
      ).rejects.toThrow("Group has no associated role");
    });
  });

  describe("removeStaffFromGroup", () => {
    const communityId = 1;
    const userId = "user-456";

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should remove staff from group successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isCommunityOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkCommunityPermission RPC (both checks are evaluated)
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get community groups
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

      const result = await removeStaffFromGroup(
        mockClient,
        communityId,
        userId
      );

      expect(result).toEqual({ success: true });
    });

    it("should return success if no groups exist", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isCommunityOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkCommunityPermission RPC (both checks are evaluated)
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get community groups - empty
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      } as unknown as MockQueryBuilder);

      const result = await removeStaffFromGroup(
        mockClient,
        communityId,
        userId
      );

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        removeStaffFromGroup(mockClient, communityId, userId)
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("changeStaffRole", () => {
    const communityId = 1;
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

      // changeStaffRole - isCommunityOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // changeStaffRole - checkCommunityPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get community to verify not changing owner role
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "different-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // addStaffToGroup - isCommunityOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // addStaffToGroup - checkCommunityPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Verify group
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: newGroupId, community_id: communityId },
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

      // Get community groups
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
        communityId,
        userId,
        newGroupId
      );

      expect(result).toEqual({ success: true });
    });

    it("should throw error if trying to change owner role", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // changeStaffRole - isCommunityOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // changeStaffRole - checkCommunityPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get community to verify if changing owner role (userId IS the owner)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: userId },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        changeStaffRole(mockClient, communityId, userId, newGroupId)
      ).rejects.toThrow("Cannot change the owner's role");
    });
  });

  describe("removeStaffCompletely", () => {
    const communityId = 1;
    const userId = "user-456";

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should remove staff completely", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // removeStaffCompletely - isCommunityOwner check
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

      // Get community to verify not removing owner
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "different-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // removeStaffFromGroup - isCommunityOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // removeStaffFromGroup - checkCommunityPermission RPC
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get community groups
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

      const result = await removeStaffCompletely(
        mockClient,
        communityId,
        userId
      );

      expect(result).toEqual({ success: true });
    });

    it("should throw error if trying to remove owner", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isCommunityOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkCommunityPermission RPC (both checks are evaluated)
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get community to verify (owner_user_id IS the userId being removed)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        removeStaffCompletely(mockClient, communityId, mockUser.id)
      ).rejects.toThrow("Cannot remove the community owner");
    });

    it("should throw error if trying to remove yourself", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const rpcMock = mockClient.rpc as jest.Mock;

      // isCommunityOwner check
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: mockUser.id },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // checkCommunityPermission RPC (both checks are evaluated)
      rpcMock.mockResolvedValueOnce({ data: true, error: null });

      // Get community to verify (owner is different, but userId === currentUser.id)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: "different-user" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        removeStaffCompletely(mockClient, communityId, mockUser.id)
      ).rejects.toThrow(
        "Cannot remove yourself. Use 'Leave Community' instead."
      );
    });
  });
});
