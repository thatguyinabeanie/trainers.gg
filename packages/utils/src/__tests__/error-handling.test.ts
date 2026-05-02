import { getErrorMessage, logError, setErrorSink } from "../error-handling";

// Library tsconfig uses ES2022 only — declare `console` ambiently so the
// fallback-sink tests below typecheck without depending on @types/node.
declare const console: {
  error: ((...data: unknown[]) => void) & {
    mock?: { calls: unknown[][] };
    mockRestore?: () => void;
  };
};

const FALLBACK = "Something went wrong";

describe("getErrorMessage", () => {
  describe("with Error instances", () => {
    it("returns the error message", () => {
      const error = new Error("disk full");
      expect(getErrorMessage(error, FALLBACK)).toBe("disk full");
    });

    it("returns fallback when shouldSanitize is true", () => {
      const error = new Error("disk full");
      expect(getErrorMessage(error, FALLBACK, true)).toBe(FALLBACK);
    });
  });

  describe("with objects containing a message property", () => {
    it("returns the message from a plain object", () => {
      // Supabase PostgrestError-shaped object
      const error = { message: "relation not found", code: "42P01" };
      expect(getErrorMessage(error, FALLBACK)).toBe("relation not found");
    });

    it("returns fallback when shouldSanitize is true", () => {
      const error = { message: "relation not found" };
      expect(getErrorMessage(error, FALLBACK, true)).toBe(FALLBACK);
    });

    it("returns fallback when message property is not a string", () => {
      const error = { message: 42 };
      expect(getErrorMessage(error, FALLBACK)).toBe(FALLBACK);
    });

    it("returns fallback when message property is null", () => {
      const error = { message: null };
      expect(getErrorMessage(error, FALLBACK)).toBe(FALLBACK);
    });
  });

  describe("with non-error values", () => {
    it.each([
      ["a string", "some error string"],
      ["a number", 404],
      ["null", null],
      ["undefined", undefined],
      ["a boolean", true],
      ["an empty object", {}],
      ["an array", [1, 2, 3]],
    ])("returns fallback for %s", (_label, value) => {
      expect(getErrorMessage(value, FALLBACK)).toBe(FALLBACK);
    });
  });

  describe("shouldSanitize defaults to false", () => {
    it("exposes error details by default", () => {
      const error = new Error("secret internal detail");
      expect(getErrorMessage(error, FALLBACK)).toBe("secret internal detail");
    });
  });
});

describe("logError + setErrorSink", () => {
  // setErrorSink mutates module-level state — make sure each test cleans up.
  let restore: (() => void) | null = null;

  afterEach(() => {
    if (restore) {
      restore();
      restore = null;
    }
  });

  it("calls the configured sink with scope, error, and context", () => {
    const sink = jest.fn();
    restore = setErrorSink(sink);

    const err = new Error("boom");
    logError("scope.tag", err, { teamId: 7 });

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith("scope.tag", err, { teamId: 7 });
  });

  it("falls back to a bare console.error when the sink itself throws", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const sink = jest.fn(() => {
      throw new Error("sink broke");
    });
    restore = setErrorSink(sink);

    const original = new Error("primary");
    expect(() => logError("scope.tag", original)).not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[error-sink:fallback] scope.tag",
      original
    );
    consoleSpy.mockRestore();
  });

  it("setErrorSink(null) restores the default console-based sink", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const customSink = jest.fn();
    setErrorSink(customSink);
    restore = setErrorSink(null);

    logError("scope.tag", new Error("x"));

    expect(customSink).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    expect(
      (consoleSpy.mock.calls[0]?.[0] as string).startsWith("[error-sink] ")
    ).toBe(true);
    consoleSpy.mockRestore();
  });

  it("returned restore() puts the previous sink back", () => {
    const sinkA = jest.fn();
    const sinkB = jest.fn();

    const restoreToA = setErrorSink(sinkA);
    const restoreToB = setErrorSink(sinkB);

    logError("now-B", new Error("e1"));
    expect(sinkB).toHaveBeenCalledTimes(1);
    expect(sinkA).not.toHaveBeenCalled();

    restoreToB();
    logError("back-to-A", new Error("e2"));
    expect(sinkA).toHaveBeenCalledTimes(1);

    // Final cleanup
    restore = restoreToA;
  });
});
