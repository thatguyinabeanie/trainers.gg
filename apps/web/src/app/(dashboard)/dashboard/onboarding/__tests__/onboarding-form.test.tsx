import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";

// --- next/navigation ---
const mockRouterPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

// --- @/actions/onboarding ---
jest.mock("@/actions/onboarding", () => ({
  completeOnboarding: jest.fn(),
}));

// --- @/actions/profile ---
jest.mock("@/actions/profile", () => ({
  checkUsernameAvailability: jest.fn(),
}));

// --- @trainers/utils ---
jest.mock("@trainers/utils", () => ({
  COUNTRIES: [
    { code: "US", name: "United States" },
    { code: "JP", name: "Japan" },
    { code: "GB", name: "United Kingdom" },
  ],
}));

// --- @trainers/validators ---
jest.mock("@trainers/validators", () => ({
  usernameSchema: {
    safeParse: jest.fn((value: string) => {
      const ok = /^[a-zA-Z0-9_]{3,}$/.test(value);
      return ok
        ? { success: true }
        : {
            success: false,
            error: {
              errors: [{ message: "Username must be at least 3 characters" }],
            },
          };
    }),
  },
}));

import React from "react";
import { completeOnboarding } from "@/actions/onboarding";
import { checkUsernameAvailability } from "@/actions/profile";
import { OnboardingForm } from "../onboarding-form";

const mockCompleteOnboarding = jest.mocked(completeOnboarding);
const mockCheckUsername = jest.mocked(checkUsernameAvailability);

// ============================================================================
// Helper: change an input's value via fireEvent (works with fake timers)
// ============================================================================
function changeInput(el: HTMLElement, value: string) {
  fireEvent.change(el, { target: { value } });
}

// ============================================================================
// Tests
// ============================================================================

describe("OnboardingForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCheckUsername.mockResolvedValue({ available: true });
    mockCompleteOnboarding.mockResolvedValue({ success: true, error: null });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Initial render
  // --------------------------------------------------------------------------

  describe("initial render", () => {
    it("renders the username input", () => {
      render(<OnboardingForm />);
      expect(screen.getByLabelText("Username")).toBeInTheDocument();
    });

    it("renders the bio textarea", () => {
      render(<OnboardingForm />);
      // Label for bio contains "Bio" and "(optional)"
      expect(
        screen.getByPlaceholderText("Tell us about yourself...")
      ).toBeInTheDocument();
    });

    it("renders the birth date input", () => {
      render(<OnboardingForm />);
      expect(screen.getByLabelText(/birth date/i)).toBeInTheDocument();
    });

    it("renders the submit button as disabled initially", () => {
      render(<OnboardingForm />);
      expect(
        screen.getByRole("button", { name: /complete setup/i })
      ).toBeDisabled();
    });

    it("renders the .trainers.gg domain hint", () => {
      render(<OnboardingForm />);
      expect(screen.getByText(".trainers.gg")).toBeInTheDocument();
    });

    it("renders the @ prefix in the username field", () => {
      render(<OnboardingForm />);
      expect(screen.getByText("@")).toBeInTheDocument();
    });

    it("renders 0/160 bio counter initially", () => {
      render(<OnboardingForm />);
      expect(screen.getByText("0/160")).toBeInTheDocument();
    });

    it("renders the username placeholder", () => {
      render(<OnboardingForm />);
      expect(screen.getByPlaceholderText("cooltrainer")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Username validation — local (Zod)
  // --------------------------------------------------------------------------

  describe("username local validation", () => {
    it("shows validation error for too-short username", async () => {
      render(<OnboardingForm />);
      const input = screen.getByLabelText("Username");
      changeInput(input, "ab");
      expect(
        await screen.findByText("Username must be at least 3 characters")
      ).toBeInTheDocument();
    });

    it("does not call checkUsernameAvailability for invalid username", () => {
      render(<OnboardingForm />);
      changeInput(screen.getByLabelText("Username"), "ab");
      act(() => {
        jest.advanceTimersByTime(600);
      });
      expect(mockCheckUsername).not.toHaveBeenCalled();
    });

    it("resets to idle when username is cleared", async () => {
      render(<OnboardingForm />);
      const input = screen.getByLabelText("Username");
      changeInput(input, "cooltrainer");
      changeInput(input, "");
      // Clearing removes any status messages
      expect(
        screen.queryByText("Username is available")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Username must be at least 3 characters")
      ).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Username validation — async (availability check)
  // --------------------------------------------------------------------------

  describe("username availability check", () => {
    it("calls checkUsernameAvailability after debounce for valid username", async () => {
      render(<OnboardingForm />);
      changeInput(screen.getByLabelText("Username"), "cooltrainer");
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      await waitFor(() =>
        expect(mockCheckUsername).toHaveBeenCalledWith("cooltrainer")
      );
    });

    it("shows 'Username is available' after successful check", async () => {
      mockCheckUsername.mockResolvedValue({ available: true });
      render(<OnboardingForm />);
      changeInput(screen.getByLabelText("Username"), "cooltrainer");
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      await waitFor(() =>
        expect(screen.getByText("Username is available")).toBeInTheDocument()
      );
    });

    it("shows taken error when username is not available", async () => {
      mockCheckUsername.mockResolvedValue({
        available: false,
        error: "Username is taken",
      });
      render(<OnboardingForm />);
      changeInput(screen.getByLabelText("Username"), "takenname");
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      await waitFor(() =>
        expect(screen.getByText("Username is taken")).toBeInTheDocument()
      );
    });

    it("shows fallback error when taken but no error message provided", async () => {
      mockCheckUsername.mockResolvedValue({ available: false });
      render(<OnboardingForm />);
      changeInput(screen.getByLabelText("Username"), "takenname");
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      await waitFor(() =>
        expect(
          screen.getByText("Username is not available")
        ).toBeInTheDocument()
      );
    });

    it("does not fire check before debounce timer completes", () => {
      render(<OnboardingForm />);
      changeInput(screen.getByLabelText("Username"), "cooltrainer");
      act(() => {
        jest.advanceTimersByTime(400); // less than 500ms debounce
      });
      expect(mockCheckUsername).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Bio character counter
  // --------------------------------------------------------------------------

  describe("bio counter", () => {
    it("updates character count as user types", () => {
      render(<OnboardingForm />);
      const bio = screen.getByPlaceholderText("Tell us about yourself...");
      changeInput(bio, "Hello!");
      expect(screen.getByText("6/160")).toBeInTheDocument();
    });

    it("shows 0/160 initially", () => {
      render(<OnboardingForm />);
      expect(screen.getByText("0/160")).toBeInTheDocument();
    });

    it("shows correct count for longer text", () => {
      render(<OnboardingForm />);
      const bio = screen.getByPlaceholderText("Tell us about yourself...");
      const text = "a".repeat(80);
      changeInput(bio, text);
      expect(screen.getByText("80/160")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Submit button enablement
  // --------------------------------------------------------------------------

  describe("submit button state", () => {
    it("is disabled when no username is entered", () => {
      render(<OnboardingForm />);
      expect(
        screen.getByRole("button", { name: /complete setup/i })
      ).toBeDisabled();
    });

    it("is disabled when username is available but no country selected", async () => {
      render(<OnboardingForm />);
      changeInput(screen.getByLabelText("Username"), "cooltrainer");
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      await waitFor(() =>
        expect(screen.getByText("Username is available")).toBeInTheDocument()
      );
      expect(
        screen.getByRole("button", { name: /complete setup/i })
      ).toBeDisabled();
    });

    it("is disabled when username is taken", async () => {
      mockCheckUsername.mockResolvedValue({
        available: false,
        error: "Username is taken",
      });
      render(<OnboardingForm />);
      changeInput(screen.getByLabelText("Username"), "takenname");
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      await waitFor(() =>
        expect(screen.getByText("Username is taken")).toBeInTheDocument()
      );
      expect(
        screen.getByRole("button", { name: /complete setup/i })
      ).toBeDisabled();
    });
  });

  // --------------------------------------------------------------------------
  // Optional fields
  // --------------------------------------------------------------------------

  describe("optional fields", () => {
    it("renders two '(optional)' labels — one for bio, one for birth date", () => {
      render(<OnboardingForm />);
      const optionals = screen.getAllByText("(optional)");
      expect(optionals).toHaveLength(2);
    });

    it("accepts input for the birth date field", () => {
      render(<OnboardingForm />);
      const birthDateInput = screen.getByLabelText(/birth date/i);
      changeInput(birthDateInput, "2000-01-15");
      expect(birthDateInput).toHaveValue("2000-01-15");
    });
  });

  // --------------------------------------------------------------------------
  // Error display
  // --------------------------------------------------------------------------

  describe("form error display", () => {
    it("does not show error banner initially", () => {
      render(<OnboardingForm />);
      // No form-level error text
      expect(
        screen.queryByText(/something went wrong/i)
      ).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Country select renders options
  // --------------------------------------------------------------------------

  describe("country select", () => {
    it("renders 'Select your country' placeholder trigger", () => {
      render(<OnboardingForm />);
      expect(screen.getByText("Select your country")).toBeInTheDocument();
    });
  });
});
