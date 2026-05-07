/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { RecommendedDefaultsButton } from "../recommended-defaults-button";

jest.mock("@/actions/discord-integration", () => ({
  upsertChannelMappingAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: { id: 1 } }),
  updateServerSettingsAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: undefined }),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

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

  it("renders button text", () => {
    render(<RecommendedDefaultsButton {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /apply recommended defaults/i })
    ).toBeInTheDocument();
  });
});
