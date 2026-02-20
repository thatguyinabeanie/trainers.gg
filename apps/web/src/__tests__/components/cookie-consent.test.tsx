import { render, fireEvent } from "@testing-library/react";
import {
  CookieConsent,
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

    it("returns 'undecided' when localStorage throws", () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });

      expect(getConsentStatus()).toBe("undecided");

      jest.restoreAllMocks();
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

    it("still dispatches event when localStorage throws", () => {
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
      const handler = jest.fn();
      window.addEventListener("consent-change", handler);

      setConsentStatus("granted");

      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0][0] as CustomEvent).detail).toBe("granted");

      window.removeEventListener("consent-change", handler);
      jest.restoreAllMocks();
    });
  });

  describe("CookieConsent component", () => {
    it("renders banner when consent is undecided", () => {
      const { getByText } = render(<CookieConsent />);

      expect(getByText("Accept")).toBeTruthy();
      expect(getByText("Decline")).toBeTruthy();
    });

    it.each(["granted", "denied"] as const)(
      "does not render when consent is '%s'",
      (status) => {
        localStorage.setItem("cookie-consent", status);

        const { container } = render(<CookieConsent />);

        expect(container.innerHTML).toBe("");
      }
    );

    it("hides banner and sets consent on Accept click", () => {
      const handler = jest.fn();
      window.addEventListener("consent-change", handler);

      const { getByText, container } = render(<CookieConsent />);
      fireEvent.click(getByText("Accept"));

      expect(localStorage.getItem("cookie-consent")).toBe("granted");
      expect(handler).toHaveBeenCalledTimes(1);
      expect(container.innerHTML).toBe("");

      window.removeEventListener("consent-change", handler);
    });

    it("hides banner and sets consent on Decline click", () => {
      const handler = jest.fn();
      window.addEventListener("consent-change", handler);

      const { getByText, container } = render(<CookieConsent />);
      fireEvent.click(getByText("Decline"));

      expect(localStorage.getItem("cookie-consent")).toBe("denied");
      expect(handler).toHaveBeenCalledTimes(1);
      expect(container.innerHTML).toBe("");

      window.removeEventListener("consent-change", handler);
    });
  });
});
