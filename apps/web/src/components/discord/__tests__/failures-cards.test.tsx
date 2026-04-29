/**
 * Tests for FailuresCards
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@trainers/utils", () => ({
  formatTimeAgo: (s: string) => `${s}-ago`,
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) =>
    args
      .filter((a) => typeof a === "string")
      .join(" ")
      .trim(),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { FailuresCards } from "../failures-cards";
import { type FailuresInnerProps, type UnifiedFailureRow } from "../failures-table";
import {
  type ChannelFailureRow,
  type DmFailureRow,
} from "@trainers/supabase";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeChannelRow(
  overrides: Partial<ChannelFailureRow> = {}
): UnifiedFailureRow {
  return {
    kind: "channel",
    data: {
      id: 1,
      channel_id: "ch-999",
      event_type: "tournament_created",
      consecutive_failures: 3,
      last_error_code: null,
      last_error_reason: "Missing permissions",
      last_attempt_at: "2026-01-01T10:00:00Z",
      mapping_id: null,
      ...overrides,
    } as ChannelFailureRow,
  };
}

function makeDmRow(overrides: Partial<DmFailureRow> = {}): UnifiedFailureRow {
  return {
    kind: "dm",
    data: {
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
    } as DmFailureRow,
  };
}

function makeProps(
  overrides: Partial<FailuresInnerProps> = {}
): FailuresInnerProps {
  return {
    visibleRows: [makeChannelRow(), makeDmRow()],
    retryingId: null,
    onRetry: jest.fn(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("FailuresCards", () => {
  it("renders a card for each row", () => {
    render(<FailuresCards {...makeProps()} />);
    expect(screen.getByText("CHANNEL")).toBeInTheDocument();
    expect(screen.getByText("DM")).toBeInTheDocument();
  });

  it("renders the event type label for channel failures", () => {
    render(<FailuresCards {...makeProps({ visibleRows: [makeChannelRow()] })} />);
    expect(screen.getByText("Tournament Created")).toBeInTheDocument();
  });

  it("renders the channel target for channel failures", () => {
    render(<FailuresCards {...makeProps({ visibleRows: [makeChannelRow()] })} />);
    expect(screen.getByText("#ch-999")).toBeInTheDocument();
  });

  it("renders the error reason for channel failures", () => {
    render(<FailuresCards {...makeProps({ visibleRows: [makeChannelRow()] })} />);
    expect(screen.getByText("Missing permissions")).toBeInTheDocument();
  });

  it("renders the relative timestamp for channel failures using formatTimeAgo", () => {
    render(<FailuresCards {...makeProps({ visibleRows: [makeChannelRow()] })} />);
    expect(
      screen.getByText("2026-01-01T10:00:00Z-ago")
    ).toBeInTheDocument();
  });

  it("renders the DM target with @ prefix", () => {
    render(<FailuresCards {...makeProps({ visibleRows: [makeDmRow()] })} />);
    expect(screen.getByText("@discord-123")).toBeInTheDocument();
  });

  it("renders a Retry button for non-fallback DM rows", () => {
    render(<FailuresCards {...makeProps({ visibleRows: [makeDmRow()] })} />);
    expect(
      screen.getByRole("button", { name: /^retry$/i })
    ).toBeInTheDocument();
  });

  it("renders 'No action' for DM rows delivered via fallback", () => {
    render(
      <FailuresCards
        {...makeProps({
          visibleRows: [makeDmRow({ delivered_via_fallback: true as const })],
        })}
      />
    );
    expect(screen.getByText("No action")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^retry$/i })
    ).not.toBeInTheDocument();
  });

  it("shows fallback delivery note for DM rows delivered via fallback", () => {
    render(
      <FailuresCards
        {...makeProps({
          visibleRows: [makeDmRow({ delivered_via_fallback: true as const })],
        })}
      />
    );
    expect(
      screen.getByText("✓ Delivered via fallback channel")
    ).toBeInTheDocument();
  });

  it("calls onRetry with the row when Retry is clicked", () => {
    const onRetry = jest.fn();
    const row = makeChannelRow();
    render(<FailuresCards {...makeProps({ visibleRows: [row], onRetry })} />);
    const retryBtn = screen.getByRole("button", { name: /^retry$/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledWith(row);
  });

  it("shows 'Retrying…' and disables the button when retryingId matches", () => {
    const row = makeChannelRow();
    render(
      <FailuresCards
        {...makeProps({
          visibleRows: [row],
          retryingId: "channel-1",
        })}
      />
    );
    const retryBtn = screen.getByRole("button", { name: /retrying/i });
    expect(retryBtn).toBeDisabled();
    expect(retryBtn.textContent).toBe("Retrying…");
  });

  it("renders em-dash when channel row has no last_attempt_at", () => {
    render(
      <FailuresCards
        {...makeProps({
          visibleRows: [makeChannelRow({ last_attempt_at: null })],
        })}
      />
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
