import { cn, getErrorMessage } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("handles conditional classes", () => {
    expect(cn("base", true && "active", false && "inactive")).toBe(
      "base active"
    );
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    // tailwind-merge should resolve conflicts
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles undefined and null values", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });
});

describe("getErrorMessage", () => {
  const fallback = "Something went wrong";

  // In test environment, NODE_ENV is "test" (not "production"),
  // so getErrorMessage returns the actual error message.
  it("returns error message for Error objects (non-production)", () => {
    const result = getErrorMessage(new Error("Test error"), fallback);
    expect(result).toBe("Test error");
  });

  it("handles objects with message property (non-production)", () => {
    const result = getErrorMessage({ message: "Custom error" }, fallback);
    expect(result).toBe("Custom error");
  });

  it("returns fallback for unknown error types", () => {
    expect(getErrorMessage("string error", fallback)).toBe(fallback);
    expect(getErrorMessage(42, fallback)).toBe(fallback);
    expect(getErrorMessage(null, fallback)).toBe(fallback);
  });
});
