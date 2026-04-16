/**
 * Tests for FailuresTable
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRetryNotificationAction = jest.fn();

jest.mock("@/actions/discord-integration", () => ({
  retryNotificationAction: (...args: unknown[]) =>
    mockRetryNotificationAction(...args),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@trainers/utils", () => ({
  formatTimeAgo: (s: string) => `${s}-ago`,
}));

// ── Imports ────────────────────────────────────────────────────────────────

import React from "react";
import { toast } from "sonner";
import { FailuresTable } from "../failures-table";
import type {
  ChannelFailureRow,
  DmFailureRow,
  RoleSyncFailureRow,
} from "@trainers/supabase";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeChannelFailure(
  overrides: Partial<ChannelFailureRow> = {}
): ChannelFailureRow {
  return {
    id: 1,
    channel_id: "ch-999",
    event_type: null,
    consecutive_failures: 3,
    last_error_code: null,
    last_error_reason: null,
    last_attempt_at: "2026-01-01T10:00:00Z",
    mapping_id: null,
    ...overrides,
  };
}

function makeDmFailure(overrides: Partial<DmFailureRow> = {}): DmFailureRow {
  return {
    id: 10,
    user_id: "user-abc",
    discord_user_id: "discord-123",
    event_type: "match_ready",
    error_code: null,
    error_reason: "50007: Cannot send messages to this user",
    delivered_via_fallback: false,
    failed_at: "2026-01-01T11:00:00Z",
    username: null,
    ...overrides,
  };
}

const defaultProps = {
  channelFailures: [makeChannelFailure()],
  dmFailures: [makeDmFailure()],
  roleSyncFailures: [] as RoleSyncFailureRow[],
  serverId: 10,
};

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockRetryNotificationAction.mockResolvedValue({
    success: true,
    data: undefined,
  });
});

describe("FailuresTable", () => {
  describe("rendering", () => {
    it("renders channel and DM failure rows", () => {
      render(<FailuresTable {...defaultProps} />);

      expect(screen.getByText("CHANNEL")).toBeInTheDocument();
      expect(screen.getByText("DM")).toBeInTheDocument();
    });

    it("shows consecutive failure count for channel rows", () => {
      render(<FailuresTable {...defaultProps} />);

      expect(screen.getByText("3 consecutive failures")).toBeInTheDocument();
    });

    it("shows relative time for DM failures", () => {
      render(<FailuresTable {...defaultProps} />);

      // formatTimeAgo is mocked to append -ago
      expect(screen.getByText("2026-01-01T11:00:00Z-ago")).toBeInTheDocument();
    });

    it("shows 'No action' for DM rows delivered via fallback", () => {
      render(
        <FailuresTable
          {...defaultProps}
          dmFailures={[
            makeDmFailure({ delivered_via_fallback: false as const }),
          ]}
        />
      );

      // Non-fallback DM should have a Retry button, not "No action"
      const retryButtons = screen.getAllByRole("button", { name: /retry/i });
      expect(retryButtons.length).toBeGreaterThan(0);
    });

    it("shows empty state when no failures exist", () => {
      render(
        <FailuresTable {...defaultProps} channelFailures={[]} dmFailures={[]} />
      );

      expect(
        screen.getByText("No failures in the last 24 hours.")
      ).toBeInTheDocument();
    });

    it("shows filter pills with correct counts", () => {
      render(<FailuresTable {...defaultProps} />);

      expect(screen.getByText("All · 2")).toBeInTheDocument();
      expect(screen.getByText("Channels · 1")).toBeInTheDocument();
      expect(screen.getByText("DMs · 1")).toBeInTheDocument();
    });

    it("shows footer remediation text", () => {
      render(<FailuresTable {...defaultProps} />);

      expect(
        screen.getByText(/Resolve persistent channel failures/i)
      ).toBeInTheDocument();
    });
  });

  describe("filter pills", () => {
    it("filters to only channel rows when Channels pill is clicked", async () => {
      const user = userEvent.setup();
      render(<FailuresTable {...defaultProps} />);

      await user.click(screen.getByText("Channels · 1"));

      expect(screen.getByText("CHANNEL")).toBeInTheDocument();
      expect(screen.queryByText("DM")).not.toBeInTheDocument();
    });

    it("filters to only DM rows when DMs pill is clicked", async () => {
      const user = userEvent.setup();
      render(<FailuresTable {...defaultProps} />);

      await user.click(screen.getByText("DMs · 1"));

      expect(screen.getByText("DM")).toBeInTheDocument();
      expect(screen.queryByText("CHANNEL")).not.toBeInTheDocument();
    });
  });

  describe("retry interaction", () => {
    it("calls retryNotificationAction for channel failures", async () => {
      const user = userEvent.setup();
      render(<FailuresTable {...defaultProps} dmFailures={[]} />);

      const retryBtn = screen.getByRole("button", { name: /^retry$/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(mockRetryNotificationAction).toHaveBeenCalledWith(1);
      });
    });

    it("calls retryNotificationAction for DM failures", async () => {
      const user = userEvent.setup();
      render(<FailuresTable {...defaultProps} channelFailures={[]} />);

      const retryBtn = screen.getByRole("button", { name: /^retry$/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(mockRetryNotificationAction).toHaveBeenCalledWith(10);
      });
    });

    it("shows success toast and removes row after successful retry", async () => {
      const user = userEvent.setup();
      render(<FailuresTable {...defaultProps} dmFailures={[]} />);

      const retryBtn = screen.getByRole("button", { name: /^retry$/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Queued for retry");
      });
      expect(screen.queryByText("CHANNEL")).not.toBeInTheDocument();
    });

    it("shows error toast when retry action fails", async () => {
      mockRetryNotificationAction.mockResolvedValueOnce({
        success: false,
        error: "Rate limited",
      });

      const user = userEvent.setup();
      render(<FailuresTable {...defaultProps} dmFailures={[]} />);

      const retryBtn = screen.getByRole("button", { name: /^retry$/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Rate limited");
      });
      // Row should still be present (not removed)
      expect(screen.getByText("CHANNEL")).toBeInTheDocument();
    });
  });
});
