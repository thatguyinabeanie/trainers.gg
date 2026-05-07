/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpsertChannelMappingAction = jest.fn();
const mockUpdateServerSettingsAction = jest.fn();
jest.mock("@/actions/discord-integration", () => ({
  upsertChannelMappingAction: (...args: unknown[]) =>
    mockUpsertChannelMappingAction(...args),
  updateServerSettingsAction: (...args: unknown[]) =>
    mockUpdateServerSettingsAction(...args),
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
};
jest.mock("sonner", () => ({ toast: mockToast }));

import { RecommendedDefaultsButton } from "../recommended-defaults-button";

describe("RecommendedDefaultsButton", () => {
  const defaultProps = {
    serverId: 1,
    communityId: 1,
    guildChannels: [
      { id: "ch1", name: "general", type: 0 },
      { id: "ch2", name: "announcements", type: 0 },
    ],
    guildRoles: [{ id: "role1", name: "Admin", color: 0 }],
    onApplied: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("renders button text", () => {
    render(<RecommendedDefaultsButton {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /apply recommended defaults/i })
    ).toBeInTheDocument();
  });

  it("applies defaults successfully and calls onApplied", async () => {
    mockUpsertChannelMappingAction.mockResolvedValue({
      success: true,
      data: { id: 1 },
    });
    mockUpdateServerSettingsAction.mockResolvedValue({
      success: true,
      data: undefined,
    });

    const user = userEvent.setup();
    render(<RecommendedDefaultsButton {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /apply recommended defaults/i })
    );

    // 3 channel mappings: tournament_created, registration_opens, match_result_reported
    expect(mockUpsertChannelMappingAction).toHaveBeenCalledTimes(3);
    expect(mockUpsertChannelMappingAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "tournament_created",
        channelId: "ch2", // announcements channel
      })
    );
    expect(mockUpsertChannelMappingAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "registration_opens",
        channelId: "ch1", // general as fallback
      })
    );
    expect(mockUpsertChannelMappingAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "match_result_reported",
        channelId: "ch1",
      })
    );
    expect(mockUpdateServerSettingsAction).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: { setup_completed: true },
      })
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      "Recommended defaults applied",
      expect.objectContaining({ description: expect.any(String) })
    );
    expect(defaultProps.onApplied).toHaveBeenCalled();
  });

  it("shows error toast when first mapping fails and stops", async () => {
    mockUpsertChannelMappingAction.mockResolvedValueOnce({
      success: false,
      error: "Channel not found",
    });

    const user = userEvent.setup();
    render(<RecommendedDefaultsButton {...defaultProps} />);
    await user.click(
      screen.getByRole("button", { name: /apply recommended defaults/i })
    );

    expect(mockToast.error).toHaveBeenCalledWith("Channel not found");
    // Should stop after first failure — only 1 call
    expect(mockUpsertChannelMappingAction).toHaveBeenCalledTimes(1);
    expect(defaultProps.onApplied).not.toHaveBeenCalled();
  });

  it("shows error toast when second mapping fails", async () => {
    mockUpsertChannelMappingAction
      .mockResolvedValueOnce({ success: true, data: { id: 1 } })
      .mockResolvedValueOnce({ success: false, error: "Rate limited" });

    const user = userEvent.setup();
    render(<RecommendedDefaultsButton {...defaultProps} />);
    await user.click(
      screen.getByRole("button", { name: /apply recommended defaults/i })
    );

    expect(mockToast.error).toHaveBeenCalledWith("Rate limited");
    expect(mockUpsertChannelMappingAction).toHaveBeenCalledTimes(2);
    expect(defaultProps.onApplied).not.toHaveBeenCalled();
  });

  it("shows error toast when updateServerSettings fails", async () => {
    mockUpsertChannelMappingAction.mockResolvedValue({
      success: true,
      data: { id: 1 },
    });
    mockUpdateServerSettingsAction.mockResolvedValue({
      success: false,
      error: "Server error",
    });

    const user = userEvent.setup();
    render(<RecommendedDefaultsButton {...defaultProps} />);
    await user.click(
      screen.getByRole("button", { name: /apply recommended defaults/i })
    );

    expect(mockToast.error).toHaveBeenCalledWith("Server error");
    expect(defaultProps.onApplied).not.toHaveBeenCalled();
  });

  it("shows warning when no channels can be auto-detected", async () => {
    const user = userEvent.setup();
    render(
      <RecommendedDefaultsButton
        {...defaultProps}
        guildChannels={[{ id: "ch1", name: "random-voice", type: 2 }]}
      />
    );
    await user.click(
      screen.getByRole("button", { name: /apply recommended defaults/i })
    );

    expect(mockToast.warning).toHaveBeenCalledWith(
      "Couldn't auto-detect channels. Please configure manually."
    );
    expect(mockUpsertChannelMappingAction).not.toHaveBeenCalled();
  });

  it("filters to only text channels (type 0)", async () => {
    mockUpsertChannelMappingAction.mockResolvedValue({
      success: true,
      data: { id: 1 },
    });
    mockUpdateServerSettingsAction.mockResolvedValue({
      success: true,
      data: undefined,
    });

    const user = userEvent.setup();
    render(
      <RecommendedDefaultsButton
        {...defaultProps}
        guildChannels={[
          { id: "ch1", name: "general", type: 0 },
          { id: "ch2", name: "announcements", type: 2 }, // voice, should be ignored
        ]}
      />
    );
    await user.click(
      screen.getByRole("button", { name: /apply recommended defaults/i })
    );

    // announcements is voice type, so general is used for everything
    expect(mockUpsertChannelMappingAction).toHaveBeenCalledWith(
      expect.objectContaining({ channelId: "ch1" })
    );
  });
});
