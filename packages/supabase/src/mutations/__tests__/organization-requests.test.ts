import {
  submitCommunityRequest,
  approveCommunityRequest,
  rejectCommunityRequest,
} from "../organization-requests";
import type { TypedClient } from "../../client";
import { createMockClient } from "@trainers/test-utils/mocks";
import { organizationRequestFactory } from "@trainers/test-utils/factories";

type MockQueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  update: jest.Mock;
  insert: jest.Mock;
  delete: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
};

type MockAuthResponse = {
  data: { user: { id: string; email?: string } | null };
};

describe("Organization Request Mutations", () => {
  let mockClient: TypedClient;
  const mockUser = { id: "user-123", email: "test@example.com" };
  const ADMIN_USER_ID = "admin-456";

  beforeEach(() => {
    mockClient = createMockClient() as unknown as TypedClient;
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // submitCommunityRequest
  // ---------------------------------------------------------------------------

  describe("submitCommunityRequest", () => {
    const requestData = {
      name: "Pallet Town League",
      slug: "pallet-town-league",
      description: "A competitive league",
    };

    function mockSuccessfulSubmit(fromSpy: jest.SpyInstance) {
      const mockRequest = organizationRequestFactory.build({
        user_id: mockUser.id,
        name: requestData.name,
        slug: requestData.slug,
        description: requestData.description,
        status: "pending",
      });

      // Mock auth.getUser
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);

      let callCount = 0;
      fromSpy.mockImplementation((table: string) => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };

        if (table === "community_requests") {
          callCount++;
          if (callCount === 1) {
            // Pending check — no pending request
            builder.maybeSingle.mockResolvedValue({ data: null });
          } else if (callCount === 2) {
            // Cooldown check — no recent rejection
            builder.maybeSingle.mockResolvedValue({ data: null });
          } else if (callCount === 3) {
            // Slug uniqueness check — no pending with same slug
            builder.maybeSingle.mockResolvedValue({ data: null });
          } else if (callCount === 4) {
            // Insert
            builder.single.mockResolvedValue({
              data: mockRequest,
              error: null,
            });
          }
        } else if (table === "communities") {
          // Slug uniqueness vs communities — not taken
          builder.maybeSingle.mockResolvedValue({ data: null });
        }

        return builder;
      });

      return mockRequest;
    }

    it("creates a request with correct fields", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const expectedRequest = mockSuccessfulSubmit(fromSpy);

      const result = await submitCommunityRequest(mockClient, requestData);

      expect(result).toEqual(expectedRequest);
    });

    it("throws when user is not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        submitCommunityRequest(mockClient, requestData)
      ).rejects.toThrow("Not authenticated");
    });

    it("throws when user has a pending request", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);

      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation(() => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { id: 99 } }),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };
        return builder;
      });

      await expect(
        submitCommunityRequest(mockClient, requestData)
      ).rejects.toThrow("You already have a pending organization request");
    });

    it("throws when within cooldown period after rejection", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);

      // Recent rejection — 2 days ago (within 7 day cooldown)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      let orgRequestCallCount = 0;
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation((table: string) => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };

        if (table === "community_requests") {
          orgRequestCallCount++;
          if (orgRequestCallCount === 1) {
            // No pending request
            builder.maybeSingle.mockResolvedValue({ data: null });
          } else if (orgRequestCallCount === 2) {
            // Recent rejection within cooldown
            builder.maybeSingle.mockResolvedValue({
              data: { reviewed_at: twoDaysAgo.toISOString() },
            });
          }
        }

        return builder;
      });

      await expect(
        submitCommunityRequest(mockClient, requestData)
      ).rejects.toThrow("You can submit a new request after");
    });

    it("throws when slug is already pending by another user", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);

      let orgRequestCallCount = 0;
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation((table: string) => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };

        if (table === "community_requests") {
          orgRequestCallCount++;
          if (orgRequestCallCount === 1) {
            // No pending request
            builder.maybeSingle.mockResolvedValue({ data: null });
          } else if (orgRequestCallCount === 2) {
            // No recent rejection
            builder.maybeSingle.mockResolvedValue({ data: null });
          } else if (orgRequestCallCount === 3) {
            // Slug already pending
            builder.maybeSingle.mockResolvedValue({ data: { id: 99 } });
          }
        } else if (table === "communities") {
          // Slug not taken by existing community
          builder.maybeSingle.mockResolvedValue({ data: null });
        }

        return builder;
      });

      await expect(
        submitCommunityRequest(mockClient, requestData)
      ).rejects.toThrow("This URL slug is already requested by another user");
    });

    it("throws when slug is taken by an existing organization", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);

      let orgRequestCallCount = 0;
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation((table: string) => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };

        if (table === "community_requests") {
          orgRequestCallCount++;
          if (orgRequestCallCount === 1) {
            // No pending request
            builder.maybeSingle.mockResolvedValue({ data: null });
          } else if (orgRequestCallCount === 2) {
            // No recent rejection
            builder.maybeSingle.mockResolvedValue({ data: null });
          }
        } else if (table === "communities") {
          // Slug taken by existing community
          builder.maybeSingle.mockResolvedValue({ data: { id: 1 } });
        }

        return builder;
      });

      await expect(
        submitCommunityRequest(mockClient, requestData)
      ).rejects.toThrow(
        "This URL slug is already taken by an existing organization"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // approveCommunityRequest
  // ---------------------------------------------------------------------------

  describe("approveCommunityRequest", () => {
    it("throws when request is not found", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation(() => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "not found" },
          }),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };
        return builder;
      });

      await expect(
        approveCommunityRequest(mockClient, 1, ADMIN_USER_ID)
      ).rejects.toThrow("Request not found");
    });

    it("throws when request is not pending", async () => {
      const request = organizationRequestFactory.build({
        status: "rejected",
      });

      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation(() => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: request,
            error: null,
          }),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };
        return builder;
      });

      await expect(
        approveCommunityRequest(mockClient, request.id, ADMIN_USER_ID)
      ).rejects.toThrow("Request is no longer pending");
    });

    it("creates org, staff, notification, audit log and returns updated request", async () => {
      const request = organizationRequestFactory.build({
        status: "pending",
        user_id: "requester-789",
      });
      const org = { id: "org-1", name: request.name, slug: request.slug };
      const updatedRequest = { ...request, status: "approved" };

      let callCount = 0;
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation((table: string) => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };

        if (table === "community_requests") {
          callCount++;
          if (callCount === 1) {
            // Fetch request
            builder.single.mockResolvedValue({
              data: request,
              error: null,
            });
          } else {
            // Update request status — returns updated row
            builder.single.mockResolvedValue({
              data: updatedRequest,
              error: null,
            });
          }
        } else if (table === "communities") {
          // First call: slug check (maybeSingle), second call: insert (single)
          builder.maybeSingle.mockResolvedValue({ data: null });
          builder.single.mockResolvedValue({ data: org, error: null });
        } else if (table === "community_staff") {
          builder.insert.mockReturnValue({ error: null });
        } else if (table === "notifications") {
          builder.insert.mockReturnValue({ error: null });
        } else if (table === "audit_log") {
          builder.insert.mockReturnValue({ error: null });
        }

        return builder;
      });

      const result = await approveCommunityRequest(
        mockClient,
        request.id,
        ADMIN_USER_ID
      );

      expect(result.organization).toEqual(org);
      expect(result.request).toEqual(updatedRequest);
      // Verify all tables were touched
      expect(fromSpy).toHaveBeenCalledWith("communities");
      expect(fromSpy).toHaveBeenCalledWith("community_staff");
      expect(fromSpy).toHaveBeenCalledWith("notifications");
      expect(fromSpy).toHaveBeenCalledWith("audit_log");
    });

    it("throws when slug is taken at approval time", async () => {
      const request = organizationRequestFactory.build({
        status: "pending",
      });

      let orgRequestCallCount = 0;
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation((table: string) => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };

        if (table === "community_requests") {
          orgRequestCallCount++;
          if (orgRequestCallCount === 1) {
            builder.single.mockResolvedValue({
              data: request,
              error: null,
            });
          }
        } else if (table === "communities") {
          // Slug now taken
          builder.maybeSingle.mockResolvedValue({ data: { id: 1 } });
        }

        return builder;
      });

      await expect(
        approveCommunityRequest(mockClient, request.id, ADMIN_USER_ID)
      ).rejects.toThrow("is now taken by an existing organization");
    });

    it("throws when staff insert fails", async () => {
      const request = organizationRequestFactory.build({
        status: "pending",
      });
      const org = { id: "org-1", name: request.name, slug: request.slug };
      const staffError = new Error("duplicate staff");

      let callIndex = 0;
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation((table: string) => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };

        if (table === "community_requests") {
          builder.single.mockResolvedValue({ data: request, error: null });
        } else if (table === "communities") {
          callIndex++;
          if (callIndex === 1) {
            // Slug check
            builder.maybeSingle.mockResolvedValue({ data: null });
          } else {
            // Community insert
            builder.insert.mockReturnThis();
            builder.single.mockResolvedValue({ data: org, error: null });
          }
        } else if (table === "community_staff") {
          builder.insert.mockResolvedValue({ error: staffError });
        }

        return builder;
      });

      await expect(
        approveCommunityRequest(mockClient, request.id, ADMIN_USER_ID)
      ).rejects.toThrow("duplicate staff");
    });

    it("logs but does not throw when notification insert fails", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const request = organizationRequestFactory.build({
        status: "pending",
      });
      const org = { id: "org-1", name: request.name, slug: request.slug };
      const updatedRequest = { ...request, status: "approved" };

      let orgRequestCallCount = 0;
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation((table: string) => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };

        if (table === "community_requests") {
          orgRequestCallCount++;
          if (orgRequestCallCount === 1) {
            builder.single.mockResolvedValue({ data: request, error: null });
          } else {
            builder.single.mockResolvedValue({
              data: updatedRequest,
              error: null,
            });
          }
        } else if (table === "communities") {
          builder.maybeSingle.mockResolvedValue({ data: null });
          builder.single.mockResolvedValue({ data: org, error: null });
        } else if (table === "community_staff") {
          return {
            insert: jest.fn().mockReturnValue({ error: null }),
          } as unknown as MockQueryBuilder;
        } else if (table === "notifications") {
          // Notification fails
          return {
            insert: jest
              .fn()
              .mockReturnValue({ error: { message: "insert failed" } }),
          } as unknown as MockQueryBuilder;
        } else if (table === "audit_log") {
          return {
            insert: jest.fn().mockReturnValue({ error: null }),
          } as unknown as MockQueryBuilder;
        }

        return builder;
      });

      // Should not throw despite notification failure
      const result = await approveCommunityRequest(
        mockClient,
        request.id,
        ADMIN_USER_ID
      );

      expect(result.organization).toEqual(org);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to create org_request_approved notification",
        expect.objectContaining({ requestId: request.id })
      );
      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // rejectCommunityRequest
  // ---------------------------------------------------------------------------

  describe("rejectCommunityRequest", () => {
    it("updates status, creates notification and audit log", async () => {
      const request = organizationRequestFactory.build({
        status: "pending",
        user_id: "requester-789",
      });

      let orgRequestCallCount = 0;
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation((table: string) => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };

        if (table === "community_requests") {
          orgRequestCallCount++;
          if (orgRequestCallCount === 1) {
            // Fetch
            builder.single.mockResolvedValue({ data: request, error: null });
          } else {
            // Update — returns no error
            builder.eq.mockReturnValue({ error: null });
          }
        } else if (table === "notifications") {
          return {
            insert: jest.fn().mockReturnValue({ error: null }),
          } as unknown as MockQueryBuilder;
        } else if (table === "audit_log") {
          return {
            insert: jest.fn().mockReturnValue({ error: null }),
          } as unknown as MockQueryBuilder;
        }

        return builder;
      });

      const result = await rejectCommunityRequest(
        mockClient,
        request.id,
        ADMIN_USER_ID,
        "Not suitable"
      );

      expect(result).toEqual(request);
      expect(fromSpy).toHaveBeenCalledWith("notifications");
      expect(fromSpy).toHaveBeenCalledWith("audit_log");
    });

    it("logs but does not throw when notification insert fails", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const request = organizationRequestFactory.build({
        status: "pending",
      });

      let orgRequestCallCount = 0;
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation((table: string) => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };

        if (table === "community_requests") {
          orgRequestCallCount++;
          if (orgRequestCallCount === 1) {
            builder.single.mockResolvedValue({ data: request, error: null });
          } else {
            builder.eq.mockReturnValue({ error: null });
          }
        } else if (table === "notifications") {
          return {
            insert: jest
              .fn()
              .mockReturnValue({ error: { message: "insert failed" } }),
          } as unknown as MockQueryBuilder;
        } else if (table === "audit_log") {
          return {
            insert: jest.fn().mockReturnValue({ error: null }),
          } as unknown as MockQueryBuilder;
        }

        return builder;
      });

      const result = await rejectCommunityRequest(
        mockClient,
        request.id,
        ADMIN_USER_ID,
        "Spam"
      );

      expect(result).toEqual(request);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to create org_request_rejected notification",
        expect.objectContaining({ requestId: request.id })
      );
      consoleSpy.mockRestore();
    });

    it("throws when request is not found", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation(() => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "not found" },
          }),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };
        return builder;
      });

      await expect(
        rejectCommunityRequest(mockClient, 1, ADMIN_USER_ID, "Spam")
      ).rejects.toThrow("Request not found");
    });

    it("throws when request is not pending", async () => {
      const request = organizationRequestFactory.build({
        status: "approved",
      });

      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation(() => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: request,
            error: null,
          }),
          maybeSingle: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };
        return builder;
      });

      await expect(
        rejectCommunityRequest(mockClient, request.id, ADMIN_USER_ID, "Spam")
      ).rejects.toThrow("Request is no longer pending");
    });
  });
});
