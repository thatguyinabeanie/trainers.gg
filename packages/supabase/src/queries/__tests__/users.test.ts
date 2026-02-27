/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { getPlayerProfileByHandle } from "../users";
import {
  createMockClient,
  type MockSupabaseClient,
} from "@trainers/test-utils/mocks";
import type { TypedClient } from "../../client";

describe("getPlayerProfileByHandle", () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  it("resolves user by users.username and returns profile with all alts", async () => {
    const mockUser = {
      id: "user-123",
      username: "ash_ketchum",
      country: "US",
      did: "did:plc:abc123",
      pds_handle: "ash.trainers.gg",
      main_alt_id: 1,
      created_at: "2026-01-01T00:00:00Z",
    };

    const mockAlts = [
      {
        id: 1,
        username: "ash_ketchum",
        bio: "Gotta catch em all",
        avatar_url: "https://example.com/pikachu.png",
        tier: null,
        tier_expires_at: null,
      },
      {
        id: 2,
        username: "satoshi",
        bio: null,
        avatar_url: null,
        tier: null,
        tier_expires_at: null,
      },
    ];

    let fromCallCount = 0;
    mockClient.from.mockImplementation((table: string) => {
      fromCallCount++;
      if (table === "users" && fromCallCount === 1) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: mockUser, error: null }),
            }),
          }),
        };
      }
      if (table === "alts") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest
                .fn()
                .mockResolvedValue({ data: mockAlts, error: null }),
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

    const result = await getPlayerProfileByHandle(
      mockClient as unknown as TypedClient,
      "ash_ketchum"
    );

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-123");
    expect(result?.username).toBe("ash_ketchum");
    expect(result?.country).toBe("US");
    expect(result?.mainAlt?.username).toBe("ash_ketchum");
    expect(result?.alts).toHaveLength(2);
    expect(result?.altIds).toEqual([1, 2]);
  });

  it("falls back to alts.username when users.username does not match", async () => {
    const mockUser = {
      id: "user-123",
      username: "ash_ketchum",
      country: "US",
      did: null,
      pds_handle: null,
      main_alt_id: 1,
      created_at: "2026-01-01T00:00:00Z",
    };

    const mockAlts = [
      {
        id: 1,
        username: "satoshi",
        bio: null,
        avatar_url: null,
        tier: null,
        tier_expires_at: null,
      },
    ];

    let fromCallCount = 0;
    mockClient.from.mockImplementation((table: string) => {
      fromCallCount++;
      // First call: users.username lookup — no match
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
      // Second call: alts.username lookup — match
      if (table === "alts" && fromCallCount === 2) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { user_id: "user-123" },
                error: null,
              }),
            }),
          }),
        };
      }
      // Third call: fetch all alts for the user
      if (table === "alts" && fromCallCount === 3) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest
                .fn()
                .mockResolvedValue({ data: mockAlts, error: null }),
            }),
          }),
        };
      }
      // Fourth call: re-fetch user by ID
      if (table === "users" && fromCallCount === 4) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: mockUser, error: null }),
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

    const result = await getPlayerProfileByHandle(
      mockClient as unknown as TypedClient,
      "satoshi"
    );

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-123");
    expect(result?.altIds).toEqual([1]);
  });

  it("returns null when neither users nor alts match the handle", async () => {
    mockClient.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }));

    const result = await getPlayerProfileByHandle(
      mockClient as unknown as TypedClient,
      "nonexistent_player"
    );

    expect(result).toBeNull();
  });
});
