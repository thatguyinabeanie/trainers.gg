import { cn } from "../cn";

describe("cn", () => {
  it("joins class strings", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("filters out falsy values", () => {
    expect(cn("base", false, undefined, null, "end")).toBe("base end");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns empty string for all falsy arguments", () => {
    expect(cn(false, undefined, null)).toBe("");
  });

  it("handles single class", () => {
    expect(cn("only-class")).toBe("only-class");
  });
});
