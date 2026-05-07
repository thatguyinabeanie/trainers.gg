/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSendTestNotificationAction = jest.fn();
jest.mock("@/actions/discord-integration", () => ({
  sendTestNotificationAction: (...args: unknown[]) =>
    mockSendTestNotificationAction(...args),
}));

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("sonner", () => ({ toast: mockToast }));

import { TestNotificationButton } from "../test-notification-button";

describe("TestNotificationButton", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the button with 'Test' text", () => {
    render(
      <TestNotificationButton
        serverId={1}
        channelId="ch-1"
        eventType="tournament_created"
      />
    );
    expect(screen.getByRole("button", { name: /test/i })).toBeInTheDocument();
  });

  it("calls action and shows success toast on click", async () => {
    mockSendTestNotificationAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(
      <TestNotificationButton
        serverId={1}
        channelId="ch-1"
        eventType="tournament_created"
      />
    );
    await user.click(screen.getByRole("button", { name: /test/i }));

    expect(mockSendTestNotificationAction).toHaveBeenCalledWith({
      serverId: 1,
      channelId: "ch-1",
      eventType: "tournament_created",
    });
    expect(mockToast.success).toHaveBeenCalledWith("Test notification sent!");
  });

  it("shows error toast when action returns failure", async () => {
    mockSendTestNotificationAction.mockResolvedValue({ success: false, error: "Failed to send test notification" });
    const user = userEvent.setup();

    render(
      <TestNotificationButton
        serverId={1}
        channelId="ch-1"
        eventType="tournament_created"
      />
    );
    await user.click(screen.getByRole("button", { name: /test/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Failed to send test notification"
    );
  });
});
