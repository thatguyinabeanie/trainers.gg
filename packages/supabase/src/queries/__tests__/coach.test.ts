/** @jest-environment node */
import { getCoachBadges } from "../coach";
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
