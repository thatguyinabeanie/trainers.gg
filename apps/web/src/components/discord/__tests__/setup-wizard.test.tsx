/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { SetupWizard } from "../setup-wizard";

jest.mock("@/actions/discord-integration", () => ({
  updateServerSettingsAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: undefined }),
  upsertChannelMappingAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: { id: 1 } }),
  upsertRoleMappingAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: { mappingId: 1 } }),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

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
});
