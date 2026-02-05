/**
 * Tests for tournament schedule calculation
 */

import {
  calculateRequiredSwissRounds,
  calculateTopCutRounds,
  getTopCutRoundName,
  calculateRoundETA,
  getTournamentSchedule,
  formatRoundTime,
  formatStartDateTime,
  type TournamentScheduleData,
} from "../schedule";

describe("calculateRequiredSwissRounds", () => {
  it("should return 3 rounds for 8 or fewer players", () => {
    expect(calculateRequiredSwissRounds(4)).toBe(3);
    expect(calculateRequiredSwissRounds(8)).toBe(3);
  });

  it("should calculate rounds using ceil(log2(n)) for more than 8 players", () => {
    expect(calculateRequiredSwissRounds(16)).toBe(4); // log2(16) = 4
    expect(calculateRequiredSwissRounds(32)).toBe(5); // log2(32) = 5
    expect(calculateRequiredSwissRounds(64)).toBe(6); // log2(64) = 6
  });

  it("should round up for non-power-of-2 player counts", () => {
    expect(calculateRequiredSwissRounds(10)).toBe(4); // ceil(log2(10)) = 4
    expect(calculateRequiredSwissRounds(24)).toBe(5); // ceil(log2(24)) = 5
    expect(calculateRequiredSwissRounds(50)).toBe(6); // ceil(log2(50)) = 6
  });
});

describe("calculateTopCutRounds", () => {
  it("should return 0 for no top cut or single player", () => {
    expect(calculateTopCutRounds(0)).toBe(0);
    expect(calculateTopCutRounds(1)).toBe(0);
  });

  it("should calculate rounds for standard top cuts", () => {
    expect(calculateTopCutRounds(4)).toBe(2); // SF, F
    expect(calculateTopCutRounds(8)).toBe(3); // QF, SF, F
    expect(calculateTopCutRounds(16)).toBe(4); // R16, QF, SF, F
    expect(calculateTopCutRounds(32)).toBe(5); // R32, R16, QF, SF, F
  });
});

describe("getTopCutRoundName", () => {
  it("should name rounds correctly for Top 8", () => {
    expect(getTopCutRoundName(1, 3)).toBe("Quarterfinals");
    expect(getTopCutRoundName(2, 3)).toBe("Semifinals");
    expect(getTopCutRoundName(3, 3)).toBe("Finals");
  });

  it("should name rounds correctly for Top 4", () => {
    expect(getTopCutRoundName(1, 2)).toBe("Semifinals");
    expect(getTopCutRoundName(2, 2)).toBe("Finals");
  });

  it("should name rounds correctly for Top 16", () => {
    expect(getTopCutRoundName(1, 4)).toBe("Round of 16");
    expect(getTopCutRoundName(2, 4)).toBe("Quarterfinals");
    expect(getTopCutRoundName(3, 4)).toBe("Semifinals");
    expect(getTopCutRoundName(4, 4)).toBe("Finals");
  });

  it("should name rounds correctly for larger brackets", () => {
    expect(getTopCutRoundName(1, 5)).toBe("Top 32");
    expect(getTopCutRoundName(2, 5)).toBe("Round of 16");
  });
});

describe("calculateRoundETA", () => {
  const startTime = new Date("2026-02-02T18:00:00Z"); // 6:00 PM UTC

  it("should return start time for round 1", () => {
    const eta = calculateRoundETA(startTime, 1, 50, []);
    expect(eta).toEqual(startTime);
  });

  it("should calculate ETA based on round duration when no actual data", () => {
    const eta = calculateRoundETA(startTime, 3, 50, []);
    // Round 3 ETA = start + 2 * 50 minutes = start + 100 minutes
    const expected = new Date(startTime.getTime() + 100 * 60 * 1000);
    expect(eta).toEqual(expected);
  });

  it("should use actual end time when available", () => {
    const round1End = new Date("2026-02-02T18:45:00Z");
    const completedRounds = [
      {
        roundNumber: 1,
        actualStartTime: new Date("2026-02-02T18:00:00Z"),
        actualEndTime: round1End,
      },
    ];

    const eta = calculateRoundETA(startTime, 2, 50, completedRounds);
    expect(eta).toEqual(round1End);
  });

  it("should estimate when round started but not completed", () => {
    const round1Start = new Date("2026-02-02T18:00:00Z");
    const completedRounds = [
      {
        roundNumber: 1,
        actualStartTime: round1Start,
        actualEndTime: null,
      },
    ];

    const eta = calculateRoundETA(startTime, 2, 50, completedRounds);
    // Should estimate round 1 end as start + 50 minutes
    const expected = new Date(round1Start.getTime() + 50 * 60 * 1000);
    expect(eta).toEqual(expected);
  });

  it("should handle mixed actual and estimated data", () => {
    const round1End = new Date("2026-02-02T18:40:00Z"); // 40 minutes (faster than expected)
    const completedRounds = [
      {
        roundNumber: 1,
        actualStartTime: new Date("2026-02-02T18:00:00Z"),
        actualEndTime: round1End,
      },
      {
        roundNumber: 2,
        actualStartTime: null,
        actualEndTime: null,
      },
    ];

    const eta = calculateRoundETA(startTime, 3, 50, completedRounds);
    // Round 2 estimate based on round 1 actual end + 50 minutes
    const expected = new Date(round1End.getTime() + 50 * 60 * 1000);
    expect(eta).toEqual(expected);
  });
});

describe("getTournamentSchedule", () => {
  const baseData: TournamentScheduleData = {
    startDate: "2026-02-02T18:00:00Z",
    roundTimeMinutes: 50,
    tournamentFormat: "swiss_only",
    swissRounds: 6,
    topCutSize: null,
    registrationCount: 64,
    currentRound: 0,
  };

  it("should return empty schedule when no start date", () => {
    const data: TournamentScheduleData = {
      ...baseData,
      startDate: null,
    };

    const schedule = getTournamentSchedule(data);
    expect(schedule.tournamentStartTime).toBeNull();
    expect(schedule.phases).toHaveLength(0);
  });

  it("should calculate Swiss-only schedule", () => {
    const schedule = getTournamentSchedule(baseData);

    expect(schedule.tournamentStartTime).toEqual(
      new Date("2026-02-02T18:00:00Z")
    );
    expect(schedule.phases).toHaveLength(1);
    expect(schedule.phases[0]?.phaseName).toBe("Swiss Rounds (6)");
    expect(schedule.phases[0]?.phaseType).toBe("swiss");
    expect(schedule.phases[0]?.rounds).toHaveLength(6);

    // Check first round
    const round1 = schedule.phases[0]?.rounds[0];
    expect(round1?.roundNumber).toBe(1);
    expect(round1?.name).toBe("Round 1");
    expect(round1?.estimatedStartTime).toEqual(
      new Date("2026-02-02T18:00:00Z")
    );
  });

  it("should calculate Swiss + Top Cut schedule", () => {
    const data: TournamentScheduleData = {
      ...baseData,
      tournamentFormat: "swiss_with_cut",
      topCutSize: 8,
    };

    const schedule = getTournamentSchedule(data);

    expect(schedule.phases).toHaveLength(2);
    expect(schedule.phases[0]?.phaseName).toBe("Swiss Rounds (6)");
    expect(schedule.phases[0]?.rounds).toHaveLength(6);

    expect(schedule.phases[1]?.phaseName).toBe("Top Cut (Top 8)");
    expect(schedule.phases[1]?.phaseType).toBe("top_cut");
    expect(schedule.phases[1]?.rounds).toHaveLength(3); // QF, SF, F

    // Check top cut round names
    expect(schedule.phases[1]?.rounds[0]?.name).toBe("Quarterfinals");
    expect(schedule.phases[1]?.rounds[1]?.name).toBe("Semifinals");
    expect(schedule.phases[1]?.rounds[2]?.name).toBe("Finals");

    // Check top cut round numbers (should continue from Swiss)
    expect(schedule.phases[1]?.rounds[0]?.roundNumber).toBe(7);
    expect(schedule.phases[1]?.rounds[1]?.roundNumber).toBe(8);
    expect(schedule.phases[1]?.rounds[2]?.roundNumber).toBe(9);
  });

  it("should auto-calculate swiss rounds from player count", () => {
    const data: TournamentScheduleData = {
      ...baseData,
      swissRounds: null,
      registrationCount: 32,
    };

    const schedule = getTournamentSchedule(data);

    expect(schedule.phases[0]?.rounds).toHaveLength(5); // ceil(log2(32)) = 5
  });

  it("should mark rounds as completed or active based on tournament data", () => {
    const data: TournamentScheduleData = {
      ...baseData,
      currentRound: 2,
      tournamentPhases: [
        {
          id: 1,
          name: "Swiss",
          phase_type: "swiss",
          status: "active",
          current_round: 2,
          planned_rounds: 6,
          tournament_rounds: [
            {
              id: 1,
              round_number: 1,
              status: "completed",
              start_time: "2026-02-02T18:00:00Z",
              end_time: "2026-02-02T18:45:00Z",
            },
            {
              id: 2,
              round_number: 2,
              status: "active",
              start_time: "2026-02-02T18:50:00Z",
              end_time: null,
            },
          ],
        },
      ],
    };

    const schedule = getTournamentSchedule(data);

    const rounds = schedule.phases[0]?.rounds;
    expect(rounds?.[0]?.isCompleted).toBe(true);
    expect(rounds?.[0]?.actualStartTime).toEqual(
      new Date("2026-02-02T18:00:00Z")
    );
    expect(rounds?.[1]?.isActive).toBe(true);
    expect(rounds?.[2]?.isCompleted).toBe(false);
    expect(rounds?.[2]?.isActive).toBe(false);
  });

  it("should use actual times for completed rounds in ETA calculation", () => {
    const data: TournamentScheduleData = {
      ...baseData,
      currentRound: 2,
      tournamentPhases: [
        {
          id: 1,
          name: "Swiss",
          phase_type: "swiss",
          status: "active",
          current_round: 2,
          planned_rounds: 6,
          tournament_rounds: [
            {
              id: 1,
              round_number: 1,
              status: "completed",
              start_time: "2026-02-02T18:00:00Z",
              end_time: "2026-02-02T18:40:00Z", // 40 minutes (faster than expected 50)
            },
          ],
        },
      ],
    };

    const schedule = getTournamentSchedule(data);

    // Round 2 should start from round 1 actual end time (18:40)
    const round2 = schedule.phases[0]?.rounds[1];
    expect(round2?.estimatedStartTime).toEqual(
      new Date("2026-02-02T18:40:00Z")
    );

    // Round 3 should be 50 minutes after round 2 estimate
    const round3 = schedule.phases[0]?.rounds[2];
    expect(round3?.estimatedStartTime).toEqual(
      new Date("2026-02-02T19:30:00Z")
    );
  });
});

describe("formatRoundTime", () => {
  it("should format time in 12-hour format", () => {
    const date = new Date("2026-02-02T18:06:00Z");
    const formatted = formatRoundTime(date);
    // Note: Result depends on local timezone, but format should be consistent
    expect(formatted).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
  });
});

describe("formatStartDateTime", () => {
  it("should format date and time for start display", () => {
    const date = new Date("2026-02-02T18:06:00Z");
    const formatted = formatStartDateTime(date);
    // Format: "Weekday, Month Day at HH:MM AM/PM"
    expect(formatted).toContain("at");
    expect(formatted).toMatch(/[A-Z][a-z]{2},\s[A-Z][a-z]{2}\s\d+\sat\s\d{1,2}:\d{2}\s[AP]M/);
  });
});
