import {
  getConsentStatus,
  setConsentStatus,
} from "@/components/cookie-consent";

describe("cookie consent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getConsentStatus", () => {
    it.each([
      ["granted", "granted"],
      ["denied", "denied"],
      [null, "undecided"],
      ["invalid", "undecided"],
    ] as const)("returns '%s' as '%s' consent status", (stored, expected) => {
      if (stored) localStorage.setItem("cookie-consent", stored);
      expect(getConsentStatus()).toBe(expected);
    });
  });

  describe("setConsentStatus", () => {
    it("stores the status in localStorage and dispatches event", () => {
      const handler = jest.fn();
      window.addEventListener("consent-change", handler);

      setConsentStatus("granted");

      expect(localStorage.getItem("cookie-consent")).toBe("granted");
      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0][0] as CustomEvent).detail).toBe("granted");

      window.removeEventListener("consent-change", handler);
    });
  });
});
