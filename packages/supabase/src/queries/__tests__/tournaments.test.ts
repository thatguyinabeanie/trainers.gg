import { getPhaseRoundsWithStats } from "../tournaments";
import type { TypedClient } from "../../client";

// Mock Supabase client
const createMockClient = () => {
  const mockClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  };
  return mockClient as unknown as TypedClient;
};

describe("getPhaseRoundsWithStats", () => {
  let mockClient: TypedClient;

  beforeEach(() => {
    mockClient = createMockClient();
    jest.clearAllMocks();
  });

  it("should count bye matches as completed regardless of status", async () => {
    const phaseId = 1;

    // Mock rounds response
    (mockClient.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "tournament_rounds") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 100,
                phase_id: phaseId,
                round_number: 1,
                status: "active",
              },
            ],
            error: null,
          }),
        };
      }
      if (table === "tournament_matches") {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [
              // 2 completed regular matches
              { round_id: 100, status: "completed", is_bye: false },
              { round_id: 100, status: "completed", is_bye: false },
              // 1 bye match (pending status, but is_bye=true)
              { round_id: 100, status: "pending", is_bye: true },
              // 1 pending regular match
              { round_id: 100, status: "pending", is_bye: false },
            ],
            error: null,
          }),
        };
      }
      return mockClient;
    });

    const result = await getPhaseRoundsWithStats(mockClient, phaseId);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 100,
      round_number: 1,
      matchCount: 4, // Total matches
      completedCount: 3, // 2 completed + 1 bye (pending but is_bye=true)
      inProgressCount: 0,
      pendingCount: 1, // Only 1 pending regular match
    });
  });

  it("should handle rounds with no bye matches", async () => {
    const phaseId = 2;

    (mockClient.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "tournament_rounds") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 200,
                phase_id: phaseId,
                round_number: 1,
                status: "active",
              },
            ],
            error: null,
          }),
        };
      }
      if (table === "tournament_matches") {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [
              { round_id: 200, status: "completed", is_bye: false },
              { round_id: 200, status: "active", is_bye: false },
              { round_id: 200, status: "pending", is_bye: false },
            ],
            error: null,
          }),
        };
      }
      return mockClient;
    });

    const result = await getPhaseRoundsWithStats(mockClient, phaseId);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 200,
      round_number: 1,
      matchCount: 3,
      completedCount: 1, // Only 1 completed match
      inProgressCount: 1,
      pendingCount: 1,
    });
  });

  it("should handle multiple rounds with mixed match types", async () => {
    const phaseId = 3;

    (mockClient.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "tournament_rounds") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 300,
                phase_id: phaseId,
                round_number: 1,
                status: "completed",
              },
              {
                id: 301,
                phase_id: phaseId,
                round_number: 2,
                status: "active",
              },
            ],
            error: null,
          }),
        };
      }
      if (table === "tournament_matches") {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [
              // Round 1: all completed (including bye)
              { round_id: 300, status: "completed", is_bye: false },
              { round_id: 300, status: "completed", is_bye: false },
              { round_id: 300, status: "pending", is_bye: true },
              // Round 2: mixed status (including bye)
              { round_id: 301, status: "completed", is_bye: false },
              { round_id: 301, status: "active", is_bye: false },
              { round_id: 301, status: "pending", is_bye: true },
            ],
            error: null,
          }),
        };
      }
      return mockClient;
    });

    const result = await getPhaseRoundsWithStats(mockClient, phaseId);

    expect(result).toHaveLength(2);

    // Round 1: all matches completed (2 completed + 1 bye)
    expect(result[0]).toMatchObject({
      id: 300,
      round_number: 1,
      matchCount: 3,
      completedCount: 3,
      inProgressCount: 0,
      pendingCount: 0,
    });

    // Round 2: mixed (1 completed + 1 bye, 1 active, 0 pending)
    expect(result[1]).toMatchObject({
      id: 301,
      round_number: 2,
      matchCount: 3,
      completedCount: 2, // 1 completed + 1 bye
      inProgressCount: 1,
      pendingCount: 0,
    });
  });

  it("should handle empty rounds", async () => {
    const phaseId = 4;

    (mockClient.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "tournament_rounds") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 400,
                phase_id: phaseId,
                round_number: 1,
                status: "pending",
              },
            ],
            error: null,
          }),
        };
      }
      if (table === "tournament_matches") {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      }
      return mockClient;
    });

    const result = await getPhaseRoundsWithStats(mockClient, phaseId);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 400,
      round_number: 1,
      matchCount: 0,
      completedCount: 0,
      inProgressCount: 0,
      pendingCount: 0,
    });
  });

  it("should handle all matches being byes", async () => {
    const phaseId = 5;

    (mockClient.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "tournament_rounds") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 500,
                phase_id: phaseId,
                round_number: 1,
                status: "active",
              },
            ],
            error: null,
          }),
        };
      }
      if (table === "tournament_matches") {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [
              // All bye matches (edge case, but should be handled)
              { round_id: 500, status: "pending", is_bye: true },
              { round_id: 500, status: "pending", is_bye: true },
            ],
            error: null,
          }),
        };
      }
      return mockClient;
    });

    const result = await getPhaseRoundsWithStats(mockClient, phaseId);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 500,
      round_number: 1,
      matchCount: 2,
      completedCount: 2, // All byes count as completed
      inProgressCount: 0,
      pendingCount: 0,
    });
  });
});
