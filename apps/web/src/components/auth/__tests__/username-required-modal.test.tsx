import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- next/navigation ---
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: mockRefresh }),
}));

// --- @/hooks/use-auth ---
const mockUseAuth = jest.fn();
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// --- @trainers/validators ---
jest.mock("@trainers/validators", () => ({
  usernameSchema: {
    safeParse: (val: string) => {
      // Simple validation: must be 3-20 alphanumeric chars
      if (/^[a-z0-9_]{3,20}$/.test(val)) {
        return { success: true };
      }
      return {
        success: false,
        error: { errors: [{ message: "Invalid username format" }] },
      };
    },
  },
}));

// --- @trainers/utils ---
jest.mock("@trainers/utils", () => ({
  COUNTRIES: [
    { code: "US", name: "United States" },
    { code: "JP", name: "Japan" },
  ],
}));

// --- actions ---
const mockCheckUsernameAvailability = jest.fn();
const mockCompleteOnboarding = jest.fn();
jest.mock("@/actions/profile", () => ({
  checkUsernameAvailability: (...args: unknown[]) =>
    mockCheckUsernameAvailability(...args),
}));
jest.mock("@/actions/onboarding", () => ({
  completeOnboarding: (...args: unknown[]) => mockCompleteOnboarding(...args),
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Check: () => <svg data-testid="icon-check" />,
  Loader2: () => <svg data-testid="icon-loader" />,
  X: () => <svg data-testid="icon-x" />,
}));

// --- Select ---
jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    value?: string;
  }) => (
    <div data-testid="select" data-value={value}>
      {children}
      <button
        data-testid="select-us"
        onClick={() => onValueChange?.("US")}
        type="button"
      >
        Select US
      </button>
      <button
        data-testid="select-jp"
        onClick={() => onValueChange?.("JP")}
        type="button"
      >
        Select JP
      </button>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({
    children,
    id,
  }: {
    children: React.ReactNode;
    id?: string;
  }) => <div id={id}>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

import React from "react";
import { UsernameRequiredModal } from "../username-required-modal";

// =============================================================================
// Helpers
// =============================================================================

function setAuthUser(username: string, loading = false) {
  mockUseAuth.mockReturnValue({
    user: {
      id: "user-1",
      user_metadata: { username },
    },
    loading,
  });
}

// =============================================================================
// Tests
// =============================================================================

describe("UsernameRequiredModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // shouldShow logic
  // ---------------------------------------------------------------------------

  describe("shouldShow conditions", () => {
    it("returns null when user is null", () => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });
      const { container } = render(<UsernameRequiredModal />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when loading is true", () => {
      setAuthUser("temp_abc123", true);
      const { container } = render(<UsernameRequiredModal />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when username is a regular username", () => {
      setAuthUser("ash_ketchum");
      const { container } = render(<UsernameRequiredModal />);
      expect(container.firstChild).toBeNull();
    });

    it("shows modal for temp_ prefixed username", () => {
      setAuthUser("temp_abc123");
      render(<UsernameRequiredModal />);
      expect(screen.getByText("Choose Your Username")).toBeInTheDocument();
    });

    it("shows modal for user_ prefixed username", () => {
      setAuthUser("user_xyz999");
      render(<UsernameRequiredModal />);
      expect(screen.getByText("Choose Your Username")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Modal content
  // ---------------------------------------------------------------------------

  describe("modal content", () => {
    beforeEach(() => {
      setAuthUser("temp_abc123");
    });

    it("renders dialog title", () => {
      render(<UsernameRequiredModal />);
      expect(screen.getByText("Choose Your Username")).toBeInTheDocument();
    });

    it("renders username input", () => {
      render(<UsernameRequiredModal />);
      expect(screen.getByPlaceholderText("cooltrainer")).toBeInTheDocument();
    });

    it("renders Continue button (disabled initially)", () => {
      render(<UsernameRequiredModal />);
      const btn = screen.getByRole("button", { name: "Continue" });
      expect(btn).toBeDisabled();
    });

    it("renders country select", () => {
      render(<UsernameRequiredModal />);
      expect(screen.getByTestId("select")).toBeInTheDocument();
    });

    it("renders bio hint text", () => {
      render(<UsernameRequiredModal />);
      expect(
        screen.getByText("Bio and other details can be added later in settings")
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Username validation
  // ---------------------------------------------------------------------------

  describe("username validation", () => {
    beforeEach(() => {
      setAuthUser("temp_abc123");
    });

    it("shows error icon and message for invalid username format", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<UsernameRequiredModal />);

      await user.type(screen.getByPlaceholderText("cooltrainer"), "ab");
      // Format invalid → immediate error (no debounce for schema errors)
      await waitFor(() => {
        expect(screen.getByTestId("icon-x")).toBeInTheDocument();
        expect(screen.getByText("Invalid username format")).toBeInTheDocument();
      });
    });

    it("shows checking state while debounce is active", async () => {
      mockCheckUsernameAvailability.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<UsernameRequiredModal />);

      await user.type(screen.getByPlaceholderText("cooltrainer"), "validname");
      // After typing, status transitions to checking before debounce resolves
      await waitFor(() => {
        expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
      });
    });

    it("shows available state when username is available", async () => {
      mockCheckUsernameAvailability.mockResolvedValue({ available: true });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<UsernameRequiredModal />);

      await user.type(screen.getByPlaceholderText("cooltrainer"), "coolash");
      jest.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId("icon-check")).toBeInTheDocument();
        expect(screen.getByText("Username is available")).toBeInTheDocument();
      });
    });

    it("shows taken state when username is not available", async () => {
      mockCheckUsernameAvailability.mockResolvedValue({
        available: false,
        error: "Username is already taken",
      });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<UsernameRequiredModal />);

      await user.type(screen.getByPlaceholderText("cooltrainer"), "takenname");
      jest.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId("icon-x")).toBeInTheDocument();
        expect(
          screen.getByText("Username is already taken")
        ).toBeInTheDocument();
      });
    });

    it("returns to idle when username is cleared", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<UsernameRequiredModal />);

      const input = screen.getByPlaceholderText("cooltrainer");
      await user.type(input, "ab");
      await user.clear(input);

      await waitFor(() => {
        expect(
          screen.queryByText("Invalid username format")
        ).not.toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // canSubmit guard
  // ---------------------------------------------------------------------------

  describe("canSubmit conditions", () => {
    beforeEach(() => {
      setAuthUser("temp_abc123");
    });

    it("button remains disabled when username is available but no country selected", async () => {
      mockCheckUsernameAvailability.mockResolvedValue({ available: true });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<UsernameRequiredModal />);

      await user.type(screen.getByPlaceholderText("cooltrainer"), "coolash");
      jest.advanceTimersByTime(600);

      await waitFor(() => {
        screen.getByText("Username is available");
      });

      const btn = screen.getByRole("button", { name: "Continue" });
      expect(btn).toBeDisabled();
    });

    it("button is enabled when both username is available and country selected", async () => {
      mockCheckUsernameAvailability.mockResolvedValue({ available: true });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<UsernameRequiredModal />);

      await user.type(screen.getByPlaceholderText("cooltrainer"), "coolash");
      jest.advanceTimersByTime(600);

      await waitFor(() => screen.getByText("Username is available"));

      await user.click(screen.getByTestId("select-us"));

      const btn = screen.getByRole("button", { name: "Continue" });
      expect(btn).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // Form submission
  // ---------------------------------------------------------------------------

  describe("form submission", () => {
    async function setupReadyToSubmit() {
      setAuthUser("temp_abc123");
      mockCheckUsernameAvailability.mockResolvedValue({ available: true });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<UsernameRequiredModal />);

      await user.type(screen.getByPlaceholderText("cooltrainer"), "coolash");
      jest.advanceTimersByTime(600);
      await waitFor(() => screen.getByText("Username is available"));
      await user.click(screen.getByTestId("select-us"));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Continue" })
        ).not.toBeDisabled()
      );
      return user;
    }

    it("calls completeOnboarding with username and country on submit", async () => {
      mockCompleteOnboarding.mockResolvedValue({ success: true });
      const user = await setupReadyToSubmit();

      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(mockCompleteOnboarding).toHaveBeenCalledWith({
          username: "coolash",
          country: "US",
          bio: "",
        });
      });
    });

    it("calls router.refresh on success", async () => {
      mockCompleteOnboarding.mockResolvedValue({ success: true });
      const user = await setupReadyToSubmit();

      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("shows form error when completeOnboarding fails", async () => {
      mockCompleteOnboarding.mockResolvedValue({
        success: false,
        error: "Server error occurred",
      });
      const user = await setupReadyToSubmit();

      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(screen.getByText("Server error occurred")).toBeInTheDocument();
      });
    });

    it("shows fallback error when error is null", async () => {
      mockCompleteOnboarding.mockResolvedValue({
        success: false,
        error: null,
      });
      const user = await setupReadyToSubmit();

      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      });
    });

    it("sets username status to taken when error contains 'taken'", async () => {
      mockCompleteOnboarding.mockResolvedValue({
        success: false,
        error: "Username already taken",
      });
      const user = await setupReadyToSubmit();

      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(screen.getByText("Username already taken")).toBeInTheDocument();
        // icon-x appears for taken status
        expect(screen.getByTestId("icon-x")).toBeInTheDocument();
      });
    });
  });
});
