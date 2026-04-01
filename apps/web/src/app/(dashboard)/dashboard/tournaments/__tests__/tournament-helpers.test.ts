import { describe, it, expect } from "@jest/globals";
import {
  formatDate,
  ordinalSuffix,
  formatWinRate,
  calcAvgPlace,
  computeSummaryStats,
} from "../tournament-helpers";

describe("formatDate", () => {
  it("returns — for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("formats a date string as 'Mon D'", () => {
    const result = formatDate("2025-06-15T12:00:00Z");
    // toLocaleDateString with month: "short", day: "numeric"
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });
});

describe("ordinalSuffix", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [10, "10th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [23, "23rd"],
    [100, "100th"],
    [101, "101st"],
    [112, "112th"],
  ])("returns %s for %i", (input, expected) => {
    expect(ordinalSuffix(input)).toBe(expected);
  });
});

describe("formatWinRate", () => {
  it("returns — when no games played", () => {
    expect(formatWinRate(0, 0)).toBe("—");
  });

  it("calculates 100% for all wins", () => {
    expect(formatWinRate(5, 0)).toBe("100.0%");
  });

  it("calculates 0% for all losses", () => {
    expect(formatWinRate(0, 5)).toBe("0.0%");
  });

  it("calculates correct percentage", () => {
    expect(formatWinRate(3, 2)).toBe("60.0%");
  });

  it("handles one-decimal precision", () => {
    expect(formatWinRate(1, 2)).toBe("33.3%");
  });
});

describe("calcAvgPlace", () => {
  it("returns — for empty entries", () => {
    expect(calcAvgPlace([])).toBe("—");
  });

  it("returns — when all placements are null", () => {
    expect(calcAvgPlace([{ placement: null }, { placement: null }])).toBe("—");
  });

  it("returns — when all placements are 0", () => {
    expect(calcAvgPlace([{ placement: 0 }, { placement: 0 }])).toBe("—");
  });

  it("averages valid placements", () => {
    expect(
      calcAvgPlace([{ placement: 1 }, { placement: 3 }, { placement: 5 }])
    ).toBe("3.0");
  });

  it("ignores null and zero placements", () => {
    expect(
      calcAvgPlace([
        { placement: 2 },
        { placement: null },
        { placement: 0 },
        { placement: 4 },
      ])
    ).toBe("3.0");
  });
});

describe("computeSummaryStats", () => {
  it("handles empty entries", () => {
    const result = computeSummaryStats([]);
    expect(result).toEqual({
      played: 0,
      totalWins: 0,
      totalLosses: 0,
      bestPlacement: null,
      winRate: "—",
      avgPlace: "—",
    });
  });

  it("computes stats for multiple entries", () => {
    const entries = [
      { wins: 3, losses: 1, placement: 2 },
      { wins: 4, losses: 0, placement: 1 },
      { wins: 2, losses: 3, placement: 5 },
    ];
    const result = computeSummaryStats(entries);
    expect(result.played).toBe(3);
    expect(result.totalWins).toBe(9);
    expect(result.totalLosses).toBe(4);
    expect(result.bestPlacement).toBe(1);
    expect(result.winRate).toBe("69.2%");
    expect(result.avgPlace).toBe("2.7");
  });

  it("returns null bestPlacement when no valid placements", () => {
    const entries = [
      { wins: 1, losses: 2, placement: null },
      { wins: 0, losses: 3, placement: 0 },
    ];
    const result = computeSummaryStats(entries);
    expect(result.bestPlacement).toBeNull();
  });

  it("picks the lowest placement as best", () => {
    const entries = [
      { wins: 3, losses: 1, placement: 4 },
      { wins: 5, losses: 0, placement: 1 },
      { wins: 2, losses: 2, placement: 8 },
    ];
    expect(computeSummaryStats(entries).bestPlacement).toBe(1);
  });
});
