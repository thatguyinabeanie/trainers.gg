import { apiCall } from "../client";
import { getSupabase } from "../../supabase";

// Mock supabase
jest.mock("../../supabase", () => ({
  getSupabase: jest.fn(),
}));

// Mock expo constants
jest.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: "https://test.supabase.co",
      },
    },
  },
}));

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("apiCall", () => {
  let mockSupabase: {
    auth: {
      getSession: jest.Mock;
    };
  };

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getSession: jest.fn(),
      },
    };
    mockGetSupabase.mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof getSupabase>
    );
    jest.clearAllMocks();
  });

  it("should make successful API call with auth token", async () => {
    const mockData = { id: "1", name: "Test Tournament" };
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "test-token" } },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockData }),
    } as Response);

    const result = await apiCall<typeof mockData>("api-tournaments/1");

    expect(result).toEqual({ success: true, data: mockData });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.supabase.co/functions/v1/api-tournaments/1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("should handle API errors", async () => {
    const errorMessage = "Tournament not found";
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "test-token" } },
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: errorMessage }),
    } as Response);

    const result = await apiCall("api-tournaments/999");

    expect(result).toEqual({ success: false, error: errorMessage });
  });

  it("should handle network errors", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "test-token" } },
    });

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await apiCall("api-tournaments/1");

    expect(result).toEqual({
      success: false,
      error: "Network error",
      code: "NETWORK_ERROR",
    });
  });

  it("should return error if not authenticated", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
    });

    const result = await apiCall("api-tournaments/1");

    expect(result).toEqual({
      success: false,
      error: "Authentication required",
      code: "UNAUTHORIZED",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should include custom headers", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "test-token" } },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} }),
    } as Response);

    await apiCall("api-tournaments", {
      headers: { "X-Custom-Header": "custom-value" },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
          "X-Custom-Header": "custom-value",
        }),
      })
    );
  });

  it("should handle POST requests with body", async () => {
    const requestBody = { name: "New Tournament", format: "swiss" };
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "test-token" } },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ success: true, data: { id: "1", ...requestBody } }),
    } as Response);

    await apiCall("api-tournaments", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(requestBody),
      })
    );
  });
});
