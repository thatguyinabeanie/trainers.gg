import {
  submitOrganizationRequest,
  approveOrganizationRequest,
  rejectOrganizationRequest,
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
  // submitOrganizationRequest
  // ---------------------------------------------------------------------------

  describe("submitOrganizationRequest", () => {
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

        if (table === "organization_requests") {
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
        } else if (table === "organizations") {
          // Slug uniqueness vs organizations — not taken
          builder.maybeSingle.mockResolvedValue({ data: null });
        }

        return builder;
      });

      return mockRequest;
    }

    it("creates a request with correct fields", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const expectedRequest = mockSuccessfulSubmit(fromSpy);

      const result = await submitOrganizationRequest(mockClient, requestData);

      expect(result).toEqual(expectedRequest);
    });

    it("throws when user is not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        submitOrganizationRequest(mockClient, requestData)
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
        submitOrganizationRequest(mockClient, requestData)
      ).rejects.toThrow("You already have a pending organization request");
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

        if (table === "organization_requests") {
          orgRequestCallCount++;
          if (orgRequestCallCount === 1) {
            // No pending request
            builder.maybeSingle.mockResolvedValue({ data: null });
          } else if (orgRequestCallCount === 2) {
            // No recent rejection
            builder.maybeSingle.mockResolvedValue({ data: null });
          }
        } else if (table === "organizations") {
          // Slug taken by existing org
          builder.maybeSingle.mockResolvedValue({ data: { id: 1 } });
        }

        return builder;
      });

      await expect(
        submitOrganizationRequest(mockClient, requestData)
      ).rejects.toThrow(
        "This URL slug is already taken by an existing organization"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // approveOrganizationRequest
  // ---------------------------------------------------------------------------

  describe("approveOrganizationRequest", () => {
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
        approveOrganizationRequest(mockClient, 1, ADMIN_USER_ID)
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
        approveOrganizationRequest(mockClient, request.id, ADMIN_USER_ID)
      ).rejects.toThrow("Request is no longer pending");
    });
  });

  // ---------------------------------------------------------------------------
  // rejectOrganizationRequest
  // ---------------------------------------------------------------------------

  describe("rejectOrganizationRequest", () => {
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
        rejectOrganizationRequest(mockClient, 1, ADMIN_USER_ID, "Spam")
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
        rejectOrganizationRequest(mockClient, request.id, ADMIN_USER_ID, "Spam")
      ).rejects.toThrow("Request is no longer pending");
    });
  });
});
