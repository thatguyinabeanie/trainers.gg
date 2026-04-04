import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- next/navigation ---
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// --- @/hooks/use-auth ---
const mockSignInWithEmail = jest.fn();
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ signInWithEmail: mockSignInWithEmail }),
}));

// --- actions ---
const mockResolveLoginIdentifier = jest.fn();
jest.mock("@/app/(auth-pages)/actions", () => ({
  resolveLoginIdentifier: (...args: unknown[]) =>
    mockResolveLoginIdentifier(...args),
}));

// --- next/link ---
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// --- PasswordInput ---
jest.mock("@/components/ui/password-input", () => ({
  PasswordInput: ({
    id,
    ...rest
  }: { id?: string } & Record<string, unknown>) => (
    <input id={id} type="password" {...rest} />
  ),
}));

// --- SocialAuthButtons ---
jest.mock("../social-auth-buttons", () => ({
  SocialAuthButtons: ({ onEmailClick }: { onEmailClick: () => void }) => (
    <button data-testid="email-signin-btn" onClick={onEmailClick}>
      Sign in with Email
    </button>
  ),
}));

// --- SignInView ---
jest.mock("../sign-in-form", () => ({
  SignInView: ({ hideHeading }: { hideHeading?: boolean }) => (
    <div data-testid="sign-in-view" data-hide-heading={hideHeading} />
  ),
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Trophy: () => <svg data-testid="icon-trophy" />,
}));

import React from "react";
import { LoginScreen } from "../login-screen";

// =============================================================================
// Tests
// =============================================================================

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Initial render
  // ---------------------------------------------------------------------------

  describe("initial render", () => {
    it("renders the branding heading", () => {
      render(<LoginScreen />);
      expect(screen.getByText("trainers.gg")).toBeInTheDocument();
    });

    it("renders the tagline", () => {
      render(<LoginScreen />);
      expect(
        screen.getByText("The competitive Pokemon community platform")
      ).toBeInTheDocument();
    });

    it("renders the username input field", () => {
      render(<LoginScreen />);
      expect(screen.getByLabelText("Username")).toBeInTheDocument();
    });

    it("renders Continue button initially", () => {
      render(<LoginScreen />);
      expect(
        screen.getByRole("button", { name: "Continue" })
      ).toBeInTheDocument();
    });

    it("renders social auth buttons", () => {
      render(<LoginScreen />);
      expect(screen.getByTestId("email-signin-btn")).toBeInTheDocument();
    });

    it("renders Create Account link", () => {
      render(<LoginScreen />);
      expect(
        screen.getByRole("link", { name: "Create Account" })
      ).toHaveAttribute("href", "/sign-up");
    });

    it("renders Terms of Service link", () => {
      render(<LoginScreen />);
      expect(
        screen.getByRole("link", { name: "Terms of Service" })
      ).toHaveAttribute("href", "/terms");
    });

    it("renders Privacy Policy link", () => {
      render(<LoginScreen />);
      expect(
        screen.getByRole("link", { name: "Privacy Policy" })
      ).toHaveAttribute("href", "/privacy");
    });

    it("does not show password field initially", () => {
      render(<LoginScreen />);
      expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Continue step (identifier resolution)
  // ---------------------------------------------------------------------------

  describe("Continue step", () => {
    it("does nothing when username is empty and Continue is clicked", async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      await user.click(screen.getByRole("button", { name: "Continue" }));
      expect(mockResolveLoginIdentifier).not.toHaveBeenCalled();
    });

    it("calls resolveLoginIdentifier with typed username on Continue", async () => {
      mockResolveLoginIdentifier.mockResolvedValue({
        email: "ash@example.com",
      });
      const user = userEvent.setup();
      render(<LoginScreen />);

      await user.type(screen.getByLabelText("Username"), "ash");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(mockResolveLoginIdentifier).toHaveBeenCalledWith("ash");
      });
    });

    it("shows password field when identifier resolves successfully", async () => {
      mockResolveLoginIdentifier.mockResolvedValue({
        email: "ash@example.com",
      });
      const user = userEvent.setup();
      render(<LoginScreen />);

      await user.type(screen.getByLabelText("Username"), "ash");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
      });
    });

    it("shows error when identifier resolve returns resolveError", async () => {
      mockResolveLoginIdentifier.mockResolvedValue({
        email: null,
        error: "No account found",
      });
      const user = userEvent.setup();
      render(<LoginScreen />);

      await user.type(screen.getByLabelText("Username"), "unknown");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(screen.getByText("No account found")).toBeInTheDocument();
      });
    });

    it("shows fallback error when no email and no error returned", async () => {
      mockResolveLoginIdentifier.mockResolvedValue({
        email: null,
        error: null,
      });
      const user = userEvent.setup();
      render(<LoginScreen />);

      await user.type(screen.getByLabelText("Username"), "ghost");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(
          screen.getByText("No account found with that username")
        ).toBeInTheDocument();
      });
    });

    it("shows unexpected error when resolveLoginIdentifier throws", async () => {
      mockResolveLoginIdentifier.mockRejectedValue(new Error("Network error"));
      const user = userEvent.setup();
      render(<LoginScreen />);

      await user.type(screen.getByLabelText("Username"), "ash");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(
          screen.getByText("An unexpected error occurred")
        ).toBeInTheDocument();
      });
    });

    it("shows 'Signing in...' while Continue is processing", async () => {
      mockResolveLoginIdentifier.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      render(<LoginScreen />);

      await user.type(screen.getByLabelText("Username"), "ash");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(
        screen.getByRole("button", { name: "Signing in..." })
      ).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // Sign In step (password entry)
  // ---------------------------------------------------------------------------

  describe("Sign In step (password shown)", () => {
    async function advanceToPasswordStep() {
      mockResolveLoginIdentifier.mockResolvedValue({
        email: "ash@example.com",
      });
      const user = userEvent.setup();
      render(<LoginScreen />);

      await user.type(screen.getByLabelText("Username"), "ash");
      await user.click(screen.getByRole("button", { name: "Continue" }));
      await waitFor(() => screen.getByLabelText("Password"));
      return user;
    }

    it("changes button label to Sign In after password appears", async () => {
      await advanceToPasswordStep();
      expect(
        screen.getByRole("button", { name: "Sign In" })
      ).toBeInTheDocument();
    });

    it("renders Forgot password? link", async () => {
      await advanceToPasswordStep();
      expect(
        screen.getByRole("link", { name: "Forgot password?" })
      ).toHaveAttribute("href", "/forgot-password");
    });

    it("calls signInWithEmail with resolved email and password", async () => {
      mockSignInWithEmail.mockResolvedValue({ error: null });
      const user = await advanceToPasswordStep();

      await user.type(screen.getByLabelText("Password"), "Pass123!");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(mockSignInWithEmail).toHaveBeenCalledWith(
          "ash@example.com",
          "Pass123!"
        );
      });
    });

    it("redirects to '/' on successful sign in", async () => {
      mockSignInWithEmail.mockResolvedValue({ error: null });
      const user = await advanceToPasswordStep();

      await user.type(screen.getByLabelText("Password"), "Pass123!");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("shows error when signInWithEmail fails", async () => {
      mockSignInWithEmail.mockResolvedValue({
        error: { message: "Invalid login credentials" },
      });
      const user = await advanceToPasswordStep();

      await user.type(screen.getByLabelText("Password"), "wrong");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(
          screen.getByText("Invalid login credentials")
        ).toBeInTheDocument();
      });
    });

    it("resolves identifier again on sign in step", async () => {
      mockSignInWithEmail.mockResolvedValue({ error: null });
      const user = await advanceToPasswordStep();

      await user.type(screen.getByLabelText("Password"), "Pass123!");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      // resolveLoginIdentifier called twice: once for Continue, once for Sign In
      await waitFor(() => {
        expect(mockResolveLoginIdentifier).toHaveBeenCalledTimes(2);
      });
    });

    it("clears password step when username changes", async () => {
      const user = await advanceToPasswordStep();

      // Changing username input should hide password
      const usernameInput = screen.getByLabelText("Username");
      await user.clear(usernameInput);
      await user.type(usernameInput, "z");

      await waitFor(() => {
        expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
      });
    });

    it("does not call signInWithEmail when password is empty", async () => {
      const user = await advanceToPasswordStep();
      // Leave password empty and click Sign In
      await user.click(screen.getByRole("button", { name: "Sign In" }));
      expect(mockSignInWithEmail).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Email form mode (SignInView)
  // ---------------------------------------------------------------------------

  describe("email sign-in form", () => {
    it("switches to email form when email button is clicked", async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      await user.click(screen.getByTestId("email-signin-btn"));

      expect(screen.getByTestId("sign-in-view")).toBeInTheDocument();
    });

    it("shows Back to all sign-in options link in email form", async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      await user.click(screen.getByTestId("email-signin-btn"));

      expect(
        screen.getByRole("button", { name: "Back to all sign-in options" })
      ).toBeInTheDocument();
    });

    it("returns to main login screen when Back link is clicked", async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      await user.click(screen.getByTestId("email-signin-btn"));
      await user.click(
        screen.getByRole("button", { name: "Back to all sign-in options" })
      );

      expect(screen.queryByTestId("sign-in-view")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Username")).toBeInTheDocument();
    });

    it("renders trainers.gg logo link in email form", async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      await user.click(screen.getByTestId("email-signin-btn"));

      const links = screen.getAllByRole("link");
      const homeLink = links.find((l) => l.getAttribute("href") === "/");
      expect(homeLink).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Error clearing
  // ---------------------------------------------------------------------------

  it("clears error message when username input changes", async () => {
    mockResolveLoginIdentifier.mockResolvedValue({ email: null, error: null });
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText("Username"), "ghost");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      screen.getByText("No account found with that username")
    );

    await user.type(screen.getByLabelText("Username"), "x");
    expect(
      screen.queryByText("No account found with that username")
    ).not.toBeInTheDocument();
  });
});
