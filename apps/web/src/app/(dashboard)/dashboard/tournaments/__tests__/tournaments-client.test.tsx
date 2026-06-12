/**
 * Tests for dashboard/tournaments/tournaments-client.tsx
 *
 * The component fetches tournament history via `useApiQuery` against
 * `/api/v1/me/tournament-history`. No direct Supabase client or realtime
 * subscription is used.
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

// --- @trainers/supabase/react-query ---
const mockUseApiQuery = jest.fn();
jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
}));

// --- @/hooks/use-mobile ---
const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

// --- @/hooks/use-is-client ---
const mockUseIsClient = jest.fn();
jest.mock("@/hooks/use-is-client", () => ({
  useIsClient: () => mockUseIsClient(),
}));

// --- ./tournaments-cards ---
jest.mock("../tournaments-cards", () => ({
  TournamentsCards: (props: { entries: { id: number }[] }) => (
    <div data-testid="tournaments-cards">
      {props.entries.map((e) => (
        <div key={e.id} data-testid={`mobile-card-${e.id}`} />
      ))}
    </div>
  ),
}));

// --- @trainers/pokemon/sprites ---
jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn(() => ({ url: "/sprite.png", pixelated: true })),
}));

// --- next/image ---
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

// --- next/link ---
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

// --- Select (shadcn) ---
jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="select" data-value={value}>
      {children}
      <button
        data-testid="select-change-trigger"
        onClick={() => onValueChange?.("all")}
      />
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Trophy: () => <svg data-testid="icon-trophy" />,
  ChevronDown: () => <svg data-testid="icon-chevron-down" />,
  ChevronRight: () => <svg data-testid="icon-chevron-right" />,
  Loader2: () => <svg data-testid="icon-loader" />,
  X: () => <svg data-testid="icon-x" />,
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TournamentsClient } from "../tournaments-client";

// =============================================================================
// Helpers
// =============================================================================

type TournamentEntry = {
  id: number;
  tournamentName: string;
  tournamentSlug: string;
  altId: number;
  altUsername: string;
  format: string | null;
  startDate: string | null;
  wins: number;
  losses: number;
  placement: number | null;
  teamPokemon: string[];
  endDate: string | null;
};

function makeEntry(overrides: Partial<TournamentEntry> = {}): TournamentEntry {
  return {
    id: 1,
    tournamentName: "Kanto Regional",
    tournamentSlug: "kanto-regional",
    altId: 10,
    altUsername: "ash_alt",
    format: "vgc-2024",
    startDate: "2026-03-15",
    wins: 5,
    losses: 2,
    placement: 3,
    teamPokemon: [],
    endDate: "2026-03-16",
    ...overrides,
  };
}

/** Default idle result — no data, not loading, no error. */
const idleResult = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
};

function setupQuery(
  data: TournamentEntry[] | undefined,
  isLoading = false,
  error: Error | null = null
) {
  mockUseApiQuery.mockReturnValue({
    data,
    isLoading,
    isError: error !== null,
    error,
  });
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockUseIsClient.mockReturnValue(true);
  mockUseIsMobile.mockReturnValue(false);
  mockUseApiQuery.mockReturnValue(idleResult);
});

// =============================================================================
// Loading
// =============================================================================

it("renders loading spinner while data is loading", () => {
  setupQuery(undefined, true);
  render(<TournamentsClient selectedAltUsername={null} />);
  expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
});

// =============================================================================
// Error state
// =============================================================================

it("renders error state when query errors", () => {
  setupQuery(undefined, false, new Error("DB error"));
  render(<TournamentsClient selectedAltUsername={null} />);
  expect(screen.getByText("Something went wrong")).toBeInTheDocument();
});

it("renders error message from error object", () => {
  setupQuery(undefined, false, new Error("Connection refused"));
  render(<TournamentsClient selectedAltUsername={null} />);
  expect(screen.getByText("Connection refused")).toBeInTheDocument();
});

// =============================================================================
// Empty state
// =============================================================================

it("renders empty state when history is empty", () => {
  setupQuery([]);
  render(<TournamentsClient selectedAltUsername={null} />);
  expect(screen.getByText("No tournaments yet")).toBeInTheDocument();
});

it("renders Browse Tournaments link in empty state", () => {
  setupQuery([]);
  render(<TournamentsClient selectedAltUsername={null} />);
  expect(
    screen.getByRole("link", { name: /browse tournaments/i })
  ).toBeInTheDocument();
});

// =============================================================================
// Populated state
// =============================================================================

describe("with tournament history", () => {
  it("renders Tournaments heading", () => {
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);
    expect(screen.getByText("Tournaments")).toBeInTheDocument();
  });

  it("renders tournament name", () => {
    setupQuery([makeEntry({ tournamentName: "Johto League" })]);
    render(<TournamentsClient selectedAltUsername={null} />);
    expect(screen.getByText("Johto League")).toBeInTheDocument();
  });

  it("renders alt username as link", () => {
    setupQuery([makeEntry({ altUsername: "misty_alt" })]);
    render(<TournamentsClient selectedAltUsername={null} />);
    const items = screen.getAllByText("misty_alt");
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it("renders format column", () => {
    setupQuery([makeEntry({ format: "vgc-2024" })]);
    render(<TournamentsClient selectedAltUsername={null} />);
    const items = screen.getAllByText("vgc-2024");
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it("renders w-l record for completed entries", () => {
    setupQuery([makeEntry({ wins: 7, losses: 1 })]);
    render(<TournamentsClient selectedAltUsername={null} />);
    expect(screen.getByText("7-1")).toBeInTheDocument();
  });

  it("renders placement as ordinal", () => {
    setupQuery([makeEntry({ placement: 1 })]);
    render(<TournamentsClient selectedAltUsername={null} />);
    // ordinalSuffix(1) = "1st" with trophy
    expect(screen.getByText(/1st 🏆/)).toBeInTheDocument();
  });

  it("renders — for null placement", () => {
    setupQuery([makeEntry({ placement: null })]);
    render(<TournamentsClient selectedAltUsername={null} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders — for null format", () => {
    setupQuery([makeEntry({ format: null })]);
    render(<TournamentsClient selectedAltUsername={null} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Completed status badge for entries", () => {
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);
    const completed = screen.getAllByText("Completed");
    expect(completed.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// useApiQuery is used (not useSupabaseQuery or realtime)
// =============================================================================

describe("uses useApiQuery for data fetching", () => {
  it("calls useApiQuery with the tournament-history query key", () => {
    setupQuery([]);
    render(<TournamentsClient selectedAltUsername={null} />);
    expect(mockUseApiQuery).toHaveBeenCalledWith(
      expect.arrayContaining(["me", "tournament-history"]),
      expect.any(Function),
      expect.objectContaining({ staleTime: 30_000 })
    );
  });
});

// =============================================================================
// Filter chips
// =============================================================================

describe("filter chips", () => {
  it("renders all filter chip labels", () => {
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    const completedLabels = screen.getAllByText("Completed");
    expect(completedLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("shows total count in All chip", () => {
    setupQuery([makeEntry(), makeEntry({ id: 2 })]);
    render(<TournamentsClient selectedAltUsername={null} />);
    // All=2, Live=0, Upcoming=0, Completed=2
    const chips = screen.getAllByText("2");
    expect(chips.length).toBeGreaterThanOrEqual(1);
  });

  it("switches active chip when clicked", async () => {
    const user = userEvent.setup();
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);

    const completedChip = screen.getByRole("button", { name: /^completed/i });
    await user.click(completedChip);
    // Entry remains visible because all entries are "completed"
    expect(screen.getByText("Kanto Regional")).toBeInTheDocument();
  });

  it("shows no entries when 'Live' chip is selected", async () => {
    const user = userEvent.setup();
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);

    await user.click(screen.getByRole("button", { name: /^live/i }));
    expect(
      screen.getByText("No tournaments match the current filters.")
    ).toBeInTheDocument();
  });
});

// =============================================================================
// Summary stats
// =============================================================================

describe("summary stats", () => {
  it("renders Played stat", () => {
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);
    expect(screen.getByText("Played")).toBeInTheDocument();
  });

  it("renders Win Rate stat", () => {
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
  });

  it("renders Best Finish stat", () => {
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);
    expect(screen.getByText("Best Finish")).toBeInTheDocument();
  });

  it("renders Avg Place stat", () => {
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);
    expect(screen.getByText("Avg Place")).toBeInTheDocument();
  });

  it("renders correct played count", () => {
    setupQuery([makeEntry(), makeEntry({ id: 2 }), makeEntry({ id: 3 })]);
    render(<TournamentsClient selectedAltUsername={null} />);
    const threes = screen.getAllByText("3");
    expect(threes.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// Row expand/collapse
// =============================================================================

describe("row expand/collapse", () => {
  it("toggles expanded state on row click", async () => {
    const user = userEvent.setup();
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);

    const row = screen.getByText("Kanto Regional").closest("tr");
    expect(row).not.toBeNull();
    await user.click(row!);

    // Expanded panel shows round-by-round placeholder
    await waitFor(() => {
      expect(
        screen.getByText("Round-by-round data not yet available")
      ).toBeInTheDocument();
    });
  });

  it("collapses row when clicked again", async () => {
    const user = userEvent.setup();
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);

    const row = screen.getByText("Kanto Regional").closest("tr");
    await user.click(row!);
    await user.click(row!);

    await waitFor(() => {
      expect(
        screen.queryByText("Round-by-round data not yet available")
      ).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// selectedAltUsername prop
// =============================================================================

describe("selectedAltUsername prop", () => {
  it("pre-selects alt filter from prop", () => {
    setupQuery([makeEntry({ altUsername: "ash_alt" })]);
    render(<TournamentsClient selectedAltUsername="ash_alt" />);
    // Entry is still visible because the alt matches
    expect(screen.getByText("Kanto Regional")).toBeInTheDocument();
  });
});

// =============================================================================
// Conditional mount (mobile/desktop)
// =============================================================================

describe("conditional mount", () => {
  it("renders skeleton when isClient is false", () => {
    mockUseIsClient.mockReturnValue(false);
    mockUseIsMobile.mockReturnValue(false);
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tournaments-cards")).not.toBeInTheDocument();
  });

  it("renders desktop table when isClient is true and isMobile is false", () => {
    mockUseIsClient.mockReturnValue(true);
    mockUseIsMobile.mockReturnValue(false);
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByTestId("tournaments-cards")).not.toBeInTheDocument();
  });

  it("renders mobile cards when isClient is true and isMobile is true", () => {
    mockUseIsClient.mockReturnValue(true);
    mockUseIsMobile.mockReturnValue(true);
    setupQuery([makeEntry()]);
    render(<TournamentsClient selectedAltUsername={null} />);
    expect(screen.getByTestId("tournaments-cards")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("propagates filter changes to the mobile variant", () => {
    mockUseIsClient.mockReturnValue(true);
    mockUseIsMobile.mockReturnValue(true);
    setupQuery([makeEntry({ id: 1 }), makeEntry({ id: 2 })]);
    render(<TournamentsClient selectedAltUsername={null} />);
    // Both entries pass through to the mobile cards stub.
    expect(screen.getByTestId("mobile-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-card-2")).toBeInTheDocument();
  });
});
