import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ResetPasswordForm } from "../reset-password-form";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

// Mock dependencies
jest.mock("@/hooks/use-auth");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe("ResetPasswordForm", () => {
  let mockUpdatePassword: jest.Mock;
  let mockRouter: Partial<AppRouterInstance>;

  beforeEach(() => {
    mockUpdatePassword = jest.fn();
    mockRouter = {
      push: jest.fn(),
      refresh: jest.fn(),
    } as Partial<AppRouterInstance>;

    mockUseAuth.mockReturnValue({
      updatePassword: mockUpdatePassword,
    });
    mockUseRouter.mockReturnValue(mockRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders reset password form correctly", () => {
    render(<ResetPasswordForm />);

    expect(screen.getByText("Reset Password")).toBeInTheDocument();
    expect(
      screen.getByText("Enter your new password below.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update Password" })
    ).toBeInTheDocument();

    // Check password requirements are listed
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    expect(
      screen.getByText("At least one uppercase letter")
    ).toBeInTheDocument();
    expect(
      screen.getByText("At least one lowercase letter")
    ).toBeInTheDocument();
    expect(screen.getByText("At least one number")).toBeInTheDocument();
    expect(screen.getByText(/At least one symbol/)).toBeInTheDocument();
  });

  it("shows validation error for empty password", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    const submitButton = screen.getByRole("button", {
      name: "Update Password",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Password must be at least 8 characters/)
      ).toBeInTheDocument();
    });
  });

  it("shows validation error for empty confirm password", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText("New Password");
    await user.type(passwordInput, "ValidPass123!");

    const submitButton = screen.getByRole("button", {
      name: "Update Password",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Please confirm your password")
      ).toBeInTheDocument();
    });
  });

  it("shows validation error for weak password", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText("New Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password");

    await user.type(passwordInput, "weak");
    await user.type(confirmPasswordInput, "weak");

    const submitButton = screen.getByRole("button", {
      name: "Update Password",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Password must be at least 8 characters/)
      ).toBeInTheDocument();
    });
  });

  it("shows validation error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText("New Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password");

    await user.type(passwordInput, "ValidPass123!");
    await user.type(confirmPasswordInput, "DifferentPass123!");

    const submitButton = screen.getByRole("button", {
      name: "Update Password",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("accepts valid strong password", async () => {
    const user = userEvent.setup();
    mockUpdatePassword.mockResolvedValue({ error: null });

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText("New Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password");

    await user.type(passwordInput, "ValidPass123!");
    await user.type(confirmPasswordInput, "ValidPass123!");

    const submitButton = screen.getByRole("button", {
      name: "Update Password",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith("ValidPass123!");
    });
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();
    mockUpdatePassword.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 100)
        )
    );

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText("New Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password");

    await user.type(passwordInput, "ValidPass123!");
    await user.type(confirmPasswordInput, "ValidPass123!");

    const submitButton = screen.getByRole("button", {
      name: "Update Password",
    });
    await user.click(submitButton);

    expect(screen.getByRole("button", { name: "Updating..." })).toBeDisabled();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Update Password" })
      ).not.toBeDisabled();
    });
  });

  it("successfully updates password and redirects to home", async () => {
    const user = userEvent.setup();
    mockUpdatePassword.mockResolvedValue({ error: null });

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText("New Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password");

    await user.type(passwordInput, "NewSecurePass123!");
    await user.type(confirmPasswordInput, "NewSecurePass123!");

    const submitButton = screen.getByRole("button", {
      name: "Update Password",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith("NewSecurePass123!");
      expect(mockRouter.push).toHaveBeenCalledWith("/");
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  it("shows error message when password update fails", async () => {
    const user = userEvent.setup();
    mockUpdatePassword.mockResolvedValue({
      error: { message: "Failed to update password" },
    });

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText("New Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password");

    await user.type(passwordInput, "ValidPass123!");
    await user.type(confirmPasswordInput, "ValidPass123!");

    const submitButton = screen.getByRole("button", {
      name: "Update Password",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to update password")).toBeInTheDocument();
    });

    // Should not navigate away
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("shows generic error for unexpected errors", async () => {
    const user = userEvent.setup();
    mockUpdatePassword.mockRejectedValue(new Error("Network error"));

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText("New Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password");

    await user.type(passwordInput, "ValidPass123!");
    await user.type(confirmPasswordInput, "ValidPass123!");

    const submitButton = screen.getByRole("button", {
      name: "Update Password",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("clears previous error when form is resubmitted", async () => {
    const user = userEvent.setup();
    mockUpdatePassword.mockResolvedValue({
      error: { message: "Failed to update password" },
    });

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText("New Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
    const submitButton = screen.getByRole("button", {
      name: "Update Password",
    });

    // First submission with error
    await user.type(passwordInput, "ValidPass123!");
    await user.type(confirmPasswordInput, "ValidPass123!");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to update password")).toBeInTheDocument();
    });

    // Second submission should clear error first
    mockUpdatePassword.mockResolvedValue({ error: null });

    await user.clear(passwordInput);
    await user.clear(confirmPasswordInput);
    await user.type(passwordInput, "NewPass456!");
    await user.type(confirmPasswordInput, "NewPass456!");
    await user.click(submitButton);

    // Error should be cleared before redirect
    await waitFor(() => {
      expect(
        screen.queryByText("Failed to update password")
      ).not.toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalled();
    });
  });

  it("has correct input attributes for accessibility", () => {
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText("New Password");
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("autoComplete", "new-password");
    expect(passwordInput).toHaveAttribute("placeholder", "Enter new password");

    const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute(
      "autoComplete",
      "new-password"
    );
    expect(confirmPasswordInput).toHaveAttribute(
      "placeholder",
      "Confirm new password"
    );
  });

  it("prevents multiple submissions while loading", async () => {
    const user = userEvent.setup();
    mockUpdatePassword.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 200)
        )
    );

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText("New Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password");

    await user.type(passwordInput, "ValidPass123!");
    await user.type(confirmPasswordInput, "ValidPass123!");

    const submitButton = screen.getByRole("button", {
      name: "Update Password",
    });

    // Click multiple times rapidly
    await user.click(submitButton);
    await user.click(submitButton);
    await user.click(submitButton);

    // Should only call updatePassword once
    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledTimes(1);
    });
  });

  it("validates password meets all requirements", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText("New Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
    const submitButton = screen.getByRole("button", {
      name: "Update Password",
    });

    // Missing uppercase
    await user.type(passwordInput, "lowercase123!");
    await user.type(confirmPasswordInput, "lowercase123!");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Password must contain at least one uppercase letter")
      ).toBeInTheDocument();
    });

    await user.clear(passwordInput);
    await user.clear(confirmPasswordInput);

    // Missing lowercase
    await user.type(passwordInput, "UPPERCASE123!");
    await user.type(confirmPasswordInput, "UPPERCASE123!");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Password must contain at least one lowercase letter")
      ).toBeInTheDocument();
    });

    await user.clear(passwordInput);
    await user.clear(confirmPasswordInput);

    // Missing number
    await user.type(passwordInput, "NoNumbers!");
    await user.type(confirmPasswordInput, "NoNumbers!");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Password must contain at least one number")
      ).toBeInTheDocument();
    });

    await user.clear(passwordInput);
    await user.clear(confirmPasswordInput);

    // Missing symbol
    await user.type(passwordInput, "NoSymbols123");
    await user.type(confirmPasswordInput, "NoSymbols123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Password must contain at least one.*symbol/i)
      ).toBeInTheDocument();
    });
  });
});
