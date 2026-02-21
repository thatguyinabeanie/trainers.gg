import { getErrorMessage } from "../error-handling";

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
