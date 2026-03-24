import {
  getMyOrganizationRequest,
  listOrgRequestsAdmin,
} from "../organization-requests";
import type { TypedClient } from "../../client";
import { createMockClient } from "@trainers/test-utils/mocks";
import { organizationRequestFactory } from "@trainers/test-utils/factories";

type MockQueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  or: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
  maybeSingle: jest.Mock;
};

describe("Organization Request Queries", () => {
  let mockClient: TypedClient;
  const mockUser = { id: "user-123" };

  beforeEach(() => {
    mockClient = createMockClient() as unknown as TypedClient;
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // getMyOrganizationRequest
  // ---------------------------------------------------------------------------

  describe("getMyOrganizationRequest", () => {
    it("returns null when user is not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await getMyOrganizationRequest(mockClient);

      expect(result).toBeNull();
    });

    it("returns pending request when one exists", async () => {
      const pending = organizationRequestFactory.build({
        status: "pending",
        user_id: mockUser.id,
      });

      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation(() => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: pending }),
        };
        return builder;
      });

      const result = await getMyOrganizationRequest(mockClient);

      expect(result).toEqual(pending);
    });

    it("returns rejected request when no pending exists", async () => {
      const rejected = organizationRequestFactory.build({
        status: "rejected",
        user_id: mockUser.id,
      });

      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      let callCount = 0;
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation(() => {
        callCount++;
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(),
        };

        if (callCount === 1) {
          // No pending
          builder.maybeSingle.mockResolvedValue({ data: null });
        } else {
          // Return rejected
          builder.maybeSingle.mockResolvedValue({ data: rejected });
        }

        return builder;
      });

      const result = await getMyOrganizationRequest(mockClient);

      expect(result).toEqual(rejected);
    });

    it("returns null when no requests exist", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation(() => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null }),
        };
        return builder;
      });

      const result = await getMyOrganizationRequest(mockClient);

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // listOrgRequestsAdmin
  // ---------------------------------------------------------------------------

  describe("listOrgRequestsAdmin", () => {
    it("returns paginated results with count", async () => {
      const requests = [
        organizationRequestFactory.build({ status: "pending" }),
        organizationRequestFactory.build({ status: "approved" }),
      ];

      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation(() => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: requests,
            error: null,
            count: 2,
          }),
          maybeSingle: jest.fn(),
        };
        return builder;
      });

      const result = await listOrgRequestsAdmin(mockClient);

      expect(result.data).toEqual(requests);
      expect(result.count).toBe(2);
    });

    it("applies search filter with sanitized input", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const mockOr = jest.fn().mockReturnThis();
      fromSpy.mockImplementation(() => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: mockOr,
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
          maybeSingle: jest.fn(),
        };
        return builder;
      });

      await listOrgRequestsAdmin(mockClient, { search: "test(org)" });

      // Parentheses should be stripped
      expect(mockOr).toHaveBeenCalledWith(
        "name.ilike.%testorg%,slug.ilike.%testorg%"
      );
    });

    it("skips search filter when sanitized input is empty", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const mockOr = jest.fn().mockReturnThis();
      fromSpy.mockImplementation(() => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: mockOr,
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
          maybeSingle: jest.fn(),
        };
        return builder;
      });

      await listOrgRequestsAdmin(mockClient, { search: "()," });

      // All characters stripped — should not call .or()
      expect(mockOr).not.toHaveBeenCalled();
    });

    it("applies status filter", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const mockEq = jest.fn().mockReturnThis();
      fromSpy.mockImplementation(() => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: mockEq,
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
          maybeSingle: jest.fn(),
        };
        return builder;
      });

      await listOrgRequestsAdmin(mockClient, { status: "pending" });

      expect(mockEq).toHaveBeenCalledWith("status", "pending");
    });

    it("throws when query errors", async () => {
      const dbError = new Error("DB error");
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockImplementation(() => {
        const builder: MockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: null,
            error: dbError,
            count: null,
          }),
          maybeSingle: jest.fn(),
        };
        return builder;
      });

      await expect(listOrgRequestsAdmin(mockClient)).rejects.toThrow(
        "DB error"
      );
    });
  });
});
