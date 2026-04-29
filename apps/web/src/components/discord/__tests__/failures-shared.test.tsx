/**
 * Tests for failures-shared helpers (buildUnifiedRows, filterRows, formatEventType).
 */

import {
  type ChannelFailureRow,
  type DmFailureRow,
} from "@trainers/supabase";

import {
  type UnifiedFailureRow,
  buildUnifiedRows,
  filterRows,
  formatEventType,
} from "../failures-shared";

function makeChannel(
  overrides: Partial<ChannelFailureRow> = {}
): ChannelFailureRow {
  return {
    id: 1,
    channel_id: "ch-1",
    event_type: "tournament_created",
    consecutive_failures: 1,
    last_error_code: null,
    last_error_reason: "boom",
    last_attempt_at: "2026-01-01T10:00:00Z",
    mapping_id: null,
    ...overrides,
  } as ChannelFailureRow;
}

function makeDm(overrides: Partial<DmFailureRow> = {}): DmFailureRow {
  return {
    id: 1,
    user_id: "",
    discord_user_id: "user-1",
    event_type: "match_ready",
    error_code: null,
    error_reason: "boom",
    delivered_via_fallback: false,
    failed_at: "2026-01-01T10:00:00Z",
    username: null,
    ...overrides,
  } as DmFailureRow;
}

describe("buildUnifiedRows", () => {
  it("interleaves channel and DM rows by timestamp DESC", () => {
    const channels = [
      makeChannel({ id: 1, last_attempt_at: "2026-01-01T10:00:00Z" }),
      makeChannel({ id: 2, last_attempt_at: "2026-01-01T08:00:00Z" }),
    ];
    const dms = [
      makeDm({ id: 10, failed_at: "2026-01-01T09:00:00Z" }),
      makeDm({ id: 11, failed_at: "2026-01-01T07:00:00Z" }),
    ];

    const rows = buildUnifiedRows(channels, dms);

    expect(rows.map((r) => `${r.kind}:${r.data.id}`)).toEqual([
      "channel:1",
      "dm:10",
      "channel:2",
      "dm:11",
    ]);
  });

  it("places channel rows with null last_attempt_at last", () => {
    const channels = [
      makeChannel({ id: 1, last_attempt_at: null }),
      makeChannel({ id: 2, last_attempt_at: "2026-01-01T10:00:00Z" }),
    ];
    const dms = [makeDm({ id: 10, failed_at: "2026-01-01T11:00:00Z" })];

    const rows = buildUnifiedRows(channels, dms);

    expect(rows.map((r) => `${r.kind}:${r.data.id}`)).toEqual([
      "dm:10",
      "channel:2",
      "channel:1",
    ]);
  });

  it("returns an empty array when both inputs are empty", () => {
    expect(buildUnifiedRows([], [])).toEqual([]);
  });
});

describe("filterRows", () => {
  const rows: UnifiedFailureRow[] = [
    { kind: "channel", data: makeChannel({ id: 1 }) },
    { kind: "dm", data: makeDm({ id: 2 }) },
    { kind: "channel", data: makeChannel({ id: 3 }) },
  ];

  it.each([
    ["all", [1, 2, 3]],
    ["channels", [1, 3]],
    ["dms", [2]],
  ] as const)("filter=%s returns ids %p", (filter, ids) => {
    const got = filterRows(rows, filter);
    expect(got.map((r) => r.data.id)).toEqual(ids);
  });
});

describe("formatEventType", () => {
  it("title-cases underscored event names", () => {
    expect(formatEventType("tournament_created")).toBe("Tournament Created");
  });

  it("returns 'Unknown event' for null", () => {
    expect(formatEventType(null)).toBe("Unknown event");
  });
});
