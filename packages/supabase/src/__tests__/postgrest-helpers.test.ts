import { pgInList } from "../postgrest-helpers";

describe("pgInList", () => {
  it("wraps a single value in parens with quotes", () => {
    expect(pgInList(["CUSTOM"])).toBe('("CUSTOM")');
  });

  it("joins multiple values", () => {
    expect(pgInList(["a", "b", "c"])).toBe('("a","b","c")');
  });

  it("handles numbers", () => {
    expect(pgInList([1, 2])).toBe('("1","2")');
  });

  it("escapes embedded quotes and backslashes", () => {
    expect(pgInList(['a"b', "c\\d"])).toBe('("a\\"b","c\\\\d")');
  });
});
