/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockUpdateChannelPingRoleAction = jest.fn();
jest.mock("@/actions/discord-integration", () => ({
  ...jest.requireActual<object>("@/actions/discord-integration"),
  updateChannelPingRoleAction: (...args: unknown[]) =>
    mockUpdateChannelPingRoleAction(...args),
}));

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("sonner", () => ({ toast: mockToast }));

// Mock Select to use native <select> for jsdom compatibility in parallel
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
    }) =>
      ReactForMock.createElement(
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
          ReactForMock.createElement("option", { value: "" }, "Select a role"),
          children
        )
      ),
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

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "role1" } });

    await waitFor(() => {
      expect(mockUpdateChannelPingRoleAction).toHaveBeenCalledWith({
        mappingId: 1,
        pingRoleId: "role1",
        communityId: 1,
      });
    });
    expect(mockToast.success).toHaveBeenCalledWith("Ping role updated.");
  });

  it("sends pingRoleId as null when 'None' is selected", async () => {
    mockUpdateChannelPingRoleAction.mockResolvedValue({ success: true });

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

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "none" } });

    await waitFor(() => {
      expect(mockUpdateChannelPingRoleAction).toHaveBeenCalledWith({
        mappingId: 2,
        pingRoleId: null,
        communityId: 1,
      });
    });
  });

  it("shows error toast on action failure", async () => {
    mockUpdateChannelPingRoleAction.mockResolvedValue({
      success: false,
      error: "Permission denied",
    });

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

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "role2" } });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Permission denied");
    });
  });

  it("shows fallback error message when error is undefined", async () => {
    mockUpdateChannelPingRoleAction.mockResolvedValue({
      success: false,
    });

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

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "role1" } });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to update ping role."
      );
    });
  });
});
