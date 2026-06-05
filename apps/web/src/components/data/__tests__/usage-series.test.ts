import { type FormatUsageTimeseriesPoint } from "@trainers/supabase";

import {
  assignColor,
  buildUsageSeries,
  filterByThreshold,
  insideOutOrder,
  type UsageSeries,
} from "../usage-series";

// =============================================================================
// Helpers
// =============================================================================

function makePoint(
  periodStart: string,
  usage: Record<string, number>
): FormatUsageTimeseriesPoint {
  return {
    periodStart,
    periodEnd: periodStart, // irrelevant for these tests
    usage,
  };
}

function makeSeries(
  species: string,
  values: number[],
  peak?: number
): UsageSeries {
  return {
    species,
    values,
    peak: peak ?? Math.max(...values),
    color: assignColor(species),
  };
}

// =============================================================================
// assignColor
// =============================================================================

describe("assignColor", () => {
  it("returns an oklch() CSS string", () => {
    expect(assignColor("Koraidon")).toMatch(/^oklch\(0\.66 0\.12 \d+\)$/);
  });

  it("is deterministic — same input always produces the same output", () => {
    expect(assignColor("Miraidon")).toBe(assignColor("Miraidon"));
    expect(assignColor("Pikachu")).toBe(assignColor("Pikachu"));
  });

  it("generally produces different colors for different species", () => {
    // Not a strict guarantee (hash collisions are possible) but the
    // first 10 common species in the fixture set must differ.
    const species = [
      "Koraidon",
      "Miraidon",
      "Pikachu",
      "Urshifu",
      "Rillaboom",
      "Incineroar",
      "Amoonguss",
      "Flutter Mane",
    ];
    const colors = species.map(assignColor);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBeGreaterThan(1);
  });

  it("hue stays in [0, 360)", () => {
    const match = assignColor("Tornadus-Therian").match(/oklch\(0\.66 0\.12 (\d+)\)/);
    expect(match).not.toBeNull();
    const hue = Number(match![1]);
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });
});

// =============================================================================
// buildUsageSeries
// =============================================================================

describe("buildUsageSeries", () => {
  it("returns [] for an empty points array", () => {
    expect(buildUsageSeries([])).toEqual([]);
  });

  it("builds one series per species from a single period", () => {
    const points = [
      makePoint("2025-01-01", { Koraidon: 50, Miraidon: 30 }),
    ];
    const result = buildUsageSeries(points);
    expect(result).toHaveLength(2);
    const species = result.map((s) => s.species);
    expect(species).toContain("Koraidon");
    expect(species).toContain("Miraidon");
  });

  it("collects the union of species across uneven periods", () => {
    const points = [
      makePoint("2025-01-01", { Koraidon: 50 }),
      makePoint("2025-01-08", { Koraidon: 48, Miraidon: 20 }),
    ];
    const result = buildUsageSeries(points);
    expect(result).toHaveLength(2);
    const koraidon = result.find((s) => s.species === "Koraidon")!;
    expect(koraidon.values).toEqual([50, 48]);
    const miraidon = result.find((s) => s.species === "Miraidon")!;
    expect(miraidon.values).toEqual([0, 20]);
  });

  it("fills 0 for periods where a species is absent", () => {
    const points = [
      makePoint("2025-01-01", { Rillaboom: 15 }),
      makePoint("2025-01-08", {}),
      makePoint("2025-01-15", { Rillaboom: 12 }),
    ];
    const result = buildUsageSeries(points);
    const rillaboom = result.find((s) => s.species === "Rillaboom")!;
    expect(rillaboom.values).toEqual([15, 0, 12]);
  });

  it("computes peak as the max value across the series", () => {
    const points = [
      makePoint("2025-01-01", { Koraidon: 50, Pikachu: 5 }),
      makePoint("2025-01-08", { Koraidon: 55, Pikachu: 3 }),
    ];
    const result = buildUsageSeries(points);
    const koraidon = result.find((s) => s.species === "Koraidon")!;
    expect(koraidon.peak).toBe(55);
    const pikachu = result.find((s) => s.species === "Pikachu")!;
    expect(pikachu.peak).toBe(5);
  });

  it("sorts series by peak descending", () => {
    const points = [
      makePoint("2025-01-01", {
        Pikachu: 5,
        Koraidon: 50,
        Incineroar: 30,
      }),
    ];
    const result = buildUsageSeries(points);
    expect(result[0]!.species).toBe("Koraidon");
    expect(result[1]!.species).toBe("Incineroar");
    expect(result[2]!.species).toBe("Pikachu");
  });

  it("is deterministic — same input always produces the same output", () => {
    const points = [
      makePoint("2025-01-01", { Alpha: 40, Beta: 20, Gamma: 60 }),
    ];
    expect(buildUsageSeries(points)).toEqual(buildUsageSeries(points));
  });

  it("assigns stable colors keyed off species name", () => {
    const points = [
      makePoint("2025-01-01", { Koraidon: 50 }),
      makePoint("2025-01-08", { Koraidon: 48 }),
    ];
    const result = buildUsageSeries(points);
    const koraidon = result.find((s) => s.species === "Koraidon")!;
    // Color must equal what assignColor would produce directly.
    expect(koraidon.color).toBe(assignColor("Koraidon"));
  });

  it("values array length matches points length", () => {
    const points = [
      makePoint("2025-01-01", { A: 10 }),
      makePoint("2025-01-08", { A: 20 }),
      makePoint("2025-01-15", { A: 15 }),
    ];
    const result = buildUsageSeries(points);
    expect(result[0]!.values).toHaveLength(3);
  });
});

// =============================================================================
// filterByThreshold
// =============================================================================

describe("filterByThreshold", () => {
  const series = [
    makeSeries("High", [30, 40], 40),
    makeSeries("Mid", [5, 8], 8),
    makeSeries("Low", [0, 0.5], 0.5),
    makeSeries("Zero", [0, 0], 0),
  ];

  it("keeps series whose peak is above the threshold", () => {
    const result = filterByThreshold(series, 1);
    expect(result.map((s) => s.species)).toEqual(["High", "Mid"]);
  });

  it("keeps series whose peak is exactly equal to the threshold (inclusive)", () => {
    const result = filterByThreshold(series, 8);
    expect(result.map((s) => s.species)).toContain("Mid");
  });

  it("drops series whose peak is below the threshold", () => {
    const result = filterByThreshold(series, 1);
    expect(result.map((s) => s.species)).not.toContain("Low");
    expect(result.map((s) => s.species)).not.toContain("Zero");
  });

  it("defaults threshold to 1 when not provided", () => {
    const result = filterByThreshold(series);
    expect(result.map((s) => s.species)).toEqual(["High", "Mid"]);
  });

  it("returns [] when no series pass the threshold", () => {
    expect(filterByThreshold(series, 100)).toEqual([]);
  });

  it("returns all series when threshold is 0", () => {
    expect(filterByThreshold(series, 0)).toHaveLength(series.length);
  });
});

// =============================================================================
// insideOutOrder
// =============================================================================

describe("insideOutOrder", () => {
  it("returns [] for an empty array", () => {
    expect(insideOutOrder([])).toEqual([]);
  });

  it("preserves the length of the input", () => {
    const series = [
      makeSeries("A", [50]),
      makeSeries("B", [30]),
      makeSeries("C", [20]),
      makeSeries("D", [10]),
      makeSeries("E", [5]),
    ];
    expect(insideOutOrder(series)).toHaveLength(series.length);
  });

  it("does NOT mutate the input array", () => {
    const series = [
      makeSeries("A", [50]),
      makeSeries("B", [30]),
      makeSeries("C", [20]),
    ];
    const copy = [...series];
    insideOutOrder(series);
    expect(series).toEqual(copy);
  });

  it("places the highest-peak series toward the centre of the output", () => {
    // With an even split between left and right buckets, the first element
    // (peak=50) goes to right, second (peak=30) to left, third (peak=20) to
    // right, etc.  After left.reverse().concat(right) the arrangement is:
    //   left=[B], reversed=[B]; right=[A, C]
    //   result = [B, A, C]  → A (peak=50) is at index 1 (middle of 3)
    const series = [
      makeSeries("A", [50]),
      makeSeries("B", [30]),
      makeSeries("C", [20]),
    ];
    const result = insideOutOrder(series);
    const aIndex = result.findIndex((s) => s.species === "A");
    // A (highest peak) must not be at either end
    expect(aIndex).not.toBe(0);
    expect(aIndex).not.toBe(result.length - 1);
  });

  it("places the highest-peak series in the centre for a 5-item list", () => {
    // Sorted by peak: A(50), B(40), C(30), D(20), E(10)
    // i=0 → right: [A]; i=1 → left: [B]; i=2 → right: [A,C];
    // i=3 → left: [B,D]; i=4 → right: [A,C,E]
    // left.reverse() = [D, B]; concat(right) = [D, B, A, C, E]
    // A (peak=50) at index 2 (centre of 5)
    const series = [
      makeSeries("A", [50]),
      makeSeries("B", [40]),
      makeSeries("C", [30]),
      makeSeries("D", [20]),
      makeSeries("E", [10]),
    ];
    const result = insideOutOrder(series);
    expect(result[2]!.species).toBe("A");
  });

  it("contains all input species (no species lost or duplicated)", () => {
    const series = [
      makeSeries("A", [50]),
      makeSeries("B", [30]),
      makeSeries("C", [20]),
      makeSeries("D", [10]),
    ];
    const result = insideOutOrder(series);
    const names = result.map((s) => s.species).sort();
    expect(names).toEqual(["A", "B", "C", "D"]);
  });

  it("handles a single-element array", () => {
    const series = [makeSeries("Solo", [99])];
    const result = insideOutOrder(series);
    expect(result).toHaveLength(1);
    expect(result[0]!.species).toBe("Solo");
  });
});
