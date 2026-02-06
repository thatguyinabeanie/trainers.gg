import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SignInForm, SignInView } from "../sign-in-form";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  resolveLoginIdentifier,
  checkUsernameAvailability,
} from "@/app/(auth-pages)/actions";

// Mock dependencies
jest.mock("@/hooks/use-auth");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));
jest.mock("@/app/(auth-pages)/actions", () => ({
  resolveLoginIdentifier: jest.fn(),
  checkUsernameAvailability: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockResolveLoginIdentifier = resolveLoginIdentifier as jest.Mock;
const _mockCheckUsernameAvailability = checkUsernameAvailability as jest.Mock;

describe("SignInForm", () => {
  let mockRouter: Partial<AppRouterInstance>;
  let mockSignInWithEmail: jest.Mock;
  let mockSignUpWithEmail: jest.Mock;

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
      refresh: jest.fn(),
    } as Partial<AppRouterInstance>;
    mockSignInWithEmail = jest.fn();
    mockSignUpWithEmail = jest.fn();

    mockUseRouter.mockReturnValue(mockRouter);
    mockUseAuth.mockReturnValue({
      signInWithEmail: mockSignInWithEmail,
      signUpWithEmail: mockSignUpWithEmail,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("mode switching", () => {
    it("renders in sign-in mode by default", () => {
      render(<SignInForm />);
      expect(screen.getByText("Welcome Back")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Sign In" })
      ).toBeInTheDocument();
    });

    it("renders in sign-up mode when defaultMode is signup", () => {
      render(<SignInForm defaultMode="signup" />);
      expect(screen.getByText("Join trainers.gg")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Create Account" })
      ).toBeInTheDocument();
    });

    it("switches from sign-in to sign-up mode when Create Account is clicked", async () => {
      const user = userEvent.setup();
      render(<SignInForm />);

      expect(screen.getByText("Welcome Back")).toBeInTheDocument();

      const createAccountButton = screen.getByRole("button", {
        name: "Create Account",
      });
      await user.click(createAccountButton);

      expect(screen.getByText("Join trainers.gg")).toBeInTheDocument();
    });

    it("switches from sign-up to sign-in mode when Sign In is clicked", async () => {
      const user = userEvent.setup();
      render(<SignInForm defaultMode="signup" />);

      expect(screen.getByText("Join trainers.gg")).toBeInTheDocument();

      const signInButton = screen.getByRole("button", { name: "Sign In" });
      await user.click(signInButton);

      expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    });
  });
});

describe("SignInView", () => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders sign-in form correctly", () => {
    render(<SignInView />);

    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    expect(screen.getByLabelText("Email or Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });

  it("hides heading when hideHeading is true", () => {
    render(<SignInView hideHeading />);

    expect(screen.queryByText("Welcome Back")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email or Username")).toBeInTheDocument();
  });

  it("shows validation error for empty identifier", async () => {
    const user = userEvent.setup();
    render(<SignInView />);

    const submitButton = screen.getByRole("button", { name: "Sign In" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Email or username is required")
      ).toBeInTheDocument();
    });
  });

  it("shows validation error for empty password", async () => {
    const user = userEvent.setup();
    render(<SignInView />);

    const identifierInput = screen.getByLabelText("Email or Username");
    await user.type(identifierInput, "testuser");

    const submitButton = screen.getByRole("button", { name: "Sign In" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid identifier format", async () => {
    const user = userEvent.setup();
    render(<SignInView />);

    const identifierInput = screen.getByLabelText("Email or Username");
    await user.type(identifierInput, "!@");

    const submitButton = screen.getByRole("button", { name: "Sign In" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid email or username")
      ).toBeInTheDocument();
    });
  });

  it("accepts valid email format", async () => {
    const user = userEvent.setup();
    mockResolveLoginIdentifier.mockResolvedValue({
      email: "test@example.com",
      error: null,
    });
    mockSignInWithEmail.mockResolvedValue({ error: null });

    render(<SignInView />);

    const identifierInput = screen.getByLabelText("Email or Username");
    const passwordInput = screen.getByLabelText("Password");

    await user.type(identifierInput, "test@example.com");
    await user.type(passwordInput, "password123");

    const submitButton = screen.getByRole("button", { name: "Sign In" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockResolveLoginIdentifier).toHaveBeenCalledWith(
        "test@example.com"
      );
    });
  });

  it("accepts valid username format", async () => {
    const user = userEvent.setup();
    mockResolveLoginIdentifier.mockResolvedValue({
      email: "test@example.com",
      error: null,
    });
    mockSignInWithEmail.mockResolvedValue({ error: null });

    render(<SignInView />);

    const identifierInput = screen.getByLabelText("Email or Username");
    const passwordInput = screen.getByLabelText("Password");

    await user.type(identifierInput, "testuser");
    await user.type(passwordInput, "password123");

    const submitButton = screen.getByRole("button", { name: "Sign In" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockResolveLoginIdentifier).toHaveBeenCalledWith("testuser");
    });
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();
    mockResolveLoginIdentifier.mockResolvedValue({
      email: "test@example.com",
      error: null,
    });
    mockSignInWithEmail.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 100)
        )
    );

    render(<SignInView />);

    const identifierInput = screen.getByLabelText("Email or Username");
    const passwordInput = screen.getByLabelText("Password");

    await user.type(identifierInput, "testuser");
    await user.type(passwordInput, "password123");

    const submitButton = screen.getByRole("button", { name: "Sign In" });
    await user.click(submitButton);

    expect(
      screen.getByRole("button", { name: "Signing in..." })
    ).toBeDisabled();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Sign In" })
      ).not.toBeDisabled();
    });
  });

  it("successfully signs in with valid credentials", async () => {
    const user = userEvent.setup();
    mockResolveLoginIdentifier.mockResolvedValue({
      email: "test@example.com",
      error: null,
    });
    mockSignInWithEmail.mockResolvedValue({ error: null });

    render(<SignInView />);

    const identifierInput = screen.getByLabelText("Email or Username");
    const passwordInput = screen.getByLabelText("Password");

    await user.type(identifierInput, "testuser");
    await user.type(passwordInput, "password123");

    const submitButton = screen.getByRole("button", { name: "Sign In" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith(
        "test@example.com",
        "password123"
      );
      expect(mockRouter.push).toHaveBeenCalledWith("/");
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  it("redirects to custom path after sign-in when redirectTo is provided", async () => {
    const user = userEvent.setup();
    mockResolveLoginIdentifier.mockResolvedValue({
      email: "test@example.com",
      error: null,
    });
    mockSignInWithEmail.mockResolvedValue({ error: null });

    render(<SignInView redirectTo="/tournaments/my-tournament" />);

    const identifierInput = screen.getByLabelText("Email or Username");
    const passwordInput = screen.getByLabelText("Password");

    await user.type(identifierInput, "testuser");
    await user.type(passwordInput, "password123");

    const submitButton = screen.getByRole("button", { name: "Sign In" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        "/tournaments/my-tournament"
      );
    });
  });

  it("shows error when identifier cannot be resolved", async () => {
    const user = userEvent.setup();
    mockResolveLoginIdentifier.mockResolvedValue({
      email: null,
      error: "No account found",
    });

    render(<SignInView />);

    const identifierInput = screen.getByLabelText("Email or Username");
    const passwordInput = screen.getByLabelText("Password");

    await user.type(identifierInput, "nonexistent");
    await user.type(passwordInput, "password123");

    const submitButton = screen.getByRole("button", { name: "Sign In" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("No account found");
    });
  });

  it("shows error when sign-in fails", async () => {
    const user = userEvent.setup();
    mockResolveLoginIdentifier.mockResolvedValue({
      email: "test@example.com",
      error: null,
    });
    mockSignInWithEmail.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    render(<SignInView />);

    const identifierInput = screen.getByLabelText("Email or Username");
    const passwordInput = screen.getByLabelText("Password");

    await user.type(identifierInput, "testuser");
    await user.type(passwordInput, "wrongpassword");

    const submitButton = screen.getByRole("button", { name: "Sign In" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Invalid login credentials"
      );
    });
  });

  it("shows generic error for unexpected errors", async () => {
    const user = userEvent.setup();
    mockResolveLoginIdentifier.mockRejectedValue(new Error("Network error"));

    render(<SignInView />);

    const identifierInput = screen.getByLabelText("Email or Username");
    const passwordInput = screen.getByLabelText("Password");

    await user.type(identifierInput, "testuser");
    await user.type(passwordInput, "password123");

    const submitButton = screen.getByRole("button", { name: "Sign In" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network error");
    });
  });

  it("renders toggle link when onToggle is provided", () => {
    const mockToggle = jest.fn();
    render(<SignInView onToggle={mockToggle} />);

    expect(screen.getByText("New here?")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Account" })
    ).toBeInTheDocument();
  });

  it("does not render toggle link when onToggle is not provided", () => {
    render(<SignInView />);

    expect(screen.queryByText("New here?")).not.toBeInTheDocument();
  });

  it("calls onToggle when Create Account is clicked", async () => {
    const user = userEvent.setup();
    const mockToggle = jest.fn();
    render(<SignInView onToggle={mockToggle} />);

    const createAccountButton = screen.getByRole("button", {
      name: "Create Account",
    });
    await user.click(createAccountButton);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it("clears previous error when form is resubmitted", async () => {
    const user = userEvent.setup();
    mockResolveLoginIdentifier.mockResolvedValue({
      email: null,
      error: "No account found",
    });

    render(<SignInView />);

    const identifierInput = screen.getByLabelText("Email or Username");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: "Sign In" });

    // First submission with error
    await user.type(identifierInput, "nonexistent");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("No account found");
    });

    // Second submission should clear error first
    mockResolveLoginIdentifier.mockResolvedValue({
      email: "test@example.com",
      error: null,
    });
    mockSignInWithEmail.mockResolvedValue({ error: null });

    await user.clear(identifierInput);
    await user.clear(passwordInput);
    await user.type(identifierInput, "testuser");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
