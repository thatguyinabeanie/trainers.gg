/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { PingRoleConfig } from "../ping-role-config";

jest.mock("@/actions/discord-integration", () => ({
  updateChannelPingRoleAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: undefined }),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

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
    serverId: 1,
    communityId: 1,
  };

  it("renders heading", () => {
    render(<PingRoleConfig {...defaultProps} />);
    expect(screen.getByText("Role Pings")).toBeInTheDocument();
  });

  it("shows event type labels for provided mappings", () => {
    render(<PingRoleConfig {...defaultProps} />);
    expect(screen.getByText("Tournament Created")).toBeInTheDocument();
    expect(screen.getByText("Round Posted")).toBeInTheDocument();
  });
});
