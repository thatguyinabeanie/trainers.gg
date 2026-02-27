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

  it("returns alt with user data when username matches", async () => {
    const mockAlt = {
      id: 1,
      username: "ash_ketchum",
      bio: "Gotta catch em all",
      avatar_url: "https://example.com/avatar.png",
      user_id: "user-123",
      user: {
        id: "user-123",
        username: "ash_ketchum",
        country: "US",
        did: "did:plc:abc123",
        pds_handle: "ash.trainers.gg",
      },
    };

    mockClient.maybeSingle.mockResolvedValue({
      data: mockAlt,
      error: null,
    });

    const result = await getPlayerProfileByHandle(
      mockClient as unknown as TypedClient,
      "ash_ketchum"
    );

    // Verify the correct table was queried
    expect(mockClient.from).toHaveBeenCalledWith("alts");

    // Verify the select includes specific user fields via join
    expect(mockClient.select).toHaveBeenCalledWith(
      "*, user:users(id, username, country, did, pds_handle)"
    );

    // Verify exact match on username (not ilike)
    expect(mockClient.eq).toHaveBeenCalledWith("username", "ash_ketchum");

    // Verify maybeSingle was called (not single)
    expect(mockClient.maybeSingle).toHaveBeenCalled();

    // Verify the returned data
    expect(result).toEqual(mockAlt);
  });

  it("returns null when no alt matches the handle", async () => {
    mockClient.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await getPlayerProfileByHandle(
      mockClient as unknown as TypedClient,
      "nonexistent_player"
    );

    expect(mockClient.from).toHaveBeenCalledWith("alts");
    expect(mockClient.eq).toHaveBeenCalledWith(
      "username",
      "nonexistent_player"
    );
    expect(result).toBeNull();
  });

  it("returns null when a database error occurs", async () => {
    mockClient.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "Database error", code: "PGRST116" },
    });

    const result = await getPlayerProfileByHandle(
      mockClient as unknown as TypedClient,
      "ash_ketchum"
    );

    expect(result).toBeNull();
  });
});
