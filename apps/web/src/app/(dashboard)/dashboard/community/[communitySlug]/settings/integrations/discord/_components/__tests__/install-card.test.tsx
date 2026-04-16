/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// =============================================================================
// Mocks
// =============================================================================

const mockGetDiscordInstallUrlAction = jest.fn();
jest.mock("@/actions/discord-integration", () => ({
  getDiscordInstallUrlAction: (...args: unknown[]) =>
    mockGetDiscordInstallUrlAction(...args),
}));

// Mock window.location so tests can assert on href assignments
Object.defineProperty(window, "location", {
  writable: true,
  value: { href: "" },
});

// =============================================================================
// Subject
// =============================================================================

import { InstallCard } from "../install-card";

// =============================================================================
// Tests
// =============================================================================

describe("InstallCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = "";
    mockGetDiscordInstallUrlAction.mockResolvedValue({ success: false });
  });

  it("renders the heading", () => {
    render(<InstallCard communityId={1} />);
    expect(screen.getByText("Add Beanie Bot to your Discord")).toBeDefined();
  });

  it("renders the description paragraph", () => {
    render(<InstallCard communityId={1} />);
    expect(
      screen.getByText(/Install the bot in a Discord server you manage/)
    ).toBeDefined();
  });

  it("renders the install button", () => {
    render(<InstallCard communityId={1} />);
    expect(
      screen.getByRole("button", { name: /Add Beanie Bot/i })
    ).toBeDefined();
  });

  it("renders the fine-print requirements note", () => {
    render(<InstallCard communityId={1} />);
    expect(
      screen.getByText(
        /Requires a Discord server where you have Manage Server permission/
      )
    ).toBeDefined();
  });

  it("renders 3 feature cards with correct titles", () => {
    render(<InstallCard communityId={1} />);
    expect(screen.getByText("Channel announcements")).toBeDefined();
    expect(screen.getByText("Player DMs")).toBeDefined();
    expect(screen.getByText("Role sync")).toBeDefined();
  });

  it("renders 13 slash command chips", () => {
    render(<InstallCard communityId={1} />);
    const commands = [
      "/tournament",
      "/standings",
      "/pairings",
      "/events",
      "/player",
      "/team",
      "/leaderboard",
      "/drop",
      "/link",
      "/setchannel",
      "/unsetchannel",
      "/channels",
      "/help",
    ];
    for (const cmd of commands) {
      expect(screen.getByText(cmd)).toBeDefined();
    }
    // Confirm it's exactly 13
    const allCodeEls = document.querySelectorAll("code");
    expect(allCodeEls).toHaveLength(13);
  });

  it("calls getDiscordInstallUrlAction with communityId on button click and navigates on success", async () => {
    const installUrl =
      "https://discord.com/api/oauth2/authorize?client_id=123&scope=bot+applications.commands&permissions=274878024704&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fdiscord%2Finstall-callback&state=signed-token";

    mockGetDiscordInstallUrlAction.mockResolvedValue({
      success: true,
      data: { url: installUrl },
    });

    render(<InstallCard communityId={42} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Beanie Bot/i }));

    await waitFor(() => {
      expect(mockGetDiscordInstallUrlAction).toHaveBeenCalledWith(42);
      expect(window.location.href).toBe(installUrl);
    });
  });

  it("does not navigate when getDiscordInstallUrlAction returns failure", async () => {
    mockGetDiscordInstallUrlAction.mockResolvedValue({
      success: false,
      error: "Not authenticated",
    });

    render(<InstallCard communityId={7} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Beanie Bot/i }));

    await waitFor(() => {
      expect(mockGetDiscordInstallUrlAction).toHaveBeenCalledWith(7);
    });

    expect(window.location.href).toBe("");
  });
});
