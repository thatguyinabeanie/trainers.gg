import { describe, it, expect, jest, beforeEach } from "@jest/globals";

import { listRecentImportRuns } from "../import-runs";
import type { TypedClient } from "../../client";

// ---------------------------------------------------------------------------
// Chainable mock query builder: .select().order().limit() then awaited.
// ---------------------------------------------------------------------------

type Resolved = { data: unknown; error: unknown };

function createMockClient(resolved: Resolved) {
  const limit = jest.fn().mockReturnValue(Promise.resolve(resolved));
  const order = jest.fn().mockReturnValue({ limit });
  const select = jest.fn().mockReturnValue({ order });
  const from = jest.fn().mockReturnValue({ select });
  return {
    client: { from } as unknown as TypedClient,
    from,
    select,
    order,
    limit,
  };
}

describe("listRecentImportRuns", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queries import_runs, newest first, with the default limit", async () => {
    const rows = [{ id: 2 }, { id: 1 }];
    const mock = createMockClient({ data: rows, error: null });

    const result = await listRecentImportRuns(mock.client);

    expect(mock.from).toHaveBeenCalledWith("import_runs");
    expect(mock.order).toHaveBeenCalledWith("started_at", { ascending: false });
    expect(mock.limit).toHaveBeenCalledWith(20);
    expect(result).toBe(rows);
  });

  it("returns an empty array when data is null", async () => {
    const mock = createMockClient({ data: null, error: null });

    const result = await listRecentImportRuns(mock.client);

    expect(result).toEqual([]);
  });

  it("throws a descriptive error when the query errors", async () => {
    const mock = createMockClient({
      data: null,
      error: { message: "boom" },
    });

    await expect(listRecentImportRuns(mock.client)).rejects.toThrow(
      /Failed to fetch import runs: boom/
    );
  });

  it.each([
    ["below min clamps to 1", 0, 1],
    ["negative clamps to 1", -5, 1],
    ["above max clamps to 100", 999, 100],
    ["in-range passes through", 50, 50],
    ["truncates fractional", 12.9, 12],
  ])("%s", async (_label, input, expected) => {
    const mock = createMockClient({ data: [], error: null });

    await listRecentImportRuns(mock.client, input);

    expect(mock.limit).toHaveBeenCalledWith(expected);
  });
});
