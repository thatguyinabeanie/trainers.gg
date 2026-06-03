/**
 * Tests for the redesigned ExpandedRowData component.
 * Covers: unified standings table with inline sprites, row-level expansion,
 * skeleton loading states, error display, and Load more button.
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUseSupabaseQuery = jest.fn();

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: (...args: unknown[]) => mockUseSupabaseQuery(...args),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, ...rest }: { alt: string } & Record<string, unknown>) => (
    <img alt={alt} {...rest} />
  ),
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn(() => ({ url: "/test.png", pixelated: false })),
}));

import { ExpandedRowData } from "../expanded-row-data";
import { type UnifiedRow } from "../external-data-shared";

// ── Test Fixtures ──────────────────────────────────────────────────────────

const rk9Row: UnifiedRow = {
  id: "rk9-test-event-1",
  source: "rk9",
  name: "Test Regional",
  category: "regional",
  date: "2025-01-15",
  playerCount: 100,
  status: "complete",
  statusDetail: "complete",
  error: null,
  platform: null,
  isOnline: null,
  hasData: true,
  country: "US",
  rk9: {
    event_id: "test-event-1",
    name: "Test Regional",
    tier: "regional",
    format_id: "fmt-vgc25",
    date_start: "2025-01-15",
    date_end: "2025-01-16",
    location_city: "Columbus",
    location_country: "US",
    player_count: 100,
    has_team_lists: true,
    import_status: "complete",
    import_error: null,
  },
};

const limitlessRow: UnifiedRow = {
  id: "limitless-test-tourney-1",
  source: "limitless",
  name: "Test Limitless Tournament",
  category: "VGC25",
  date: "2025-02-10",
  playerCount: 50,
  status: "complete",
  statusDetail: "completed",
  error: null,
  platform: "SWITCH",
  isOnline: false,
  hasData: true,
  country: null,
  limitless: {
    tournament_id: "test-tourney-1",
    name: "Test Limitless Tournament",
    format_id: "fmt-vgc25",
    date: "2025-02-10",
    player_count: 50,
    platform: "SWITCH",
    is_online: false,
    decklists: true,
    data_imported_at: "2025-02-11T00:00:00Z",
    import_status: "completed",
    import_requested_at: null,
    import_error: null,
    import_attempts: 1,
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRk9Standings(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    placement: i + 1,
    division: "masters",
    drop_round: null,
    players: {
      first_name: "Player",
      last_name: `${i + 1}`,
      country: "US",
      trainer_name: `Trainer${i + 1}`,
    },
    team_pokemon: [
      {
        position: 1,
        species: "pikachu",
        ability: "Static",
        held_item: "Light Ball",
        tera_type: "Electric",
        moves: [],
      },
    ],
  }));
}

function makeLimitlessStandings(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    placement: i + 1,
    record_wins: 5 + i,
    record_losses: 2,
    record_ties: 0,
    players: {
      username: `user${i + 1}`,
      display_name: `DisplayUser${i + 1}`,
      country: "JP",
    },
    team_pokemon: [
      {
        position: 1,
        species: "charizard",
        ability: "Blaze",
        held_item: "Choice Scarf",
        tera_type: "Fire",
        moves: [],
      },
    ],
  }));
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockUseSupabaseQuery.mockReturnValue({
    data: [],
    error: null,
    isLoading: false,
    isFetching: false,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ExpandedRowData", () => {
  describe("standings table — RK9", () => {
    it("renders table headers: #, Player, Team, Division", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: makeRk9Standings(2),
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /player/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /team/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /division/i })).toBeInTheDocument();
    });

    it("renders player names (trainer_name)", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: makeRk9Standings(3),
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      expect(screen.getByText("Trainer1")).toBeInTheDocument();
      expect(screen.getByText("Trainer2")).toBeInTheDocument();
      expect(screen.getByText("Trainer3")).toBeInTheDocument();
    });

    it("falls back to first + last name when trainer_name is null", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: [
          {
            placement: 1,
            division: "masters",
            drop_round: null,
            players: {
              first_name: "John",
              last_name: "Smith",
              country: "US",
              trainer_name: null,
            },
            team_pokemon: [],
          },
        ],
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      expect(screen.getByText("John Smith")).toBeInTheDocument();
    });

    it("capitalizes division (masters → Masters)", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: makeRk9Standings(1),
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      expect(screen.getByText("Masters")).toBeInTheDocument();
    });

    it("renders inline sprites for team_pokemon", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: makeRk9Standings(1),
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      // Each row has 1 pokemon → 1 sprite image in the inline team cell
      const sprites = screen.getAllByAltText("pikachu");
      expect(sprites.length).toBeGreaterThanOrEqual(1);
    });

    it("shows — when team_pokemon is empty", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: [
          {
            placement: 1,
            division: "masters",
            drop_round: null,
            players: {
              first_name: "Ash",
              last_name: "K",
              country: "US",
              trainer_name: "AshK",
            },
            team_pokemon: [],
          },
        ],
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  describe("standings table — Limitless", () => {
    it("renders table headers: #, Player, Team, Record (not Division)", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: makeLimitlessStandings(2),
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={limitlessRow} />);

      expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /player/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /team/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /record/i })).toBeInTheDocument();
      expect(screen.queryByRole("columnheader", { name: /division/i })).not.toBeInTheDocument();
    });

    it("renders player display names", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: makeLimitlessStandings(2),
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={limitlessRow} />);

      expect(screen.getByText("DisplayUser1")).toBeInTheDocument();
      expect(screen.getByText("DisplayUser2")).toBeInTheDocument();
    });

    it("renders record in W-L-T format", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: makeLimitlessStandings(2),
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={limitlessRow} />);

      expect(screen.getByText("5-2-0")).toBeInTheDocument();
      expect(screen.getByText("6-2-0")).toBeInTheDocument();
    });
  });

  describe("row expansion", () => {
    it("chevron click expands a row showing team details", async () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: makeRk9Standings(2),
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      // Initially no expanded detail visible
      expect(screen.queryByText("Static")).not.toBeInTheDocument();

      // Click the first chevron to expand
      const toggleButtons = screen.getAllByRole("button", { name: /toggle team details/i });
      await act(async () => {
        fireEvent.click(toggleButtons[0]);
      });

      // Expanded row shows species, ability
      await waitFor(() => {
        // pikachu appears in both inline sprite alt and expanded detail
        expect(screen.getByText("Static")).toBeInTheDocument();
      });
    });

    it("clicking chevron again collapses the expanded row", async () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: makeRk9Standings(1),
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      const toggleBtn = screen.getByRole("button", { name: /toggle team details/i });

      // Expand
      await act(async () => {
        fireEvent.click(toggleBtn);
      });
      await waitFor(() => {
        expect(screen.getByText("Static")).toBeInTheDocument();
      });

      // Collapse
      await act(async () => {
        fireEvent.click(toggleBtn);
      });
      await waitFor(() => {
        expect(screen.queryByText("Static")).not.toBeInTheDocument();
      });
    });

    it("shows 'No team data' in expansion when team_pokemon is empty", async () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: [
          {
            placement: 1,
            division: "masters",
            drop_round: null,
            players: {
              first_name: "Ash",
              last_name: "K",
              country: "US",
              trainer_name: "AshK",
            },
            team_pokemon: [],
          },
        ],
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      const toggleBtn = screen.getByRole("button", { name: /toggle team details/i });
      await act(async () => {
        fireEvent.click(toggleBtn);
      });

      await waitFor(() => {
        expect(screen.getByText("No team data")).toBeInTheDocument();
      });
    });

    it("shows tera type in expanded detail when present", async () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: makeRk9Standings(1),
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      const toggleBtn = screen.getByRole("button", { name: /toggle team details/i });
      await act(async () => {
        fireEvent.click(toggleBtn);
      });

      await waitFor(() => {
        expect(screen.getByText("Tera: Electric")).toBeInTheDocument();
      });
    });
  });

  describe("loading state", () => {
    it("shows 5 skeleton rows while loading", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: undefined,
        error: null,
        isLoading: true,
        isFetching: true,
      });

      const { container } = render(<ExpandedRowData row={rk9Row} />);

      const skeletons = container.querySelectorAll("[data-slot='skeleton']");
      expect(skeletons).toHaveLength(5);
    });
  });

  describe("error state", () => {
    it("shows error message when standings query fails", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: undefined,
        error: { message: "Failed to fetch standings" },
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      expect(screen.getByText("Failed to fetch standings")).toBeInTheDocument();
    });

    it("shows error for Limitless row too", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: undefined,
        error: { message: "Limitless query failed" },
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={limitlessRow} />);

      expect(screen.getByText("Limitless query failed")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows 'No data available.' when data is empty", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: [],
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      expect(screen.getByText("No data available.")).toBeInTheDocument();
    });
  });

  describe("load more", () => {
    it("shows Load more button when data.length equals standingsLimit (50)", () => {
      const standings = Array.from({ length: 50 }, (_, i) => ({
        placement: i + 1,
        division: "masters",
        drop_round: null,
        players: {
          first_name: "Player",
          last_name: `${i + 1}`,
          country: "US",
          trainer_name: `T${i + 1}`,
        },
        team_pokemon: [],
      }));

      mockUseSupabaseQuery.mockReturnValue({
        data: standings,
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      expect(screen.getByText("Load more…")).toBeInTheDocument();
    });

    it("does NOT show Load more button when data.length is less than standingsLimit", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: makeRk9Standings(3),
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      expect(screen.queryByText("Load more…")).not.toBeInTheDocument();
    });

    it("clicking Load more refires the query with an increased limit", async () => {
      const standings = Array.from({ length: 50 }, (_, i) => ({
        placement: i + 1,
        division: "masters",
        drop_round: null,
        players: {
          first_name: "P",
          last_name: `${i}`,
          country: "US",
          trainer_name: `T${i}`,
        },
        team_pokemon: [],
      }));

      mockUseSupabaseQuery.mockReturnValue({
        data: standings,
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      const loadMoreBtn = screen.getByText("Load more…");
      await act(async () => {
        fireEvent.click(loadMoreBtn);
      });

      // After click, standingsLimit increments by 50 → 100.
      // useSupabaseQuery is called with deps [row.id, standingsLimit] — verify
      // the latest call includes the updated limit (100) in the deps array.
      await waitFor(() => {
        const allCalls = mockUseSupabaseQuery.mock.calls;
        const latestDeps = allCalls[allCalls.length - 1][1] as unknown[];
        expect(latestDeps).toContain(100);
      });
    });
  });
});
