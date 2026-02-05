import { cn, getErrorMessage, isMatchNotification } from "../utils";

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names", () => {
      const result = cn("text-sm", "font-bold");
      expect(result).toContain("text-sm");
      expect(result).toContain("font-bold");
    });

    it("should handle conditional classes", () => {
      const isActive = true;
      const result = cn("base-class", isActive && "active-class");
      expect(result).toContain("base-class");
      expect(result).toContain("active-class");
    });

    it("should handle falsy values", () => {
      const result = cn("text-sm", false, null, undefined, "font-bold");
      expect(result).toContain("text-sm");
      expect(result).toContain("font-bold");
    });
  });

  describe("getErrorMessage", () => {
    it("should extract message from Error object", () => {
      const error = new Error("Test error");
      const result = getErrorMessage(error, "Fallback");
      expect(typeof result).toBe("string");
    });

    it("should extract message from object with message property", () => {
      const error = { message: "Custom error" };
      const result = getErrorMessage(error, "Fallback");
      expect(typeof result).toBe("string");
    });

    it("should return fallback for unknown error types", () => {
      const result = getErrorMessage("string error", "Fallback");
      expect(result).toBe("Fallback");
    });

    it("should return fallback for null/undefined", () => {
      expect(getErrorMessage(null, "Fallback")).toBe("Fallback");
      expect(getErrorMessage(undefined, "Fallback")).toBe("Fallback");
    });
  });

  describe("isMatchNotification", () => {
    it("should return true for match_ready type", () => {
      expect(isMatchNotification("match_ready")).toBe(true);
    });

    it("should return true for tournament_round type", () => {
      expect(isMatchNotification("tournament_round")).toBe(true);
    });

    it("should return false for other notification types", () => {
      expect(isMatchNotification("match_result")).toBe(false);
      expect(isMatchNotification("match_disputed")).toBe(false);
      expect(isMatchNotification("judge_call")).toBe(false);
      expect(isMatchNotification("judge_resolved")).toBe(false);
      expect(isMatchNotification("tournament_start")).toBe(false);
      expect(isMatchNotification("tournament_complete")).toBe(false);
    });

    it("should return false for null", () => {
      expect(isMatchNotification(null)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isMatchNotification("")).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isMatchNotification(undefined as unknown as string | null)).toBe(
        false
      );
    });
  });
});
