/** @jest-environment node */
import { getCoachBadges, getCoachProfileByHandle, listCoaches } from "../coach";
import {
  createMockClient,
  type MockSupabaseClient,
} from "@trainers/test-utils/mocks";
import type { TypedClient } from "../../client";

describe("getCoachBadges", () => {
  let mockClient: MockSupabaseClient;
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  it("returns empty map for empty input without calling rpc", async () => {
    const result = await getCoachBadges(
      mockClient as unknown as TypedClient,
      []
    );
    expect(result.size).toBe(0);
    expect(mockClient.rpc).not.toHaveBeenCalled();
  });

  it("maps rpc rows by alt id", async () => {
    mockClient.rpc.mockResolvedValue({
      data: [
        { alt_id: 1, show_coach_badge: true, coach_handle: "ash_ketchum" },
        { alt_id: 2, show_coach_badge: false, coach_handle: null },
      ],
      error: null,
    });
    const result = await getCoachBadges(
      mockClient as unknown as TypedClient,
      [1, 2]
    );
    expect(mockClient.rpc).toHaveBeenCalledWith("get_coach_badges", {
      p_alt_ids: [1, 2],
    });
    expect(result.get(1)).toEqual({
      showCoachBadge: true,
      coachHandle: "ash_ketchum",
    });
    expect(result.get(2)).toEqual({
      showCoachBadge: false,
      coachHandle: null,
    });
  });
});

describe("getCoachProfileByHandle", () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  it("resolves via users.username and returns a profile when the user is a coach", async () => {
    // users lookup → coach user found (no main_alt_id to keep mocks simple)
    // coach_profiles lookup → profile data
    let fromCallCount = 0;
    mockClient.from.mockImplementation((table: string) => {
      fromCallCount++;
      if (table === "users" && fromCallCount === 1) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id: "user-1",
                  is_coach: true,
                  main_alt_id: null,
                  name: "Ash Ketchum",
                  image: "https://example.com/ash.png",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "coach_profiles") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  headline: "VGC Coach",
                  bio: "10 years competitive",
                  formats: ["VGC 2024"],
                  links: [{ label: "Twitter", url: "https://x.com/ash" }],
                  service_types: ["live"],
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const result = await getCoachProfileByHandle(
      mockClient as unknown as TypedClient,
      "ash_ketchum"
    );

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-1");
    expect(result?.handle).toBe("ash_ketchum");
    expect(result?.displayName).toBe("Ash Ketchum");
    expect(result?.avatarUrl).toBe("https://example.com/ash.png");
    expect(result?.headline).toBe("VGC Coach");
    expect(result?.formats).toEqual(["VGC 2024"]);
    expect(result?.serviceTypes).toEqual(["live"]);
  });

  it("returns null when the resolved account is not a coach", async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id: "user-2",
                  is_coach: false,
                  main_alt_id: null,
                  name: "Gary Oak",
                  image: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const result = await getCoachProfileByHandle(
      mockClient as unknown as TypedClient,
      "gary_oak"
    );

    expect(result).toBeNull();
  });

  it("resolves via a public alt username fallback when users.username does not match", async () => {
    // Call sequence:
    //   1. from("users") → null (no direct username match)
    //   2. from("alts") (alt-by-username with .eq().eq().maybeSingle) → alt with joined user
    //   3. from("coach_profiles") → profile
    let fromCallCount = 0;
    mockClient.from.mockImplementation((table: string) => {
      fromCallCount++;
      // 1. users lookup — no match
      if (table === "users" && fromCallCount === 1) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      // 2. alts fallback lookup (fromCallCount === 2)
      if (table === "alts" && fromCallCount === 2) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    user_id: "user-3",
                    is_public: true,
                    user: {
                      id: "user-3",
                      is_coach: true,
                      main_alt_id: null,
                      name: "Misty",
                      image: "https://example.com/misty.png",
                    },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      // 3. coach_profiles lookup
      if (table === "coach_profiles") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  headline: "Water Type Specialist",
                  bio: null,
                  formats: [],
                  links: null,
                  service_types: [],
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const result = await getCoachProfileByHandle(
      mockClient as unknown as TypedClient,
      "misty_alt"
    );

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-3");
    expect(result?.displayName).toBe("Misty");
  });

  it("throws when a lookup returns a database error", async () => {
    const dbError = { message: "connection refused" };

    mockClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: null, error: dbError }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    await expect(
      getCoachProfileByHandle(
        mockClient as unknown as TypedClient,
        "any_handle"
      )
    ).rejects.toThrow('Failed to look up user by username "any_handle"');
  });
});

describe("listCoaches", () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  it("returns rows from the coaches query", async () => {
    const mockCoaches = [
      {
        id: "user-1",
        username: "ash_ketchum",
        name: "Ash Ketchum",
        image: null,
        is_coach: true,
        main_alt_id: 1,
      },
      {
        id: "user-2",
        username: "brock_harrison",
        name: "Brock Harrison",
        image: null,
        is_coach: true,
        main_alt_id: 2,
      },
    ];

    const orderMock = jest.fn().mockResolvedValue({ data: mockCoaches, error: null });
    const eqMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockClient.from.mockImplementation(() => ({ select: selectMock }));

    const result = await listCoaches(mockClient as unknown as TypedClient);

    expect(result).toEqual(mockCoaches);
    expect(eqMock).toHaveBeenCalledWith("is_coach", true);
  });

  it("throws when the query returns an error", async () => {
    const dbError = new Error("query failed");

    const orderMock = jest.fn().mockResolvedValue({ data: null, error: dbError });
    const eqMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockClient.from.mockImplementation(() => ({ select: selectMock }));

    await expect(
      listCoaches(mockClient as unknown as TypedClient)
    ).rejects.toThrow("query failed");
  });
});
