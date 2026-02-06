import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { LoginScreen } from "../login-screen";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { resolveLoginIdentifier } from "@/app/(auth-pages)/actions";

// Mock dependencies
jest.mock("@/hooks/use-auth");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));
jest.mock("@/app/(auth-pages)/actions", () => ({
  resolveLoginIdentifier: jest.fn(),
}));

// Mock child components
jest.mock("../social-auth-buttons", () => ({
  SocialAuthButtons: ({ onEmailClick }: { onEmailClick?: () => void }) => (
    <button onClick={onEmailClick} data-testid="social-auth-buttons">
      Social Auth Buttons
    </button>
  ),
}));

jest.mock("../sign-in-form", () => ({
  SignInView: ({ hideHeading }: { hideHeading?: boolean }) => (
    <div data-testid="sign-in-view">
      {!hideHeading && <h1>Welcome Back</h1>}
      Sign In View
    </div>
  ),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockResolveLoginIdentifier = resolveLoginIdentifier as jest.Mock;

describe("LoginScreen", () => {
  let mockRouter: Partial<AppRouterInstance>;
  let mockSignInWithEmail: jest.Mock;

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
      refresh: jest.fn(),
    } as Partial<AppRouterInstance>;
    mockSignInWithEmail = jest.fn();

    mockUseRouter.mockReturnValue(mockRouter);
    mockUseAuth.mockReturnValue({
      signInWithEmail: mockSignInWithEmail,
    });

    // Mock environment variable
    process.env.NEXT_PUBLIC_PDS_HANDLE_DOMAIN = "trainers.gg";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initial render", () => {
    it("renders branding and logo", () => {
      render(<LoginScreen />);

      expect(screen.getByText("trainers.gg")).toBeInTheDocument();
      expect(
        screen.getByText("The competitive Pokemon community platform")
      ).toBeInTheDocument();
    });

    it("renders username input with domain suffix", () => {
      render(<LoginScreen />);

      expect(screen.getByLabelText("Username")).toBeInTheDocument();
      expect(screen.getByText(".trainers.gg")).toBeInTheDocument();
    });

    it("renders Continue button initially", () => {
      render(<LoginScreen />);

      expect(
        screen.getByRole("button", { name: "Continue" })
      ).toBeInTheDocument();
    });

    it("renders social auth buttons", () => {
      render(<LoginScreen />);

      expect(screen.getByTestId("social-auth-buttons")).toBeInTheDocument();
    });

    it("renders sign up link", () => {
      render(<LoginScreen />);

      expect(screen.getByText("New here?")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Create Account" })
      ).toHaveAttribute("href", "/sign-up");
    });

    it("renders terms and privacy links", () => {
      render(<LoginScreen />);

      expect(screen.getByText(/Terms of Service/)).toBeInTheDocument();
      expect(screen.getByText(/Privacy Policy/)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Terms of Service/ })
      ).toHaveAttribute("href", "/terms");
      expect(
        screen.getByRole("link", { name: /Privacy Policy/ })
      ).toHaveAttribute("href", "/privacy");
    });

    it("does not render password field initially", () => {
      render(<LoginScreen />);

      expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    });
  });

  describe("username validation flow", () => {
    it("requires username to continue", async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      const continueButton = screen.getByRole("button", { name: "Continue" });
      await user.click(continueButton);

      // Should not call resolveLoginIdentifier for empty username
      expect(mockResolveLoginIdentifier).not.toHaveBeenCalled();
    });

    it("successfully validates username and shows password field", async () => {
      const user = userEvent.setup();
      mockResolveLoginIdentifier.mockResolvedValue({
        email: "test@example.com",
        error: null,
      });

      render(<LoginScreen />);

      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "testuser");

      const continueButton = screen.getByRole("button", { name: "Continue" });
      await user.click(continueButton);

      await waitFor(() => {
        expect(mockResolveLoginIdentifier).toHaveBeenCalledWith("testuser");
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Sign In" })
        ).toBeInTheDocument();
      });
    });

    it("shows error when username is not found", async () => {
      const user = userEvent.setup();
      mockResolveLoginIdentifier.mockResolvedValue({
        email: null,
        error: "No account found with that username",
      });

      render(<LoginScreen />);

      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "nonexistent");

      const continueButton = screen.getByRole("button", { name: "Continue" });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "No account found with that username"
        );
      });

      // Should not show password field
      expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    });

    it("shows loading state during username validation", async () => {
      const user = userEvent.setup();
      mockResolveLoginIdentifier.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ email: "test@example.com", error: null }),
              100
            )
          )
      );

      render(<LoginScreen />);

      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "testuser");

      const continueButton = screen.getByRole("button", { name: "Continue" });
      await user.click(continueButton);

      expect(
        screen.getByRole("button", { name: "Signing in..." })
      ).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: "Signing in..." })
        ).not.toBeInTheDocument();
      });
    });

    it("resets password field when username is changed", async () => {
      const user = userEvent.setup();
      mockResolveLoginIdentifier.mockResolvedValue({
        email: "test@example.com",
        error: null,
      });

      render(<LoginScreen />);

      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "testuser");

      const continueButton = screen.getByRole("button", { name: "Continue" });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
      });

      // Change username
      await user.clear(usernameInput);
      await user.type(usernameInput, "different");

      // Password field should be hidden
      expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Continue" })
      ).toBeInTheDocument();
    });

    it("clears error when username is changed", async () => {
      const user = userEvent.setup();
      mockResolveLoginIdentifier.mockResolvedValue({
        email: null,
        error: "No account found",
      });

      render(<LoginScreen />);

      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "nonexistent");

      const continueButton = screen.getByRole("button", { name: "Continue" });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("No account found");
      });

      // Change username
      await user.type(usernameInput, "x");

      // Error should be cleared
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("sign-in flow", () => {
    it("successfully signs in with username and password", async () => {
      const user = userEvent.setup();
      mockResolveLoginIdentifier
        .mockResolvedValueOnce({
          email: "test@example.com",
          error: null,
        })
        .mockResolvedValueOnce({
          email: "test@example.com",
          error: null,
        });
      mockSignInWithEmail.mockResolvedValue({ error: null });

      render(<LoginScreen />);

      // Enter username
      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "testuser");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      // Enter password
      await waitFor(() => {
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText("Password");
      await user.type(passwordInput, "password123");

      const signInButton = screen.getByRole("button", { name: "Sign In" });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignInWithEmail).toHaveBeenCalledWith(
          "test@example.com",
          "password123"
        );
        expect(mockRouter.push).toHaveBeenCalledWith("/");
        expect(mockRouter.refresh).toHaveBeenCalled();
      });
    });

    it("shows error when sign-in fails", async () => {
      const user = userEvent.setup();
      mockResolveLoginIdentifier
        .mockResolvedValueOnce({
          email: "test@example.com",
          error: null,
        })
        .mockResolvedValueOnce({
          email: "test@example.com",
          error: null,
        });
      mockSignInWithEmail.mockResolvedValue({
        error: { message: "Invalid credentials" },
      });

      render(<LoginScreen />);

      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "testuser");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText("Password");
      await user.type(passwordInput, "wrongpassword");

      const signInButton = screen.getByRole("button", { name: "Sign In" });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Invalid credentials"
        );
      });
    });

    it("requires password to sign in", async () => {
      const user = userEvent.setup();
      mockResolveLoginIdentifier.mockResolvedValue({
        email: "test@example.com",
        error: null,
      });

      render(<LoginScreen />);

      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "testuser");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
      });

      // Try to sign in without password
      const signInButton = screen.getByRole("button", { name: "Sign In" });
      await user.click(signInButton);

      // Should not attempt sign-in
      expect(mockSignInWithEmail).not.toHaveBeenCalled();
    });

    it("renders forgot password link when password field is shown", async () => {
      const user = userEvent.setup();
      mockResolveLoginIdentifier.mockResolvedValue({
        email: "test@example.com",
        error: null,
      });

      render(<LoginScreen />);

      // Initially no forgot password link
      expect(screen.queryByText("Forgot password?")).not.toBeInTheDocument();

      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "testuser");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(screen.getByText("Forgot password?")).toBeInTheDocument();
        expect(
          screen.getByRole("link", { name: "Forgot password?" })
        ).toHaveAttribute("href", "/forgot-password");
      });
    });
  });

  describe("email form toggle", () => {
    it("switches to email form when email button is clicked", async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      const socialAuthButtons = screen.getByTestId("social-auth-buttons");
      await user.click(socialAuthButtons);

      await waitFor(() => {
        expect(screen.getByTestId("sign-in-view")).toBeInTheDocument();
      });

      // Username form should be hidden
      expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
    });

    it("shows back button in email form view", async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      const socialAuthButtons = screen.getByTestId("social-auth-buttons");
      await user.click(socialAuthButtons);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Back to all sign-in options" })
        ).toBeInTheDocument();
      });
    });

    it("switches back to username form when back button is clicked", async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      const socialAuthButtons = screen.getByTestId("social-auth-buttons");
      await user.click(socialAuthButtons);

      await waitFor(() => {
        expect(screen.getByTestId("sign-in-view")).toBeInTheDocument();
      });

      const backButton = screen.getByRole("button", {
        name: "Back to all sign-in options",
      });
      await user.click(backButton);

      expect(screen.queryByTestId("sign-in-view")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Username")).toBeInTheDocument();
    });

    it("hides heading in email form view", async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      const socialAuthButtons = screen.getByTestId("social-auth-buttons");
      await user.click(socialAuthButtons);

      await waitFor(() => {
        const signInView = screen.getByTestId("sign-in-view");
        expect(signInView).toBeInTheDocument();
        expect(signInView).not.toHaveTextContent("Welcome Back");
      });
    });
  });

  describe("error handling", () => {
    it("shows generic error for unexpected errors during username validation", async () => {
      const user = userEvent.setup();
      mockResolveLoginIdentifier.mockRejectedValue(new Error("Network error"));

      render(<LoginScreen />);

      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "testuser");

      const continueButton = screen.getByRole("button", { name: "Continue" });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "An unexpected error occurred"
        );
      });
    });

    it("shows generic error for unexpected errors during sign-in", async () => {
      const user = userEvent.setup();
      mockResolveLoginIdentifier
        .mockResolvedValueOnce({
          email: "test@example.com",
          error: null,
        })
        .mockRejectedValueOnce(new Error("Network error"));

      render(<LoginScreen />);

      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "testuser");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText("Password");
      await user.type(passwordInput, "password123");

      const signInButton = screen.getByRole("button", { name: "Sign In" });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "An unexpected error occurred"
        );
      });
    });
  });

  describe("accessibility", () => {
    it("has correct input attributes", () => {
      render(<LoginScreen />);

      const usernameInput = screen.getByLabelText("Username");
      expect(usernameInput).toHaveAttribute("type", "text");
      expect(usernameInput).toHaveAttribute("autoComplete", "username");
      expect(usernameInput).toHaveAttribute("placeholder", "username");
    });

    it("has username input for user entry", () => {
      render(<LoginScreen />);

      const usernameInput = screen.getByLabelText("Username");
      expect(usernameInput).toBeInTheDocument();
      expect(usernameInput).toHaveAttribute("type", "text");
    });

    it("shows password input after username validation", async () => {
      const user = userEvent.setup();
      mockResolveLoginIdentifier.mockResolvedValue({
        email: "test@example.com",
        error: null,
      });

      render(<LoginScreen />);

      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "testuser");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        const passwordInput = screen.getByLabelText("Password");
        expect(passwordInput).toBeInTheDocument();
        expect(passwordInput).toHaveAttribute("type", "password");
      });
    });
  });
});
