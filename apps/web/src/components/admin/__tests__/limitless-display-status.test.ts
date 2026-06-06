import {
  deriveLimitlessDisplayStatus,
  type DisplayStatus,
} from "../limitless-display-status";

// A known-mappable format id (Showdown id for Limitless "M-A").
const MAPPED = "gen9championsvgc2026regma";

function row(
  overrides: Partial<{
    import_status: string | null;
    format_id: string;
    data_imported_at: string | null;
  }> = {}
) {
  return {
    import_status: null,
    format_id: MAPPED,
    data_imported_at: null,
    ...overrides,
  };
}

describe("deriveLimitlessDisplayStatus", () => {
  it.each<[string, ReturnType<typeof row>, DisplayStatus]>([
    [
      "data_imported_at wins over everything",
      row({
        data_imported_at: "2026-01-01",
        import_status: "failed",
        format_id: "CUSTOM",
      }),
      "imported",
    ],
    [
      "failed takes precedence over skipped",
      row({ import_status: "failed", format_id: "CUSTOM" }),
      "failed",
    ],
    ["queued", row({ import_status: "queued" }), "queued"],
    ["importing", row({ import_status: "importing" }), "importing"],
    [
      "explicit skipped status",
      row({ import_status: "skipped", format_id: "CUSTOM" }),
      "skipped",
    ],
    [
      "pending + unmappable format → skipped",
      row({ import_status: null, format_id: "CUSTOM" }),
      "skipped",
    ],
    [
      "pending + unknown code → skipped",
      row({ import_status: "pending", format_id: "SOME_NEW_CODE" }),
      "skipped",
    ],
    [
      "pending + mapped format → pending",
      row({ import_status: null, format_id: MAPPED }),
      "pending",
    ],
  ])("%s", (_label, input, expected) => {
    expect(deriveLimitlessDisplayStatus(input)).toBe(expected);
  });
});
