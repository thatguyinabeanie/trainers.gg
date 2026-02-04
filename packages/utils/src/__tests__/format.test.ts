import { type PlayerRef, getPlayerName, formatTimeAgo } from "../format";

describe("getPlayerName", () => {
  it("returns display_name when available", () => {
    const player: PlayerRef = {
      display_name: "Ash Ketchum",
      username: "ash",
    };
    expect(getPlayerName(player)).toBe("Ash Ketchum");
  });

  it("falls back to username when display_name is undefined", () => {
    const player: PlayerRef = { username: "ash" };
    expect(getPlayerName(player)).toBe("ash");
  });

  it("falls back to username when display_name is empty string", () => {
    // Empty string is falsy but not nullish — ?? only catches null/undefined
    const player: PlayerRef = { display_name: "", username: "ash" };
    expect(getPlayerName(player)).toBe("");
  });

  it("returns default fallback 'TBD' when player is null", () => {
    expect(getPlayerName(null)).toBe("TBD");
  });

  it("returns default fallback 'TBD' when both fields are undefined", () => {
    const player: PlayerRef = {};
    expect(getPlayerName(player)).toBe("TBD");
  });

  it("returns custom fallback when provided and player is null", () => {
    expect(getPlayerName(null, "Unknown")).toBe("Unknown");
  });

  it("returns custom fallback when provided and both fields are undefined", () => {
    const player: PlayerRef = {};
    expect(getPlayerName(player, "N/A")).toBe("N/A");
  });

  it("prefers display_name over username even when both are set", () => {
    const player: PlayerRef = {
      display_name: "Display",
      username: "user",
    };
    expect(getPlayerName(player)).toBe("Display");
  });

  it("does not use fallback when display_name is present", () => {
    const player: PlayerRef = { display_name: "Ash" };
    expect(getPlayerName(player, "Fallback")).toBe("Ash");
  });

  it("does not use fallback when username is present", () => {
    const player: PlayerRef = { username: "ash" };
    expect(getPlayerName(player, "Fallback")).toBe("ash");
  });
});

describe("formatTimeAgo", () => {
  // Use fake timers so "now" is deterministic
  beforeEach(() => {
    jest.useFakeTimers();
    // Fix "now" to 2025-01-15T12:00:00.000Z
    jest.setSystemTime(new Date("2025-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "Just now" for a date less than 1 minute ago', () => {
    // 30 seconds ago
    const date = new Date("2025-01-15T11:59:30.000Z").toISOString();
    expect(formatTimeAgo(date)).toBe("Just now");
  });

  it('returns "Just now" for a date exactly now (0ms diff)', () => {
    const date = new Date("2025-01-15T12:00:00.000Z").toISOString();
    expect(formatTimeAgo(date)).toBe("Just now");
  });

  it('returns "1m ago" for exactly 1 minute ago', () => {
    const date = new Date("2025-01-15T11:59:00.000Z").toISOString();
    expect(formatTimeAgo(date)).toBe("1m ago");
  });

  it('returns "Xm ago" for dates within the last hour', () => {
    // 30 minutes ago
    const date = new Date("2025-01-15T11:30:00.000Z").toISOString();
    expect(formatTimeAgo(date)).toBe("30m ago");
  });

  it('returns "59m ago" at the upper boundary of minutes', () => {
    // 59 minutes ago
    const date = new Date("2025-01-15T11:01:00.000Z").toISOString();
    expect(formatTimeAgo(date)).toBe("59m ago");
  });

  it('returns "1h ago" for exactly 1 hour ago', () => {
    const date = new Date("2025-01-15T11:00:00.000Z").toISOString();
    expect(formatTimeAgo(date)).toBe("1h ago");
  });

  it('returns "Xh ago" for dates within the last 24 hours', () => {
    // 12 hours ago
    const date = new Date("2025-01-15T00:00:00.000Z").toISOString();
    expect(formatTimeAgo(date)).toBe("12h ago");
  });

  it('returns "23h ago" at the upper boundary of hours', () => {
    // 23 hours ago
    const date = new Date("2025-01-14T13:00:00.000Z").toISOString();
    expect(formatTimeAgo(date)).toBe("23h ago");
  });

  it('returns "1d ago" for exactly 24 hours ago', () => {
    const date = new Date("2025-01-14T12:00:00.000Z").toISOString();
    expect(formatTimeAgo(date)).toBe("1d ago");
  });

  it('returns "Xd ago" for dates within the last 7 days', () => {
    // 3 days ago
    const date = new Date("2025-01-12T12:00:00.000Z").toISOString();
    expect(formatTimeAgo(date)).toBe("3d ago");
  });

  it('returns "6d ago" at the upper boundary of days', () => {
    // 6 days ago
    const date = new Date("2025-01-09T12:00:00.000Z").toISOString();
    expect(formatTimeAgo(date)).toBe("6d ago");
  });

  it("returns a formatted date for 7 or more days ago", () => {
    // 7 days ago
    const date = new Date("2025-01-08T12:00:00.000Z").toISOString();
    const result = formatTimeAgo(date);
    // Should not contain "ago" — it should be a locale-formatted date string
    expect(result).not.toContain("ago");
    expect(result).not.toBe("Just now");
    // Should contain the month abbreviation
    expect(result).toContain("Jan");
  });

  it("returns a formatted date for very old dates", () => {
    const date = new Date("2020-06-15T10:30:00.000Z").toISOString();
    const result = formatTimeAgo(date);
    expect(result).not.toContain("ago");
    expect(result).toContain("Jun");
  });

  it("floors partial minutes correctly", () => {
    // 1 minute and 45 seconds ago = 1m ago (floors to 1)
    const date = new Date("2025-01-15T11:58:15.000Z").toISOString();
    expect(formatTimeAgo(date)).toBe("1m ago");
  });

  it("floors partial hours correctly", () => {
    // 1 hour and 59 minutes ago = 1h ago (floors to 1)
    const date = new Date("2025-01-15T10:01:00.000Z").toISOString();
    expect(formatTimeAgo(date)).toBe("1h ago");
  });
});
