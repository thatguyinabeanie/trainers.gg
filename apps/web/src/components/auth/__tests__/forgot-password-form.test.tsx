import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ForgotPasswordForm } from "../forgot-password-form";
import { useAuth } from "@/hooks/use-auth";

// Mock dependencies
jest.mock("@/hooks/use-auth");

const mockUseAuth = useAuth as jest.Mock;

describe("ForgotPasswordForm", () => {
  let mockResetPassword: jest.Mock;

  beforeEach(() => {
    mockResetPassword = jest.fn();
    mockUseAuth.mockReturnValue({
      resetPassword: mockResetPassword,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders forgot password form correctly", () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByText("Forgot Password")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Enter your email address and we'll send you a link to reset your password."
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send Reset Link" })
    ).toBeInTheDocument();
    expect(screen.getByText("Remember your password?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in"
    );
  });

  it("shows validation error for empty email", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    const submitButton = screen.getByRole("button", {
      name: "Send Reset Link",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid email format", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "notanemail");

    const submitButton = screen.getByRole("button", {
      name: "Send Reset Link",
    });
    await user.click(submitButton);

    await waitFor(
      () => {
        // Check for validation error message with role="alert"
        const errorMessage = screen.getByRole("alert");
        expect(errorMessage).toHaveTextContent(
          "Please enter a valid email address"
        );
      },
      { timeout: 3000 }
    );
  });

  it("accepts valid email format", async () => {
    const user = userEvent.setup();
    mockResetPassword.mockResolvedValue({ error: null });

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", {
      name: "Send Reset Link",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();
    mockResetPassword.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 100)
        )
    );

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", {
      name: "Send Reset Link",
    });
    await user.click(submitButton);

    expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Sending..." })
      ).not.toBeInTheDocument();
    });
  });

  it("successfully sends reset link and shows success message", async () => {
    const user = userEvent.setup();
    mockResetPassword.mockResolvedValue({ error: null });

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", {
      name: "Send Reset Link",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Check Your Email")).toBeInTheDocument();
      expect(
        screen.getByText(
          "If an account exists with that email address, we've sent you a link to reset your password."
        )
      ).toBeInTheDocument();
    });

    // Form should be replaced with success message
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send Reset Link" })
    ).not.toBeInTheDocument();

    // Success message should have link back to sign in
    expect(
      screen.getByRole("link", { name: "Back to sign in" })
    ).toHaveAttribute("href", "/sign-in");
  });

  it("shows error message when reset password fails", async () => {
    const user = userEvent.setup();
    mockResetPassword.mockResolvedValue({
      error: { message: "Failed to send reset email" },
    });

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", {
      name: "Send Reset Link",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to send reset email")
      ).toBeInTheDocument();
    });

    // Form should still be visible
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("shows generic error for unexpected errors", async () => {
    const user = userEvent.setup();
    mockResetPassword.mockRejectedValue(new Error("Network error"));

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", {
      name: "Send Reset Link",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("clears previous error when form is resubmitted", async () => {
    const user = userEvent.setup();
    mockResetPassword.mockResolvedValue({
      error: { message: "Failed to send reset email" },
    });

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText("Email");
    const submitButton = screen.getByRole("button", {
      name: "Send Reset Link",
    });

    // First submission with error
    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to send reset email")
      ).toBeInTheDocument();
    });

    // Second submission should clear error first
    mockResetPassword.mockResolvedValue({ error: null });

    await user.clear(emailInput);
    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    // Error should be cleared before showing success
    await waitFor(() => {
      expect(
        screen.queryByText("Failed to send reset email")
      ).not.toBeInTheDocument();
    });
  });

  it("has correct input attributes for accessibility", () => {
    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText("Email");
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("autoComplete", "email");
    expect(emailInput).toHaveAttribute("placeholder", "you@example.com");
  });

  it("prevents multiple submissions while loading", async () => {
    const user = userEvent.setup();
    mockResetPassword.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 200)
        )
    );

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", {
      name: "Send Reset Link",
    });

    // Click multiple times rapidly
    await user.click(submitButton);
    await user.click(submitButton);
    await user.click(submitButton);

    // Should only call resetPassword once
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledTimes(1);
    });
  });
});
