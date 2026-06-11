import { describe, it, expect, jest, beforeEach } from "@jest/globals";

import {
  deriveImportRunStatus,
  recordImportRuns,
  type ImportRunRecord,
} from "../import-runs";
import type { TypedClient } from "../../client";
import type { Json } from "../../types";

// =============================================================================
// deriveImportRunStatus — pure function, no DB needed
// =============================================================================

describe("deriveImportRunStatus", () => {
  it.each([
    [
      "skipped flag → skipped",
      { skipped: true, threw: false, errors: 0, processed: 0 },
      "skipped",
    ],
    [
      "skipped wins over threw",
      { skipped: true, threw: true, errors: 0, processed: 0 },
      "skipped",
    ],
    [
      "threw flag → error",
      { skipped: false, threw: true, errors: 0, processed: 0 },
      "error",
    ],
    [
      "errors > 0, processed > 0 → partial",
      { skipped: false, threw: false, errors: 3, processed: 5 },
      "partial",
    ],
    [
      "errors > 0, processed = 0 → error",
      { skipped: false, threw: false, errors: 2, processed: 0 },
      "error",
    ],
    [
      "errors = 0, processed > 0 → ok",
      { skipped: false, threw: false, errors: 0, processed: 10 },
      "ok",
    ],
    [
      "errors = 0, processed = 0 → ok",
      { skipped: false, threw: false, errors: 0, processed: 0 },
      "ok",
    ],
  ] as const)("%s", (_label, input, expected) => {
    expect(deriveImportRunStatus(input)).toBe(expected);
  });
});

// =============================================================================
// recordImportRuns — DB write with intentional swallow-on-error
// =============================================================================

type InsertMock = jest.Mock<Promise<{ error: null | { message: string } }>>;

function makeInsertChain(resolved: { error: null | { message: string } }) {
  const insert: InsertMock = jest.fn().mockResolvedValue(resolved);
  const from = jest.fn().mockReturnValue({ insert });
  return {
    client: { from } as unknown as TypedClient,
    from,
    insert,
  };
}

const SAMPLE_RECORDS: ImportRunRecord[] = [
  {
    source: "limitless",
    status: "ok",
    processed: 5,
    errors: 0,
    remaining: 0,
    detail: { processed: 5 } as unknown as Json,
  },
  {
    source: "rk9",
    status: "skipped",
    skipReason: "auto-import disabled",
    processed: 0,
    errors: 0,
    remaining: null,
    detail: null,
  },
];

describe("recordImportRuns", () => {
  let consoleSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("inserts one row per record with the shared trigger and finished_at", async () => {
    const mock = makeInsertChain({ error: null });

    await recordImportRuns(mock.client, "cron", SAMPLE_RECORDS);

    expect(mock.from).toHaveBeenCalledWith("import_runs");
    expect(mock.insert).toHaveBeenCalledTimes(1);

    const [rows] = mock.insert.mock.calls[0] as [
      Array<{ source: string; trigger: string; finished_at: string }>,
    ];
    expect(rows).toHaveLength(2);

    for (const row of rows) {
      expect(row.trigger).toBe("cron");
      expect(typeof row.finished_at).toBe("string");
      // ISO-8601 sanity check
      expect(new Date(row.finished_at).getTime()).not.toBeNaN();
    }

    expect(rows[0]!.source).toBe("limitless");
    expect(rows[1]!.source).toBe("rk9");
  });

  it("maps skip_reason and status correctly", async () => {
    const mock = makeInsertChain({ error: null });

    await recordImportRuns(mock.client, "manual", SAMPLE_RECORDS);

    const [rows] = mock.insert.mock.calls[0] as [
      Array<{
        source: string;
        status: string;
        skip_reason: string | null;
        processed: number;
        errors: number;
      }>,
    ];

    const limitlessRow = rows.find((r) => r.source === "limitless")!;
    expect(limitlessRow.status).toBe("ok");
    expect(limitlessRow.skip_reason).toBeNull();
    expect(limitlessRow.processed).toBe(5);
    expect(limitlessRow.errors).toBe(0);

    const rk9Row = rows.find((r) => r.source === "rk9")!;
    expect(rk9Row.status).toBe("skipped");
    expect(rk9Row.skip_reason).toBe("auto-import disabled");
  });

  it("returns early without querying when records array is empty", async () => {
    const mock = makeInsertChain({ error: null });

    await recordImportRuns(mock.client, "cron", []);

    expect(mock.from).not.toHaveBeenCalled();
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("logs a console.error and resolves (does not throw) when insert fails", async () => {
    const mock = makeInsertChain({
      error: { message: "db constraint violation" },
    });

    // Must NOT throw — insert failure must not propagate to the caller
    await expect(
      recordImportRuns(mock.client, "cron", SAMPLE_RECORDS)
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[import_runs]"),
      expect.objectContaining({ message: "db constraint violation" })
    );
  });

  it("uses 'manual' trigger when called with manual", async () => {
    const mock = makeInsertChain({ error: null });

    await recordImportRuns(mock.client, "manual", [SAMPLE_RECORDS[0]!]);

    const [rows] = mock.insert.mock.calls[0] as [Array<{ trigger: string }>];
    expect(rows[0]!.trigger).toBe("manual");
  });
});
