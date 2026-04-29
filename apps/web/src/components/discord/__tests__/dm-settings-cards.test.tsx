/**
 * Tests for DmSettingsCards
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("../picker-refresh-button", () => ({
  PickerRefreshButton: ({ serverId }: { serverId: number }) => (
    <button data-testid={`refresh-${serverId}`} type="button">
      Refresh
    </button>
  ),
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
import { render, screen } from "@testing-library/react";

import { DmSettingsCards } from "../dm-settings-cards";
import {
  type DmSettingsInnerProps,
  type DmRowState,
} from "../dm-settings-table";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<DmRowState> = {}): DmRowState {
  return {
    eventType: "match_ready",
    mode: "channel_only",
    fallbackChannelId: null,
    ...overrides,
  };
}

const guildChannels = [
  { id: "ch-111", name: "general", type: 0 },
  { id: "ch-222", name: "tournaments", type: 0 },
] as never[];

function makeProps(
  overrides: Partial<DmSettingsInnerProps> = {}
): DmSettingsInnerProps {
  return {
    rows: [makeRow()],
    guildChannels,
    serverId: 10,
    onRowChange: jest.fn(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("DmSettingsCards", () => {
  it("renders one card per row with the event label", () => {
    render(<DmSettingsCards {...makeProps()} />);
    expect(screen.getByText("Match ready")).toBeInTheDocument();
    expect(
      screen.getByText(
        "When your match is posted and both players should start"
      )
    ).toBeInTheDocument();
  });

  it("renders all provided rows", () => {
    render(
      <DmSettingsCards
        {...makeProps({
          rows: [
            makeRow({ eventType: "match_ready" }),
            makeRow({ eventType: "match_starting_soon" }),
            makeRow({ eventType: "team_sheet_needed" }),
          ],
        })}
      />
    );
    expect(screen.getByText("Match ready")).toBeInTheDocument();
    expect(screen.getByText("Match starting soon")).toBeInTheDocument();
    expect(screen.getByText("Team sheet needed")).toBeInTheDocument();
  });

  it("shows fallback channel picker and PickerRefreshButton when mode is channel_only", () => {
    render(
      <DmSettingsCards
        {...makeProps({
          rows: [makeRow({ mode: "channel_only" })],
        })}
      />
    );
    expect(screen.getByTestId("refresh-10")).toBeInTheDocument();
  });

  it("shows fallback channel picker when mode is dm_with_fallback", () => {
    render(
      <DmSettingsCards
        {...makeProps({
          rows: [makeRow({ mode: "dm_with_fallback" })],
        })}
      />
    );
    expect(screen.getByTestId("refresh-10")).toBeInTheDocument();
  });

  it("shows em-dash placeholder when mode is dm_only", () => {
    render(
      <DmSettingsCards
        {...makeProps({
          rows: [makeRow({ mode: "dm_only" })],
        })}
      />
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByTestId("refresh-10")).not.toBeInTheDocument();
  });

  it("renders delivery mode select for each row", () => {
    render(
      <DmSettingsCards
        {...makeProps({
          rows: [
            makeRow({ eventType: "match_ready" }),
            makeRow({ eventType: "match_starting_soon" }),
          ],
        })}
      />
    );
    // Each card has a delivery mode select; comboboxes represent select elements
    const combos = screen.getAllByRole("combobox");
    // At least 2 delivery mode selects (one per row)
    expect(combos.length).toBeGreaterThanOrEqual(2);
  });

  it("renders empty list without crashing when rows is empty", () => {
    const { container } = render(<DmSettingsCards {...makeProps({ rows: [] })} />);
    expect(container.firstChild).toBeTruthy();
    expect(screen.queryByText("Match ready")).not.toBeInTheDocument();
  });
});
