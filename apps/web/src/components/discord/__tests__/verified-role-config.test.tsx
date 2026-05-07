/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpdateVerifiedRoleAction = jest.fn();
jest.mock("@/actions/discord-integration", () => ({
  updateVerifiedRoleAction: (...args: unknown[]) =>
    mockUpdateVerifiedRoleAction(...args),
}));

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("sonner", () => ({ toast: mockToast }));

import { VerifiedRoleConfig } from "../verified-role-config";

describe("VerifiedRoleConfig", () => {
  const defaultProps = {
    currentRoleId: null,
    guildRoles: [
      { id: "role1", name: "Verified", color: 0 },
      { id: "role2", name: "Member", color: 0 },
    ],
    serverId: 1,
    communityId: 1,
    enabled: false,
  };

  beforeEach(() => jest.clearAllMocks());

  it("renders heading", () => {
    render(<VerifiedRoleConfig {...defaultProps} />);
    expect(screen.getByText("Account Verification")).toBeInTheDocument();
  });

  it("renders Switch", () => {
    render(<VerifiedRoleConfig {...defaultProps} />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("does not show Select when disabled", () => {
    render(<VerifiedRoleConfig {...defaultProps} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows Select when enabled", () => {
    render(<VerifiedRoleConfig {...defaultProps} enabled={true} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("toggling switch ON with no role selected shows Select without calling action", async () => {
    render(<VerifiedRoleConfig {...defaultProps} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("switch"));

    // Should NOT call the server action when roleId is null
    expect(mockUpdateVerifiedRoleAction).not.toHaveBeenCalled();
    // But should show the Select (enabled locally)
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("toggling switch ON with a pre-selected role calls action", async () => {
    mockUpdateVerifiedRoleAction.mockResolvedValue({ success: true });

    render(
      <VerifiedRoleConfig {...defaultProps} currentRoleId="role1" />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("switch"));

    expect(mockUpdateVerifiedRoleAction).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true, roleId: "role1" })
    );
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Verified role enabled.");
    });
  });

  it("toggling switch OFF calls action with enabled: false", async () => {
    mockUpdateVerifiedRoleAction.mockResolvedValue({ success: true });

    render(<VerifiedRoleConfig {...defaultProps} enabled={true} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("switch"));

    expect(mockUpdateVerifiedRoleAction).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Verified role disabled.");
    });
  });

  it("rolls back toggle on error", async () => {
    mockUpdateVerifiedRoleAction.mockResolvedValue({
      success: false,
      error: "Server error",
    });

    render(
      <VerifiedRoleConfig {...defaultProps} currentRoleId="role1" />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("switch"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Server error");
    });
    // Switch should be rolled back to unchecked
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("changing role calls action and shows success toast", async () => {
    mockUpdateVerifiedRoleAction.mockResolvedValue({ success: true });

    render(
      <VerifiedRoleConfig {...defaultProps} enabled={true} currentRoleId={null} />
    );
    const user = userEvent.setup({ pointerEventsCheck: false });

    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.click(screen.getByText("Verified"));

    expect(mockUpdateVerifiedRoleAction).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: "role1" })
    );
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Verified role updated.");
    });
  });

  it("shows error toast when role change fails", async () => {
    mockUpdateVerifiedRoleAction.mockResolvedValue({
      success: false,
      error: "Role update failed",
    });

    render(
      <VerifiedRoleConfig
        {...defaultProps}
        enabled={true}
        currentRoleId={null}
      />
    );
    const user = userEvent.setup({ pointerEventsCheck: false });

    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.click(screen.getByText("Member"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Role update failed");
    });
  });

  it("selecting 'None' disables the role and sends enabled: false", async () => {
    mockUpdateVerifiedRoleAction.mockResolvedValue({ success: true });

    render(
      <VerifiedRoleConfig
        {...defaultProps}
        enabled={true}
        currentRoleId="role1"
      />
    );
    const user = userEvent.setup({ pointerEventsCheck: false });

    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.click(screen.getByText("None"));

    expect(mockUpdateVerifiedRoleAction).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: null, enabled: false })
    );
  });
});
