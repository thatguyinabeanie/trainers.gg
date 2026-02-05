/**
 * @jest-environment node
 */

import { getUserSpritePreference } from "../users";
import type { TypedClient } from "../../client";

describe("getUserSpritePreference", () => {
  let mockSupabase: TypedClient;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    } as unknown as TypedClient;
  });

  it("returns user's sprite preference when found", async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { sprite_preference: "gen5ani" },
          error: null,
        }),
      }),
    });

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const result = await getUserSpritePreference(mockSupabase);

    expect(result).toBe("gen5ani");
    expect(mockSupabase.from).toHaveBeenCalledWith("users");
    expect(mockSelect).toHaveBeenCalledWith("sprite_preference");
  });

  it("returns default gen5 when user has no preference set", async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { sprite_preference: null },
          error: null,
        }),
      }),
    });

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const result = await getUserSpritePreference(mockSupabase);

    expect(result).toBe("gen5");
  });

  it("returns default gen5 when query fails", async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      }),
    });

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const result = await getUserSpritePreference(mockSupabase);

    expect(result).toBe("gen5");
  });

  it("returns default gen5 when user is not authenticated", async () => {
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await getUserSpritePreference(mockSupabase);

    expect(result).toBe("gen5");
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("queries specific user when userId is provided", async () => {
    const mockEq = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { sprite_preference: "ani" },
        error: null,
      }),
    });

    const mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
    });

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "current-user" } },
      error: null,
    });

    const result = await getUserSpritePreference(mockSupabase, "target-user");

    expect(result).toBe("ani");
    expect(mockEq).toHaveBeenCalledWith("id", "target-user");
    // Auth check still happens but the provided userId takes precedence
  });

  it("returns all valid sprite preference values", async () => {
    const preferences = ["gen5", "gen5ani", "ani"] as const;

    for (const pref of preferences) {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { sprite_preference: pref },
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const result = await getUserSpritePreference(mockSupabase);
      expect(result).toBe(pref);
    }
  });
});
