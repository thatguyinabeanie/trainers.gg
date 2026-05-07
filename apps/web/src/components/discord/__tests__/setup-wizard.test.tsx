/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpdateServerSettingsAction = jest.fn();
const mockUpsertChannelMappingAction = jest.fn();
const mockUpsertRoleMappingAction = jest.fn();

jest.mock("@/actions/discord-integration", () => ({
  updateServerSettingsAction: (...args: unknown[]) =>
    mockUpdateServerSettingsAction(...args),
  upsertChannelMappingAction: (...args: unknown[]) =>
    mockUpsertChannelMappingAction(...args),
  upsertRoleMappingAction: (...args: unknown[]) =>
    mockUpsertRoleMappingAction(...args),
}));

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("sonner", () => ({ toast: mockToast }));

import { SetupWizard } from "../setup-wizard";

describe("SetupWizard", () => {
  const defaultProps = {
    serverId: 1,
    communityId: 1,
    communityName: "VGC League",
    guildChannels: [
      { id: "ch1", name: "general", type: 0 },
      { id: "ch2", name: "tournaments", type: 0 },
    ],
    guildRoles: [{ id: "role1", name: "Competitor", color: 0 }],
    onComplete: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("renders step 1 heading", () => {
    render(<SetupWizard {...defaultProps} />);
    expect(
      screen.getByText("Where should Beanie Bot post?")
    ).toBeInTheDocument();
  });

  it("renders community name in card title", () => {
    render(<SetupWizard {...defaultProps} />);
    expect(
      screen.getByText(/Set up Discord for VGC League/)
    ).toBeInTheDocument();
  });

  it("shows step indicator labels", () => {
    render(<SetupWizard {...defaultProps} />);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Roles")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("navigates from step 1 to step 2 with Next button", async () => {
    const user = userEvent.setup();
    render(<SetupWizard {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("Role Sync")).toBeInTheDocument();
  });

  it("navigates back from step 2 to step 1", async () => {
    const user = userEvent.setup();
    render(<SetupWizard {...defaultProps} />);

    // Go to step 2
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Role Sync")).toBeInTheDocument();

    // Go back
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(
      screen.getByText("Where should Beanie Bot post?")
    ).toBeInTheDocument();
  });

  it("navigates to step 3 (Confirm) and shows summary", async () => {
    const user = userEvent.setup();
    render(<SetupWizard {...defaultProps} />);

    // Step 1 → 2
    await user.click(screen.getByRole("button", { name: /next/i }));
    // Step 2 → 3
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("You're all set!")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /finish setup/i })
    ).toBeInTheDocument();
  });

  it("navigates back from step 3 to step 2", async () => {
    const user = userEvent.setup();
    render(<SetupWizard {...defaultProps} />);

    // Navigate to step 3
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Go back
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText("Role Sync")).toBeInTheDocument();
  });

  it("finishes setup successfully, calls onComplete and shows toast", async () => {
    mockUpsertChannelMappingAction.mockResolvedValue({
      success: true,
      data: { id: 1 },
    });
    mockUpdateServerSettingsAction.mockResolvedValue({
      success: true,
      data: undefined,
    });

    const user = userEvent.setup();
    render(<SetupWizard {...defaultProps} />);

    // Navigate to step 3
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Click Finish Setup
    await user.click(screen.getByRole("button", { name: /finish setup/i }));

    // Channels auto-detected "tournaments" → channel mappings created
    expect(mockUpsertChannelMappingAction).toHaveBeenCalled();
    expect(mockUpdateServerSettingsAction).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: { setup_completed: true },
      })
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      "Setup complete! Your Discord integration is ready."
    );
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  it("shows error toast when channel mapping fails, does not call onComplete", async () => {
    mockUpsertChannelMappingAction.mockResolvedValue({
      success: false,
      error: "Mapping failed",
    });
    mockUpdateServerSettingsAction.mockResolvedValue({
      success: true,
      data: undefined,
    });

    const user = userEvent.setup();
    render(<SetupWizard {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /finish setup/i }));

    expect(mockToast.error).toHaveBeenCalledWith("Mapping failed");
    expect(defaultProps.onComplete).not.toHaveBeenCalled();
  });

  it("shows error toast when updateServerSettings fails", async () => {
    mockUpsertChannelMappingAction.mockResolvedValue({
      success: true,
      data: { id: 1 },
    });
    mockUpdateServerSettingsAction.mockResolvedValue({
      success: false,
      error: "Settings save failed",
    });

    const user = userEvent.setup();
    render(<SetupWizard {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /finish setup/i }));

    expect(mockToast.error).toHaveBeenCalledWith("Settings save failed");
    expect(defaultProps.onComplete).not.toHaveBeenCalled();
  });

  it("skip for now calls updateServerSettings and onComplete", async () => {
    mockUpdateServerSettingsAction.mockResolvedValue({
      success: true,
      data: undefined,
    });

    const user = userEvent.setup();
    render(<SetupWizard {...defaultProps} />);

    // Navigate to step 3 where "Skip for now" is visible
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    await user.click(screen.getByText("Skip for now"));

    expect(mockUpdateServerSettingsAction).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: { setup_completed: true },
      })
    );
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  it("skip for now shows error toast on failure", async () => {
    mockUpdateServerSettingsAction.mockResolvedValue({
      success: false,
      error: "Cannot skip",
    });

    const user = userEvent.setup();
    render(<SetupWizard {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByText("Skip for now"));

    expect(mockToast.error).toHaveBeenCalledWith("Cannot skip");
    expect(defaultProps.onComplete).not.toHaveBeenCalled();
  });

  it("shows 'No roles configured' when no roles are enabled on step 3", async () => {
    const user = userEvent.setup();
    render(<SetupWizard {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("No roles configured")).toBeInTheDocument();
  });
});
