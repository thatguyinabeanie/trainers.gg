/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpsertChannelMappingAction = jest.fn();
const mockDeleteChannelMappingAction = jest.fn();
const mockUpsertDmSettingAction = jest.fn();
const mockDeleteDmSettingAction = jest.fn();
const mockUpdateServerSettingsAction = jest.fn();

jest.mock("@/actions/discord-integration", () => ({
  upsertChannelMappingAction: (...args: unknown[]) =>
    mockUpsertChannelMappingAction(...args),
  deleteChannelMappingAction: (...args: unknown[]) =>
    mockDeleteChannelMappingAction(...args),
  upsertDmSettingAction: (...args: unknown[]) =>
    mockUpsertDmSettingAction(...args),
  deleteDmSettingAction: (...args: unknown[]) =>
    mockDeleteDmSettingAction(...args),
  updateServerSettingsAction: (...args: unknown[]) =>
    mockUpdateServerSettingsAction(...args),
}));

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("sonner", () => ({ toast: mockToast }));

import { TournamentAutomationSettings } from "../tournament-automation-settings";

describe("TournamentAutomationSettings", () => {
  const defaultProps = {
    serverId: 1,
    communityId: 1,
    guildChannels: [
      { id: "ch1", name: "general", type: 0 },
      { id: "ch2", name: "tournament-updates", type: 0 },
      { id: "ch3", name: "voice-chat", type: 2 },
    ],
    settings: {
      roundPostedChannel: null,
      roundPostedMappingId: null,
      standingsChannel: null,
      standingsMappingId: null,
      registrationReminderChannel: null,
      registrationReminderMappingId: null,
      registrationReminderMinutes: null,
      checkInReminderEnabled: false,
    },
  };

  beforeEach(() => jest.clearAllMocks());

  it("renders heading", () => {
    render(<TournamentAutomationSettings {...defaultProps} />);
    expect(screen.getByText("Tournament Automation")).toBeInTheDocument();
  });

  it("renders all automation labels", () => {
    render(<TournamentAutomationSettings {...defaultProps} />);
    expect(screen.getByText("Round Posted Announcements")).toBeInTheDocument();
    expect(screen.getByText("Standings Auto-Post")).toBeInTheDocument();
    expect(
      screen.getByText("Registration Closing Reminder")
    ).toBeInTheDocument();
    expect(screen.getByText("Check-in Reminder DMs")).toBeInTheDocument();
  });

  it("renders switches for each automation", () => {
    render(<TournamentAutomationSettings {...defaultProps} />);
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(4);
  });

  it("shows channel select when round posted is enabled", () => {
    render(
      <TournamentAutomationSettings
        {...defaultProps}
        settings={{ ...defaultProps.settings, roundPostedChannel: "ch1" }}
      />
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("toggles round posted OFF and deletes mapping", async () => {
    mockDeleteChannelMappingAction.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(
      <TournamentAutomationSettings
        {...defaultProps}
        settings={{
          ...defaultProps.settings,
          roundPostedChannel: "ch1",
          roundPostedMappingId: 42,
        }}
      />
    );

    // First switch is Round Posted Announcements
    const switches = screen.getAllByRole("switch");
    await user.click(switches[0]!);

    expect(mockDeleteChannelMappingAction).toHaveBeenCalledWith(42);
  });

  it("toggles round posted OFF without mappingId does not call delete", async () => {
    const user = userEvent.setup();
    render(
      <TournamentAutomationSettings
        {...defaultProps}
        settings={{
          ...defaultProps.settings,
          roundPostedChannel: "ch1",
          roundPostedMappingId: null,
        }}
      />
    );

    const switches = screen.getAllByRole("switch");
    await user.click(switches[0]!);

    expect(mockDeleteChannelMappingAction).not.toHaveBeenCalled();
  });

  it("toggles standings OFF and deletes mapping", async () => {
    mockDeleteChannelMappingAction.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(
      <TournamentAutomationSettings
        {...defaultProps}
        settings={{
          ...defaultProps.settings,
          standingsChannel: "ch2",
          standingsMappingId: 99,
        }}
      />
    );

    // Second switch is Standings Auto-Post
    const switches = screen.getAllByRole("switch");
    await user.click(switches[1]!);

    expect(mockDeleteChannelMappingAction).toHaveBeenCalledWith(99);
  });

  it("shows error toast when delete mapping fails", async () => {
    mockDeleteChannelMappingAction.mockResolvedValue({
      success: false,
      error: "Permission denied",
    });

    const user = userEvent.setup();
    render(
      <TournamentAutomationSettings
        {...defaultProps}
        settings={{
          ...defaultProps.settings,
          roundPostedChannel: "ch1",
          roundPostedMappingId: 42,
        }}
      />
    );

    const switches = screen.getAllByRole("switch");
    await user.click(switches[0]!);

    expect(mockToast.error).toHaveBeenCalledWith("Permission denied");
  });

  it("check-in reminder toggle OFF calls deleteDmSettingAction", async () => {
    mockDeleteDmSettingAction.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(
      <TournamentAutomationSettings
        {...defaultProps}
        settings={{
          ...defaultProps.settings,
          checkInReminderEnabled: true,
        }}
      />
    );

    // Fourth switch is Check-in Reminder DMs — toggling OFF
    const switches = screen.getAllByRole("switch");
    await user.click(switches[3]!);

    expect(mockDeleteDmSettingAction).toHaveBeenCalledWith({
      communityId: 1,
      eventType: "check_in_reminder",
    });
  });

  it("check-in reminder toggle ON calls upsertDmSettingAction", async () => {
    mockUpsertDmSettingAction.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<TournamentAutomationSettings {...defaultProps} />);

    // Fourth switch is Check-in Reminder DMs — toggling ON
    const switches = screen.getAllByRole("switch");
    await user.click(switches[3]!);

    expect(mockUpsertDmSettingAction).toHaveBeenCalledWith({
      communityId: 1,
      eventType: "check_in_reminder",
      deliveryMode: "dm_only",
    });
    expect(mockToast.success).toHaveBeenCalledWith("DM reminders enabled");
  });

  it("shows error toast when DM setting fails", async () => {
    mockUpsertDmSettingAction.mockResolvedValue({
      success: false,
      error: "Server error",
    });

    const user = userEvent.setup();
    render(<TournamentAutomationSettings {...defaultProps} />);

    const switches = screen.getAllByRole("switch");
    await user.click(switches[3]!);

    expect(mockToast.error).toHaveBeenCalledWith("Server error");
  });
});
