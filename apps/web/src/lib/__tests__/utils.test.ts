import { cn, getErrorMessage } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const isInactive = false;
    expect(cn("base", isActive && "active", isInactive && "inactive")).toBe(
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

  describe("production behavior", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      (process.env as Record<string, string | undefined>).NODE_ENV =
        "production";
    });

    afterEach(() => {
      (process.env as Record<string, string | undefined>).NODE_ENV =
        originalEnv;
    });

    it("returns fallback for Error objects in production", () => {
      const result = getErrorMessage(
        new Error("Secret internal error"),
        fallback
      );
      expect(result).toBe(fallback);
    });

    it("returns fallback for objects with message in production", () => {
      const result = getErrorMessage({ message: "Internal detail" }, fallback);
      expect(result).toBe(fallback);
    });

    it("returns fallback for unknown types in production", () => {
      expect(getErrorMessage("string error", fallback)).toBe(fallback);
      expect(getErrorMessage(null, fallback)).toBe(fallback);
    });
  });
});
