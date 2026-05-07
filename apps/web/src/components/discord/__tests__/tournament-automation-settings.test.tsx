/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpsertChannelMappingAction = jest.fn();
const mockDeleteChannelMappingAction = jest.fn();
const mockUpsertDmSettingAction = jest.fn();
const mockDeleteDmSettingAction = jest.fn();
const mockUpdateServerSettingsAction = jest.fn();

jest.mock("@/actions/discord-integration", () => ({
  ...jest.requireActual<object>("@/actions/discord-integration"),
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

// Mock Select to use native <select> for jsdom compatibility
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactForMock = require("react");
jest.mock("@/components/ui/select", () => {
  return {
    Select: ({
      children,
      value,
      onValueChange,
      disabled,
    }: {
      children: React.ReactNode;
      value: string;
      onValueChange: (v: string) => void;
      disabled?: boolean;
    }) => {
      // Collect SelectItem children from nested SelectContent
      return ReactForMock.createElement(
        "div",
        { "data-testid": "mock-select" },
        ReactForMock.createElement(
          "select",
          {
            value: value || "",
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
              onValueChange(e.target.value),
            disabled,
          },
          ReactForMock.createElement("option", { value: "" }, "Select channel"),
          children
        )
      );
    },
    SelectTrigger: ({ children }: { children: React.ReactNode }) => children,
    SelectContent: ({ children }: { children: React.ReactNode }) => children,
    SelectItem: ({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: string;
    }) => ReactForMock.createElement("option", { value }, children),
    SelectValue: ({ placeholder }: { placeholder?: string }) =>
      ReactForMock.createElement("span", null, placeholder),
  };
});

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
    // With mocked Select, a native <select> is rendered
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

  it("toggles round posted ON", async () => {
    const user = userEvent.setup({ pointerEventsCheck: false });
    render(<TournamentAutomationSettings {...defaultProps} />);

    const switches = screen.getAllByRole("switch");
    await user.click(switches[0]!);

    await waitFor(() => {
      expect(switches[0]!).toBeChecked();
    });
  });

  it("toggles standings ON", async () => {
    const user = userEvent.setup({ pointerEventsCheck: false });
    render(<TournamentAutomationSettings {...defaultProps} />);

    const switches = screen.getAllByRole("switch");
    await user.click(switches[1]!);

    await waitFor(() => {
      expect(switches[1]!).toBeChecked();
    });
  });

  it("channel select for round posted calls handleChannelMapping", async () => {
    mockUpsertChannelMappingAction.mockResolvedValue({
      success: true,
      data: { mappingId: 55 },
    });

    render(
      <TournamentAutomationSettings
        {...defaultProps}
        settings={{
          ...defaultProps.settings,
          roundPostedChannel: "ch1",
        }}
      />
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "ch2" } });

    await waitFor(() => {
      expect(mockUpsertChannelMappingAction).toHaveBeenCalledWith({
        communityId: 1,
        channelId: "ch2",
        eventType: "round_posted",
      });
    });
  });

  it("channel select deletes old mapping before upsert", async () => {
    mockDeleteChannelMappingAction.mockResolvedValue({ success: true });
    mockUpsertChannelMappingAction.mockResolvedValue({
      success: true,
      data: { mappingId: 55 },
    });

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

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "ch2" } });

    await waitFor(() => {
      expect(mockDeleteChannelMappingAction).toHaveBeenCalledWith(42);
      expect(mockUpsertChannelMappingAction).toHaveBeenCalledWith({
        communityId: 1,
        channelId: "ch2",
        eventType: "round_posted",
      });
    });
  });

  it("channel select rollback on upsert failure", async () => {
    mockDeleteChannelMappingAction.mockResolvedValue({ success: true });
    mockUpsertChannelMappingAction.mockResolvedValueOnce({
      success: false,
      error: "API error",
    }).mockResolvedValueOnce({
      success: true,
      data: { mappingId: 42 },
    });

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

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "ch2" } });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("API error");
    });

    // Rollback upsert should have been called with old channel
    await waitFor(() => {
      expect(mockUpsertChannelMappingAction).toHaveBeenCalledWith({
        communityId: 1,
        channelId: "ch1",
        eventType: "round_posted",
      });
    });
  });

  it("registration reminder toggle OFF deletes mapping and clears minutes", async () => {
    mockDeleteChannelMappingAction.mockResolvedValue({ success: true });
    mockUpdateServerSettingsAction.mockResolvedValue({ success: true });

    const user = userEvent.setup({ pointerEventsCheck: false });
    render(
      <TournamentAutomationSettings
        {...defaultProps}
        settings={{
          ...defaultProps.settings,
          registrationReminderChannel: "ch1",
          registrationReminderMappingId: 77,
          registrationReminderMinutes: 30,
        }}
      />
    );

    // Third switch is Registration Closing Reminder — toggling OFF
    const switches = screen.getAllByRole("switch");
    await user.click(switches[2]!);

    await waitFor(() => {
      expect(mockDeleteChannelMappingAction).toHaveBeenCalledWith(77);
      expect(mockUpdateServerSettingsAction).toHaveBeenCalledWith({
        serverId: 1,
        communityId: 1,
        settings: { registration_reminder_minutes: null },
      });
    });
  });

  it("registration reminder toggle OFF rollback on delete failure", async () => {
    mockDeleteChannelMappingAction.mockResolvedValue({
      success: false,
      error: "fail",
    });

    const user = userEvent.setup({ pointerEventsCheck: false });
    render(
      <TournamentAutomationSettings
        {...defaultProps}
        settings={{
          ...defaultProps.settings,
          registrationReminderChannel: "ch1",
          registrationReminderMappingId: 77,
          registrationReminderMinutes: 30,
        }}
      />
    );

    const switches = screen.getAllByRole("switch");
    await user.click(switches[2]!);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("fail");
      // Switch should be rolled back to enabled
      expect(switches[2]!).toBeChecked();
    });
  });

  it("check-in reminder rollback on delete failure", async () => {
    mockDeleteDmSettingAction.mockResolvedValue({
      success: false,
      error: "delete failed",
    });

    const user = userEvent.setup({ pointerEventsCheck: false });
    render(
      <TournamentAutomationSettings
        {...defaultProps}
        settings={{
          ...defaultProps.settings,
          checkInReminderEnabled: true,
        }}
      />
    );

    const switches = screen.getAllByRole("switch");
    await user.click(switches[3]!);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("delete failed");
      // Rollback: switch should remain checked
      expect(switches[3]!).toBeChecked();
    });
  });

  it("registration reminder minutes onBlur persists value", async () => {
    mockUpdateServerSettingsAction.mockResolvedValue({ success: true });

    const user = userEvent.setup({ pointerEventsCheck: false });
    render(
      <TournamentAutomationSettings
        {...defaultProps}
        settings={{
          ...defaultProps.settings,
          registrationReminderChannel: "ch1",
          registrationReminderMappingId: 77,
          registrationReminderMinutes: 30,
        }}
      />
    );

    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "45");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockUpdateServerSettingsAction).toHaveBeenCalledWith({
        serverId: 1,
        communityId: 1,
        settings: { registration_reminder_minutes: 45 },
      });
    });
  });
});
