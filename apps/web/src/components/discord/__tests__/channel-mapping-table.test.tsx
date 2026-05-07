/**
 * Tests for ChannelMappingTable
 */

const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

const mockUseIsClient = jest.fn();
jest.mock("@/hooks/use-is-client", () => ({
  useIsClient: () => mockUseIsClient(),
}));

jest.mock("../channel-mapping-cards", () => ({
  ChannelMappingCards: (props: { mappings?: { id: number | string }[] }) => (
    <div
      data-testid="channel-mapping-cards"
      data-row-count={props.mappings?.length ?? 0}
    />
  ),
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUpsertChannelMappingAction = jest.fn();
const mockDeleteChannelMappingAction = jest.fn();

jest.mock("@/actions/discord-integration", () => ({
  upsertChannelMappingAction: (...args: unknown[]) =>
    mockUpsertChannelMappingAction(...args),
  deleteChannelMappingAction: (...args: unknown[]) =>
    mockDeleteChannelMappingAction(...args),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("../picker-refresh-button", () => ({
  PickerRefreshButton: ({ serverId }: { serverId: number }) => (
    <button data-testid={`refresh-${serverId}`} type="button">
      Refresh
    </button>
  ),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import React from "react";
import { toast } from "sonner";
import { ChannelMappingTable } from "../channel-mapping-table";
import type { DiscordChannelMapping } from "@trainers/supabase";

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

const defaultProps = {
  channelMappings: [makeMapping()],
  guildChannels,
  serverId: 10,
  communityId: 42,
};

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseIsClient.mockReturnValue(true);
  mockUseIsMobile.mockReturnValue(false);
  mockUpsertChannelMappingAction.mockResolvedValue({
    success: true,
    data: { id: 1 },
  });
  mockDeleteChannelMappingAction.mockResolvedValue({
    success: true,
    data: undefined,
  });
});

describe("ChannelMappingTable", () => {
  describe("rendering", () => {
    it("renders existing mappings with event label and channel picker", () => {
      render(<ChannelMappingTable {...defaultProps} />);

      expect(screen.getByText("Tournament created")).toBeInTheDocument();
      expect(
        screen.getByText("When a draft tournament is created")
      ).toBeInTheDocument();
    });

    it("shows empty state when no mappings exist", () => {
      render(<ChannelMappingTable {...defaultProps} channelMappings={[]} />);

      expect(
        screen.getByText(/Add your first channel mapping/i)
      ).toBeInTheDocument();
    });

    it("renders the add-mapping form for unmapped event types", () => {
      render(<ChannelMappingTable {...defaultProps} />);

      // One mapping exists (tournament_created), the other 3 should appear in the add dropdown
      expect(screen.getByText("Add mapping")).toBeInTheDocument();
    });

    it("hides the add form when all event types are mapped", () => {
      const allMappings: DiscordChannelMapping[] = [
        makeMapping({ id: 1, event_type: "tournament_created" }),
        makeMapping({ id: 2, event_type: "registration_opens" }),
        makeMapping({ id: 3, event_type: "tournament_ended" }),
        makeMapping({ id: 4, event_type: "match_result_reported" }),
        makeMapping({ id: 5, event_type: "registration_closing_soon" }),
        makeMapping({ id: 6, event_type: "round_posted" }),
        makeMapping({ id: 7, event_type: "standings_posted" }),
        makeMapping({ id: 8, event_type: "check_in_opened" }),
      ];
      render(
        <ChannelMappingTable {...defaultProps} channelMappings={allMappings} />
      );

      expect(screen.queryByText("Add mapping")).not.toBeInTheDocument();
    });
  });

  describe("delete interaction", () => {
    it("calls deleteChannelMappingAction with the mapping id", async () => {
      const user = userEvent.setup();
      render(<ChannelMappingTable {...defaultProps} />);

      const deleteBtn = screen.getByRole("button", { name: /remove mapping/i });
      await user.click(deleteBtn);

      expect(mockDeleteChannelMappingAction).toHaveBeenCalledWith(1);
    });

    it("removes the row optimistically on delete", async () => {
      const user = userEvent.setup();
      render(<ChannelMappingTable {...defaultProps} />);

      expect(screen.getByText("Tournament created")).toBeInTheDocument();

      const deleteBtn = screen.getByRole("button", { name: /remove mapping/i });
      await user.click(deleteBtn);

      await waitFor(() => {
        expect(
          screen.queryByText("Tournament created")
        ).not.toBeInTheDocument();
      });
    });

    it("rolls back the optimistic remove on action failure", async () => {
      mockDeleteChannelMappingAction.mockResolvedValueOnce({
        success: false,
        error: "Not permitted",
      });
      const user = userEvent.setup();
      render(<ChannelMappingTable {...defaultProps} />);

      const deleteBtn = screen.getByRole("button", { name: /remove mapping/i });
      await user.click(deleteBtn);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Not permitted");
      });
      // Row restored
      expect(screen.getByText("Tournament created")).toBeInTheDocument();
    });
  });

  describe("add mapping interaction", () => {
    it("disables the Add button until both event type and channel are selected", () => {
      render(<ChannelMappingTable {...defaultProps} />);

      const addBtn = screen.getByRole("button", { name: /^add$/i });
      expect(addBtn).toBeDisabled();
    });
  });

  describe("conditional mount", () => {
    it("renders skeleton when isClient is false", () => {
      mockUseIsClient.mockReturnValue(false);
      mockUseIsMobile.mockReturnValue(false);
      render(<ChannelMappingTable {...defaultProps} />);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("channel-mapping-cards")
      ).not.toBeInTheDocument();
    });

    it("renders desktop table when isClient is true and isMobile is false", () => {
      mockUseIsClient.mockReturnValue(true);
      mockUseIsMobile.mockReturnValue(false);
      render(<ChannelMappingTable {...defaultProps} />);
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(
        screen.queryByTestId("channel-mapping-cards")
      ).not.toBeInTheDocument();
    });

    it("renders mobile cards when isClient is true and isMobile is true", () => {
      mockUseIsClient.mockReturnValue(true);
      mockUseIsMobile.mockReturnValue(true);
      render(<ChannelMappingTable {...defaultProps} />);
      expect(screen.getByTestId("channel-mapping-cards")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });
});
