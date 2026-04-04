import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResetPasswordForm } from "../reset-password-form";

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockUpdatePassword = jest.fn();
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ updatePassword: mockUpdatePassword }),
}));

jest.mock("@/components/ui/password-input", () => ({
  PasswordInput: ({
    id,
    ...rest
  }: { id?: string } & Record<string, unknown>) => (
    <input id={id} type="password" {...rest} />
  ),
}));

import React from "react";

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the form heading", () => {
    render(<ResetPasswordForm />);
    expect(screen.getByText("Reset Password")).toBeInTheDocument();
  });

  it("renders New Password and Confirm New Password fields", () => {
    render(<ResetPasswordForm />);
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
  });

  it("renders Update Password button", () => {
    render(<ResetPasswordForm />);
    expect(
      screen.getByRole("button", { name: "Update Password" })
    ).toBeInTheDocument();
  });

  it("calls updatePassword with the submitted password on success", async () => {
    mockUpdatePassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("New Password"), "NewPass1!");
    await user.type(screen.getByLabelText("Confirm New Password"), "NewPass1!");
    await user.click(screen.getByRole("button", { name: "Update Password" }));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith("NewPass1!");
    });
  });

  it("redirects to '/' after successful password update", async () => {
    mockUpdatePassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("New Password"), "NewPass1!");
    await user.type(screen.getByLabelText("Confirm New Password"), "NewPass1!");
    await user.click(screen.getByRole("button", { name: "Update Password" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("shows error when updatePassword fails", async () => {
    mockUpdatePassword.mockResolvedValue({
      error: { message: "Auth session missing" },
    });
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("New Password"), "NewPass1!");
    await user.type(screen.getByLabelText("Confirm New Password"), "NewPass1!");
    await user.click(screen.getByRole("button", { name: "Update Password" }));

    await waitFor(() => {
      expect(screen.getByText("Auth session missing")).toBeInTheDocument();
    });
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("New Password"), "NewPass1!");
    await user.type(
      screen.getByLabelText("Confirm New Password"),
      "DifferentPass1!"
    );
    await user.click(screen.getByRole("button", { name: "Update Password" }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it("shows 'Updating...' while the update is in progress", async () => {
    mockUpdatePassword.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("New Password"), "NewPass1!");
    await user.type(screen.getByLabelText("Confirm New Password"), "NewPass1!");
    await user.click(screen.getByRole("button", { name: "Update Password" }));

    expect(screen.getByRole("button", { name: "Updating..." })).toBeDisabled();
  });

  it("shows unexpected error when updatePassword throws", async () => {
    mockUpdatePassword.mockRejectedValue(new Error("Unexpected error"));
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("New Password"), "NewPass1!");
    await user.type(screen.getByLabelText("Confirm New Password"), "NewPass1!");
    await user.click(screen.getByRole("button", { name: "Update Password" }));

    await waitFor(() => {
      expect(screen.getByText("Unexpected error")).toBeInTheDocument();
    });
  });

  it("shows password requirements hint text", () => {
    render(<ResetPasswordForm />);
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    expect(
      screen.getByText("At least one uppercase letter")
    ).toBeInTheDocument();
  });
});
