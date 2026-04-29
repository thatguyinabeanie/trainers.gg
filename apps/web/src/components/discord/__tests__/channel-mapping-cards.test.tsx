/**
 * Tests for ChannelMappingCards
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
import { render, screen, fireEvent } from "@testing-library/react";

import { ChannelMappingCards } from "../channel-mapping-cards";
import { type ChannelMappingInnerProps } from "../channel-mapping-table";
import { type DiscordChannelMapping } from "@trainers/supabase";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeMapping(
  overrides: Partial<DiscordChannelMapping> = {}
): DiscordChannelMapping {
  return {
    id: 1,
    discord_server_id: 10,
    event_type: "tournament_created",
    channel_id: "ch-111",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const guildChannels = [
  { id: "ch-111", name: "general", type: 0 },
  { id: "ch-222", name: "tournaments", type: 0 },
] as never[];

function makeProps(
  overrides: Partial<ChannelMappingInnerProps> = {}
): ChannelMappingInnerProps {
  return {
    mappings: [makeMapping()],
    guildChannels,
    serverId: 10,
    unmappedEventTypes: ["registration_opens", "tournament_ended", "match_result_reported"],
    addEventType: "",
    addChannelId: "",
    addPending: false,
    onChannelChange: jest.fn(),
    onDelete: jest.fn(),
    onAddEventTypeChange: jest.fn(),
    onAddChannelIdChange: jest.fn(),
    onAdd: jest.fn(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ChannelMappingCards", () => {
  it("renders one card per mapping with the event label", () => {
    render(<ChannelMappingCards {...makeProps()} />);
    expect(screen.getByText("Tournament created")).toBeInTheDocument();
    expect(
      screen.getByText("When a draft tournament is created")
    ).toBeInTheDocument();
  });

  it("renders multiple cards when multiple mappings are provided", () => {
    render(
      <ChannelMappingCards
        {...makeProps({
          mappings: [
            makeMapping({ id: 1, event_type: "tournament_created" }),
            makeMapping({ id: 2, event_type: "registration_opens" }),
          ],
          unmappedEventTypes: ["tournament_ended", "match_result_reported"],
        })}
      />
    );
    expect(screen.getByText("Tournament created")).toBeInTheDocument();
    expect(screen.getByText("Registration opens")).toBeInTheDocument();
  });

  it("renders Remove mapping button for each mapping", () => {
    render(
      <ChannelMappingCards
        {...makeProps({
          mappings: [
            makeMapping({ id: 1, event_type: "tournament_created" }),
            makeMapping({ id: 2, event_type: "registration_opens" }),
          ],
          unmappedEventTypes: [],
        })}
      />
    );
    const removeBtns = screen.getAllByRole("button", {
      name: /remove mapping/i,
    });
    expect(removeBtns.length).toBe(2);
  });

  it("calls onDelete with the mapping id when remove is clicked", () => {
    const onDelete = jest.fn();
    render(<ChannelMappingCards {...makeProps({ onDelete })} />);
    const removeBtn = screen.getByRole("button", { name: /remove mapping/i });
    fireEvent.click(removeBtn);
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("disables remove button for optimistic rows", () => {
    const optimisticId = "optimistic-abc" as unknown as number;
    render(
      <ChannelMappingCards
        {...makeProps({
          mappings: [makeMapping({ id: optimisticId })],
        })}
      />
    );
    const removeBtn = screen.getByRole("button", { name: /remove mapping/i });
    expect(removeBtn).toBeDisabled();
  });

  it("renders the PickerRefreshButton for each mapping", () => {
    render(
      <ChannelMappingCards
        {...makeProps({
          mappings: [
            makeMapping({ id: 1, event_type: "tournament_created" }),
            makeMapping({ id: 2, event_type: "registration_opens" }),
          ],
          unmappedEventTypes: [],
        })}
      />
    );
    const refreshBtns = screen.getAllByTestId("refresh-10");
    // One per mapping card (no add form since unmappedEventTypes is empty)
    expect(refreshBtns.length).toBe(2);
  });

  it("renders the add-mapping form when unmappedEventTypes is non-empty", () => {
    render(<ChannelMappingCards {...makeProps()} />);
    expect(screen.getByText("Add mapping")).toBeInTheDocument();
  });

  it("does not render the add-mapping form when all event types are mapped", () => {
    render(
      <ChannelMappingCards {...makeProps({ unmappedEventTypes: [] })} />
    );
    expect(screen.queryByText("Add mapping")).not.toBeInTheDocument();
  });

  it("calls onAdd when the Add button is clicked", () => {
    const onAdd = jest.fn();
    render(
      <ChannelMappingCards
        {...makeProps({
          addEventType: "registration_opens",
          addChannelId: "ch-222",
          onAdd,
        })}
      />
    );
    const addBtn = screen.getByRole("button", { name: /^add$/i });
    fireEvent.click(addBtn);
    expect(onAdd).toHaveBeenCalled();
  });

  it("disables the Add button when addPending is true", () => {
    render(
      <ChannelMappingCards
        {...makeProps({
          addEventType: "registration_opens",
          addChannelId: "ch-222",
          addPending: true,
        })}
      />
    );
    const addBtn = screen.getByRole("button", { name: /^add$/i });
    expect(addBtn).toBeDisabled();
  });
});
