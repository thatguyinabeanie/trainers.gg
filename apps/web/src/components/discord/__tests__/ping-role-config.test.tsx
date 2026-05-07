/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpdateChannelPingRoleAction = jest.fn();
jest.mock("@/actions/discord-integration", () => ({
  updateChannelPingRoleAction: (...args: unknown[]) =>
    mockUpdateChannelPingRoleAction(...args),
}));

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("sonner", () => ({ toast: mockToast }));

import { PingRoleConfig } from "../ping-role-config";

describe("PingRoleConfig", () => {
  const defaultProps = {
    channelMappings: [
      {
        id: 1,
        eventType: "tournament_created",
        channelId: "ch1",
        pingRoleId: null,
      },
      {
        id: 2,
        eventType: "round_posted",
        channelId: "ch2",
        pingRoleId: "role1",
      },
    ],
    guildRoles: [
      { id: "role1", name: "Competitors", color: 0 },
      { id: "role2", name: "Admins", color: 0 },
    ],
    communityId: 1,
  };

  beforeEach(() => jest.clearAllMocks());

  it("renders heading", () => {
    render(<PingRoleConfig {...defaultProps} />);
    expect(screen.getByText("Role Pings")).toBeInTheDocument();
  });

  it("shows event type labels for provided mappings", () => {
    render(<PingRoleConfig {...defaultProps} />);
    expect(screen.getByText("Tournament Created")).toBeInTheDocument();
    expect(screen.getByText("Round Posted")).toBeInTheDocument();
  });

  it("falls back to formatted event type for unknown types", () => {
    render(
      <PingRoleConfig
        {...defaultProps}
        channelMappings={[
          {
            id: 3,
            eventType: "custom_event_type",
            channelId: "ch1",
            pingRoleId: null,
          },
        ]}
      />
    );
    expect(screen.getByText("Custom Event Type")).toBeInTheDocument();
  });

  it("calls updateChannelPingRoleAction with role id on change", async () => {
    mockUpdateChannelPingRoleAction.mockResolvedValue({ success: true });

    const user = userEvent.setup({ pointerEventsCheck: false });
    render(
      <PingRoleConfig
        {...defaultProps}
        channelMappings={[
          {
            id: 1,
            eventType: "tournament_created",
            channelId: "ch1",
            pingRoleId: null,
          },
        ]}
      />
    );

    // Click the combobox to open it, select a role
    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.click(screen.getByText("Competitors"));

    expect(mockUpdateChannelPingRoleAction).toHaveBeenCalledWith({
      mappingId: 1,
      pingRoleId: "role1",
      communityId: 1,
    });
    expect(mockToast.success).toHaveBeenCalledWith("Ping role updated.");
  });

  it("sends pingRoleId as null when 'None' is selected", async () => {
    mockUpdateChannelPingRoleAction.mockResolvedValue({ success: true });

    const user = userEvent.setup({ pointerEventsCheck: false });
    render(
      <PingRoleConfig
        {...defaultProps}
        channelMappings={[
          {
            id: 2,
            eventType: "round_posted",
            channelId: "ch2",
            pingRoleId: "role1",
          },
        ]}
      />
    );

    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.click(screen.getByText("None"));

    expect(mockUpdateChannelPingRoleAction).toHaveBeenCalledWith({
      mappingId: 2,
      pingRoleId: null,
      communityId: 1,
    });
  });

  it("shows error toast on action failure", async () => {
    mockUpdateChannelPingRoleAction.mockResolvedValue({
      success: false,
      error: "Permission denied",
    });

    const user = userEvent.setup({ pointerEventsCheck: false });
    render(
      <PingRoleConfig
        {...defaultProps}
        channelMappings={[
          {
            id: 1,
            eventType: "tournament_created",
            channelId: "ch1",
            pingRoleId: null,
          },
        ]}
      />
    );

    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.click(screen.getByText("Admins"));

    expect(mockToast.error).toHaveBeenCalledWith("Permission denied");
  });

  it("shows fallback error message when error is undefined", async () => {
    mockUpdateChannelPingRoleAction.mockResolvedValue({
      success: false,
    });

    const user = userEvent.setup({ pointerEventsCheck: false });
    render(
      <PingRoleConfig
        {...defaultProps}
        channelMappings={[
          {
            id: 1,
            eventType: "tournament_created",
            channelId: "ch1",
            pingRoleId: null,
          },
        ]}
      />
    );

    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.click(screen.getByText("Competitors"));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Failed to update ping role."
    );
  });
});
