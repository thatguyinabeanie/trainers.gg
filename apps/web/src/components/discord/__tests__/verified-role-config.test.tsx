/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { VerifiedRoleConfig } from "../verified-role-config";

jest.mock("@/actions/discord-integration", () => ({
  updateVerifiedRoleAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: undefined }),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

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

  it("toggling switch calls updateVerifiedRoleAction", async () => {
    const { updateVerifiedRoleAction } = jest.requireMock(
      "@/actions/discord-integration"
    ) as { updateVerifiedRoleAction: jest.Mock };

    render(<VerifiedRoleConfig {...defaultProps} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("switch"));

    expect(updateVerifiedRoleAction).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });
});
