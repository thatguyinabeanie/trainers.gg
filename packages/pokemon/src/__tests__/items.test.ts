import { getAllItems, getItemShortDesc } from "../items";

describe("getAllItems", () => {
  it("returns a non-empty array of item names", () => {
    const items = getAllItems();
    expect(items.length).toBeGreaterThan(0);
  });

  it("returns items in alphabetical order", () => {
    const items = getAllItems();
    const sorted = [...items].sort();
    expect(items).toEqual(sorted);
  });

  it("includes well-known competitive items", () => {
    const items = getAllItems();
    expect(items).toContain("Choice Band");
    expect(items).toContain("Leftovers");
    expect(items).toContain("Life Orb");
    expect(items).toContain("Focus Sash");
  });

  it("does not contain empty strings", () => {
    const items = getAllItems();
    expect(items.every((name) => name.length > 0)).toBe(true);
  });
});

describe("getItemShortDesc", () => {
  it("returns a description for a known item", () => {
    const desc = getItemShortDesc("Leftovers");
    expect(desc).toBeTruthy();
    expect(typeof desc).toBe("string");
  });

  it("returns null or empty for a nonexistent item", () => {
    const desc = getItemShortDesc("Totally Fake Item That Does Not Exist");
    expect(!desc).toBe(true);
  });
});
