/**
 * Tests for the admin dashboard page helper functions and data transformation
 * logic. These functions are exported from helpers.ts and imported directly.
 */

import {
  CHART_COLORS,
  TOURNAMENT_STATUS_LABELS,
  ORG_STATUS_LABELS,
  ORG_TIER_LABELS,
  DEFAULT_FILL,
  formatNumber,
  relativeTime,
  humanLabel,
  buildChartData,
} from "../helpers";

// ── Tests ───────────────────────────────────────────────────────────

describe("Admin dashboard helpers", () => {
  // ── formatNumber ────────────────────────────────────────────────

  describe("formatNumber", () => {
    it("formats zero", () => {
      expect(formatNumber(0)).toBe("0");
    });

    it("formats small numbers without separators", () => {
      expect(formatNumber(42)).toBe("42");
      expect(formatNumber(999)).toBe("999");
    });

    it("formats large numbers with locale separators", () => {
      // toLocaleString output depends on the runtime locale, but
      // the string representation must contain all the digits.
      const result = formatNumber(1_234_567);
      expect(result).toMatch(/1.*2.*3.*4.*5.*6.*7/);
    });

    it("formats negative numbers", () => {
      const result = formatNumber(-500);
      expect(result).toContain("500");
    });
  });

  // ── relativeTime ────────────────────────────────────────────────

  describe("relativeTime", () => {
    beforeEach(() => {
      // Pin Date.now to a known timestamp for deterministic results
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-02-09T12:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns "just now" for timestamps less than 1 minute ago', () => {
      // 30 seconds ago
      expect(relativeTime("2026-02-09T11:59:30Z")).toBe("just now");
    });

    it('returns "just now" for exact current time', () => {
      expect(relativeTime("2026-02-09T12:00:00Z")).toBe("just now");
    });

    it("returns minutes ago for timestamps 1-59 minutes ago", () => {
      // 1 minute ago
      expect(relativeTime("2026-02-09T11:59:00Z")).toBe("1m ago");
      // 30 minutes ago
      expect(relativeTime("2026-02-09T11:30:00Z")).toBe("30m ago");
      // 59 minutes ago
      expect(relativeTime("2026-02-09T11:01:00Z")).toBe("59m ago");
    });

    it("returns hours ago for timestamps 1-23 hours ago", () => {
      // 1 hour ago
      expect(relativeTime("2026-02-09T11:00:00Z")).toBe("1h ago");
      // 12 hours ago
      expect(relativeTime("2026-02-09T00:00:00Z")).toBe("12h ago");
      // 23 hours ago
      expect(relativeTime("2026-02-08T13:00:00Z")).toBe("23h ago");
    });

    it("returns days ago for timestamps 24+ hours ago", () => {
      // 1 day ago
      expect(relativeTime("2026-02-08T12:00:00Z")).toBe("1d ago");
      // 7 days ago
      expect(relativeTime("2026-02-02T12:00:00Z")).toBe("7d ago");
      // 30 days ago
      expect(relativeTime("2026-01-10T12:00:00Z")).toBe("30d ago");
    });

    it("floors fractional minutes", () => {
      // 1 minute and 45 seconds ago -> should still say 1m ago
      expect(relativeTime("2026-02-09T11:58:15Z")).toBe("1m ago");
    });

    it("floors fractional hours", () => {
      // 1 hour 59 minutes ago -> should say 1h ago (floor of 119min / 60)
      expect(relativeTime("2026-02-09T10:01:00Z")).toBe("1h ago");
    });
  });

  // ── humanLabel ──────────────────────────────────────────────────

  describe("humanLabel", () => {
    it("returns the mapped label when key exists in the labels map", () => {
      expect(humanLabel("draft", TOURNAMENT_STATUS_LABELS)).toBe("Draft");
      expect(humanLabel("active", ORG_STATUS_LABELS)).toBe("Active");
      expect(humanLabel("partner", ORG_TIER_LABELS)).toBe("Partner");
    });

    it("capitalizes a single-word key when not in the labels map", () => {
      expect(humanLabel("unknown", {})).toBe("Unknown");
    });

    it("splits underscored keys and capitalizes each word", () => {
      expect(humanLabel("checked_in", {})).toBe("Checked In");
      expect(humanLabel("in_progress", {})).toBe("In Progress");
      expect(humanLabel("some_long_status_name", {})).toBe(
        "Some Long Status Name"
      );
    });

    it("handles already-capitalized keys gracefully", () => {
      // The function capitalizes the first char, so "Active" -> "Active"
      expect(humanLabel("Active", {})).toBe("Active");
    });

    it("handles single-character keys", () => {
      expect(humanLabel("x", {})).toBe("X");
    });

    it("handles empty string key", () => {
      // "".split("_") -> [""], charAt(0).toUpperCase() + "".slice(1) -> ""
      expect(humanLabel("", {})).toBe("");
    });

    it("prefers label map over fallback formatting", () => {
      // Even if the key has underscores, the label map takes priority
      const labels = { some_key: "Custom Label" };
      expect(humanLabel("some_key", labels)).toBe("Custom Label");
    });
  });
});

// ── buildChartData (DonutBreakdownCard transformation) ──────────────

describe("buildChartData (DonutBreakdownCard logic)", () => {
  it("returns empty chartData and zero total for undefined data", () => {
    const result = buildChartData(undefined, TOURNAMENT_STATUS_LABELS);

    expect(result.chartData).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.chartConfig).toEqual({});
  });

  it("returns empty chartData and zero total for empty data", () => {
    const result = buildChartData({}, TOURNAMENT_STATUS_LABELS);

    expect(result.chartData).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.chartConfig).toEqual({});
  });

  it("computes total as sum of all values", () => {
    const data = { draft: 5, active: 10, completed: 20 };
    const result = buildChartData(data, TOURNAMENT_STATUS_LABELS);

    expect(result.total).toBe(35);
  });

  it("builds chartData entries with name, value, and fill color", () => {
    const data = { active: 3, draft: 7 };
    const result = buildChartData(data, TOURNAMENT_STATUS_LABELS);

    expect(result.chartData).toHaveLength(2);

    const activeEntry = result.chartData.find((d) => d.name === "active");
    expect(activeEntry).toEqual({
      name: "active",
      value: 3,
      fill: CHART_COLORS["active"],
    });

    const draftEntry = result.chartData.find((d) => d.name === "draft");
    expect(draftEntry).toEqual({
      name: "draft",
      value: 7,
      fill: CHART_COLORS["draft"],
    });
  });

  it("uses default fill color for keys not in CHART_COLORS", () => {
    const data = { unknown_status: 5 };
    const result = buildChartData(data, {});

    expect(result.chartData[0]!.fill).toBe(DEFAULT_FILL);
  });

  it("builds chartConfig with human-readable labels", () => {
    const data = { pending: 2, active: 8, suspended: 1 };
    const result = buildChartData(data, ORG_STATUS_LABELS);

    expect(result.chartConfig["pending"]).toEqual({
      label: "Pending",
      color: CHART_COLORS["pending"],
    });
    expect(result.chartConfig["active"]).toEqual({
      label: "Active",
      color: CHART_COLORS["active"],
    });
    expect(result.chartConfig["suspended"]).toEqual({
      label: "Suspended",
      color: CHART_COLORS["suspended"],
    });
  });

  it("falls back to humanLabel formatting for unknown keys in chartConfig", () => {
    const data = { new_status: 3 };
    const result = buildChartData(data, {});

    expect(result.chartConfig["new_status"]!.label).toBe("New Status");
    expect(result.chartConfig["new_status"]!.color).toBe(DEFAULT_FILL);
  });

  it("handles single-entry data", () => {
    const data = { active: 100 };
    const result = buildChartData(data, TOURNAMENT_STATUS_LABELS);

    expect(result.chartData).toHaveLength(1);
    expect(result.total).toBe(100);
    expect(result.chartData[0]).toEqual({
      name: "active",
      value: 100,
      fill: CHART_COLORS["active"],
    });
  });

  it("handles data with zero values", () => {
    const data = { draft: 0, active: 0, completed: 0 };
    const result = buildChartData(data, TOURNAMENT_STATUS_LABELS);

    expect(result.total).toBe(0);
    expect(result.chartData).toHaveLength(3);
    // Each entry should still be present even with value 0
    result.chartData.forEach((entry) => {
      expect(entry.value).toBe(0);
    });
  });

  it("handles all tournament statuses together", () => {
    const data = {
      draft: 10,
      upcoming: 5,
      active: 3,
      paused: 1,
      completed: 20,
      cancelled: 2,
    };
    const result = buildChartData(data, TOURNAMENT_STATUS_LABELS);

    expect(result.total).toBe(41);
    expect(result.chartData).toHaveLength(6);
    expect(Object.keys(result.chartConfig)).toHaveLength(6);

    // Every entry should have a fill from CHART_COLORS (not a missing key)
    result.chartData.forEach((entry) => {
      expect(CHART_COLORS).toHaveProperty(entry.name);
      expect(entry.fill).toBe(CHART_COLORS[entry.name]);
    });
  });

  it("handles all org tier labels together", () => {
    const data = { regular: 50, verified: 15, partner: 5 };
    const result = buildChartData(data, ORG_TIER_LABELS);

    expect(result.total).toBe(70);
    expect(result.chartConfig["regular"]!.label).toBe("Regular");
    expect(result.chartConfig["verified"]!.label).toBe("Verified");
    expect(result.chartConfig["partner"]!.label).toBe("Partner");
  });
});

// ── Label map completeness ──────────────────────────────────────────

describe("Label map completeness", () => {
  describe("TOURNAMENT_STATUS_LABELS", () => {
    const expectedKeys = [
      "draft",
      "upcoming",
      "active",
      "paused",
      "completed",
      "cancelled",
    ];

    it("contains all expected tournament status keys", () => {
      for (const key of expectedKeys) {
        expect(TOURNAMENT_STATUS_LABELS).toHaveProperty(key);
      }
    });

    it("has exactly the expected number of entries", () => {
      expect(Object.keys(TOURNAMENT_STATUS_LABELS)).toHaveLength(
        expectedKeys.length
      );
    });

    it("has non-empty string labels for every key", () => {
      for (const [_key, label] of Object.entries(TOURNAMENT_STATUS_LABELS)) {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      }
    });

    it("has a corresponding CHART_COLORS entry for every key", () => {
      for (const key of expectedKeys) {
        expect(CHART_COLORS).toHaveProperty(key);
      }
    });
  });

  describe("ORG_STATUS_LABELS", () => {
    const expectedKeys = ["pending", "active", "rejected", "suspended"];

    it("contains all expected organization status keys", () => {
      for (const key of expectedKeys) {
        expect(ORG_STATUS_LABELS).toHaveProperty(key);
      }
    });

    it("has exactly the expected number of entries", () => {
      expect(Object.keys(ORG_STATUS_LABELS)).toHaveLength(expectedKeys.length);
    });

    it("has non-empty string labels for every key", () => {
      for (const [_key, label] of Object.entries(ORG_STATUS_LABELS)) {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      }
    });

    it("has a corresponding CHART_COLORS entry for every key", () => {
      for (const key of expectedKeys) {
        expect(CHART_COLORS).toHaveProperty(key);
      }
    });
  });

  describe("ORG_TIER_LABELS", () => {
    const expectedKeys = ["regular", "verified", "partner"];

    it("contains all expected organization tier keys", () => {
      for (const key of expectedKeys) {
        expect(ORG_TIER_LABELS).toHaveProperty(key);
      }
    });

    it("has exactly the expected number of entries", () => {
      expect(Object.keys(ORG_TIER_LABELS)).toHaveLength(expectedKeys.length);
    });

    it("has non-empty string labels for every key", () => {
      for (const [_key, label] of Object.entries(ORG_TIER_LABELS)) {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      }
    });

    it("has a corresponding CHART_COLORS entry for every key", () => {
      for (const key of expectedKeys) {
        expect(CHART_COLORS).toHaveProperty(key);
      }
    });
  });

  describe("CHART_COLORS completeness", () => {
    it("covers all tournament status keys", () => {
      for (const key of Object.keys(TOURNAMENT_STATUS_LABELS)) {
        expect(CHART_COLORS).toHaveProperty(key);
      }
    });

    it("covers all organization status keys", () => {
      for (const key of Object.keys(ORG_STATUS_LABELS)) {
        expect(CHART_COLORS).toHaveProperty(key);
      }
    });

    it("covers all organization tier keys", () => {
      for (const key of Object.keys(ORG_TIER_LABELS)) {
        expect(CHART_COLORS).toHaveProperty(key);
      }
    });

    it("contains valid OKLCH color strings for every entry", () => {
      for (const [_key, color] of Object.entries(CHART_COLORS)) {
        expect(color).toMatch(/^oklch\(/);
      }
    });
  });
});
