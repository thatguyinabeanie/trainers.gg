import { upsertById, removeById } from "../realtime-helpers";

// ===========================================================================
// Fixtures
// ===========================================================================

interface Row {
  id: number;
  status: string;
}

const rows: Row[] = [
  { id: 1, status: "pending" },
  { id: 2, status: "agreed" },
  { id: 3, status: "resolved" },
];

// ===========================================================================
// upsertById
// ===========================================================================

describe("upsertById", () => {
  it("appends a new row on INSERT (id not present)", () => {
    const next = upsertById(rows, { id: 4, status: "pending" });
    expect(next).toHaveLength(4);
    expect(next[3]).toEqual({ id: 4, status: "pending" });
  });

  it("replaces an existing row on UPDATE (id present)", () => {
    const next = upsertById(rows, { id: 2, status: "resolved" });
    expect(next).toHaveLength(3);
    expect(next[1]).toEqual({ id: 2, status: "resolved" });
  });

  it("preserves order when replacing a row in the middle", () => {
    const next = upsertById(rows, { id: 2, status: "disputed" });
    expect(next.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("does not mutate the input list", () => {
    const input = rows.slice();
    const snapshot = JSON.stringify(input);
    upsertById(input, { id: 2, status: "disputed" });
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("returns a new array reference (not the same instance)", () => {
    const next = upsertById(rows, { id: 99, status: "pending" });
    expect(next).not.toBe(rows);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
  ])("returns a single-element list when prev is %s", (_label, prev) => {
    const next = upsertById(prev as Row[] | null | undefined, {
      id: 1,
      status: "pending",
    });
    expect(next).toEqual([{ id: 1, status: "pending" }]);
  });

  it("returns a single-element list when prev is empty", () => {
    const next = upsertById([], { id: 5, status: "agreed" });
    expect(next).toEqual([{ id: 5, status: "agreed" }]);
  });
});

// ===========================================================================
// removeById
// ===========================================================================

describe("removeById", () => {
  it("removes the matching row on DELETE", () => {
    const next = removeById(rows, 2);
    expect(next.map((r) => r.id)).toEqual([1, 3]);
  });

  it("returns the remaining rows unchanged when id is not present", () => {
    const next = removeById(rows, 999);
    expect(next.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("does not mutate the input list", () => {
    const input = rows.slice();
    const snapshot = JSON.stringify(input);
    removeById(input, 2);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("returns a new array reference (not the same instance)", () => {
    const next = removeById(rows, 1);
    expect(next).not.toBe(rows);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
  ])("returns an empty list when prev is %s", (_label, prev) => {
    expect(removeById(prev as Row[] | null | undefined, 1)).toEqual([]);
  });

  it("returns an empty list when prev is empty", () => {
    expect(removeById([], 1)).toEqual([]);
  });
});
