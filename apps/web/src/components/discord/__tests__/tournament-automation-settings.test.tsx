/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { TournamentAutomationSettings } from "../tournament-automation-settings";

jest.mock("@/actions/discord-integration", () => ({
  upsertChannelMappingAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: { id: 1 } }),
  upsertDmSettingAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: undefined }),
  updateServerSettingsAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: undefined }),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

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
      standingsChannel: null,
      registrationReminderChannel: null,
      registrationReminderMinutes: null,
      checkInReminderEnabled: false,
    },
  };

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

  it("shows channel select when round posted is enabled", async () => {
    render(
      <TournamentAutomationSettings
        {...defaultProps}
        settings={{ ...defaultProps.settings, roundPostedChannel: "ch1" }}
      />
    );
    // When roundPostedChannel is set, select should be visible
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
