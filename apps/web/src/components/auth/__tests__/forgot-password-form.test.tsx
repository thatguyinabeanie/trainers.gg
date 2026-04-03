import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ForgotPasswordForm } from "../forgot-password-form";

const mockResetPassword = jest.fn();

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ resetPassword: mockResetPassword }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import React from "react";

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the form heading and email field", () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByText("Forgot Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders the Send Reset Link button", () => {
    render(<ForgotPasswordForm />);
    expect(
      screen.getByRole("button", { name: "Send Reset Link" })
    ).toBeInTheDocument();
  });

  it("renders a link back to sign in", () => {
    render(<ForgotPasswordForm />);
    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link).toHaveAttribute("href", "/sign-in");
  });

  it("shows validation error when email is empty on submit", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });
  });

  it("does not call resetPassword with invalid email", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    // Type an invalid email and submit — zod rejects it
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    // resetPassword should not have been called
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it("calls resetPassword with the submitted email", async () => {
    mockResetPassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith("ash@example.com");
    });
  });

  it("shows success state after reset email is sent", async () => {
    mockResetPassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      expect(screen.getByText("Check Your Email")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("shows error message when resetPassword fails", async () => {
    mockResetPassword.mockResolvedValue({
      error: { message: "Rate limit exceeded" },
    });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
    });
    expect(screen.queryByText("Check Your Email")).not.toBeInTheDocument();
  });

  it("shows 'Sending...' while submitting", async () => {
    mockResetPassword.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
  });

  it("shows unexpected error when resetPassword throws", async () => {
    mockResetPassword.mockRejectedValue(new Error("Unexpected failure"));
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      expect(screen.getByText("Unexpected failure")).toBeInTheDocument();
    });
  });

  it("shows 'Back to sign in' link in success state", async () => {
    mockResetPassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      const backLink = screen.getByRole("link", { name: "Back to sign in" });
      expect(backLink).toHaveAttribute("href", "/sign-in");
    });
  });
});
