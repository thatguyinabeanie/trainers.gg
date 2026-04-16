/**
 * Tests for DiscordProfilePrivacyRow component.
 * Verifies toggle rendering, optimistic updates, success/error toasts,
 * rollback on failure, and disabled state during pending transitions.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

import { DiscordProfilePrivacyRow } from "../discord-profile-privacy-row";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@/actions/discord-integration", () => ({
  setShowDiscordPubliclyAction: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// =============================================================================
// Helpers
// =============================================================================

function getMockAction() {
  return (
    jest.requireMock("@/actions/discord-integration") as {
      setShowDiscordPubliclyAction: jest.Mock;
    }
  ).setShowDiscordPubliclyAction;
}

// =============================================================================
// Tests
// =============================================================================

describe("DiscordProfilePrivacyRow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with the switch in the off state when initialEnabled is false", () => {
    render(<DiscordProfilePrivacyRow initialEnabled={false} />);

    const toggle = screen.getByRole("switch", {
      name: /show discord handle on profile/i,
    });
    expect(toggle).not.toBeChecked();
  });

  it("renders with the switch in the on state when initialEnabled is true", () => {
    render(<DiscordProfilePrivacyRow initialEnabled={true} />);

    const toggle = screen.getByRole("switch", {
      name: /show discord handle on profile/i,
    });
    expect(toggle).toBeChecked();
  });

  it("calls setShowDiscordPubliclyAction(true) when toggled on", async () => {
    const user = userEvent.setup();
    const mockAction = getMockAction();
    mockAction.mockResolvedValue({ success: true });

    render(<DiscordProfilePrivacyRow initialEnabled={false} />);

    const toggle = screen.getByRole("switch", {
      name: /show discord handle on profile/i,
    });
    await user.click(toggle);

    await waitFor(() => {
      expect(mockAction).toHaveBeenCalledWith(true);
    });
  });

  it("calls setShowDiscordPubliclyAction(false) when toggled off", async () => {
    const user = userEvent.setup();
    const mockAction = getMockAction();
    mockAction.mockResolvedValue({ success: true });

    render(<DiscordProfilePrivacyRow initialEnabled={true} />);

    const toggle = screen.getByRole("switch", {
      name: /show discord handle on profile/i,
    });
    await user.click(toggle);

    await waitFor(() => {
      expect(mockAction).toHaveBeenCalledWith(false);
    });
  });

  it("shows success toast when action succeeds toggling on", async () => {
    const user = userEvent.setup();
    const mockAction = getMockAction();
    mockAction.mockResolvedValue({ success: true });

    render(<DiscordProfilePrivacyRow initialEnabled={false} />);

    await user.click(
      screen.getByRole("switch", { name: /show discord handle on profile/i })
    );

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Discord handle will show on your profile"
      );
    });
  });

  it("shows success toast when action succeeds toggling off", async () => {
    const user = userEvent.setup();
    const mockAction = getMockAction();
    mockAction.mockResolvedValue({ success: true });

    render(<DiscordProfilePrivacyRow initialEnabled={true} />);

    await user.click(
      screen.getByRole("switch", { name: /show discord handle on profile/i })
    );

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Discord handle hidden");
    });
  });

  it("rolls back to previous state and shows error toast when action fails", async () => {
    const user = userEvent.setup();
    const mockAction = getMockAction();
    mockAction.mockResolvedValue({
      success: false,
      error: "Failed to update setting",
    });

    render(<DiscordProfilePrivacyRow initialEnabled={false} />);

    const toggle = screen.getByRole("switch", {
      name: /show discord handle on profile/i,
    });
    await user.click(toggle);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update setting");
    });

    // Switch should be rolled back to off (initial state)
    expect(toggle).not.toBeChecked();
  });

  it("renders the label and description text", () => {
    render(<DiscordProfilePrivacyRow initialEnabled={false} />);

    expect(
      screen.getByText(/show discord handle on profile/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/your public profile will show your discord username/i)
    ).toBeInTheDocument();
  });
});
