// --- Mock modules before imports ---

// --- next/image ---
jest.mock("next/image", () => {
  return function MockImage({
    src,
    alt,
    unoptimized: _unoptimized,
    ...props
  }: {
    src: string;
    alt: string;
    unoptimized?: boolean;
    [key: string]: unknown;
  }) {
    return <img src={src} alt={alt} data-testid="mock-image" {...props} />;
  };
});

// --- next/link ---
jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// --- @trainers/pokemon/sprites ---
jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: (species: string) => ({
    url: `https://sprites.test/${species}.png`,
    pixelated: false,
  }),
}));

// --- @trainers/supabase (barrel) — getPlayerTournamentHistory used by RecentResults ---
jest.mock("@trainers/supabase", () => ({
  getTeamsForAlt: jest.fn(),
  getPlayerTournamentHistory: jest.fn(),
}));

// --- @trainers/supabase/react-query — useApiQuery used by TeamsSubTable ---
const mockUseApiQuery = jest.fn();
jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
}));

// --- @/lib/supabase — useSupabaseQuery used by RecentResults ---
const mockUseSupabaseQuery = jest.fn();
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: (...args: unknown[]) => mockUseSupabaseQuery(...args),
}));

// --- @/lib/utils ---
jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) =>
    args
      .filter((a) => typeof a === "string")
      .join(" ")
      .trim(),
}));

// --- @/components/ui/alert ---
jest.mock("@/components/ui/alert", () => ({
  Alert: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => <div role="alert" {...props}>{children}</div>,
  AlertDescription: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => <span {...props}>{children}</span>,
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Loader2: () => <svg data-testid="icon-loader" />,
  ExternalLink: () => <svg data-testid="icon-external-link" />,
  Trophy: () => <svg data-testid="icon-trophy" />,
  Swords: () => <svg data-testid="icon-swords" />,
  ChevronRight: () => <svg data-testid="icon-chevron-right" />,
  History: () => <svg data-testid="icon-history" />,
  AlertTriangle: () => <svg data-testid="icon-alert-triangle" />,
}));

// --- @/components/ui/button ---
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    render: renderProp,
    ...props
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
    [key: string]: unknown;
  }) => {
    // If render prop is a Link element, render it with children
    if (renderProp && React.isValidElement(renderProp)) {
      return React.cloneElement(
        renderProp as React.ReactElement<{ children?: React.ReactNode }>,
        {},
        children
      );
    }
    return <button {...props}>{children}</button>;
  },
}));

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { TeamsSubTable } from "../teams-sub-table";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AltTeam = {
  id: number;
  name: string;
  createdBy: number;
  isPublic: boolean;
  formatLegal: boolean | null;
  pokemonSpecies: string[];
};

type TournamentResult = {
  id: number;
  tournamentName: string;
  tournamentSlug: string;
  placement: number | null;
  startDate: string | null;
  teamPokemon: string[];
};

function getDefaultProps(
  overrides: Partial<React.ComponentProps<typeof TeamsSubTable>> = {}
): React.ComponentProps<typeof TeamsSubTable> {
  return {
    altId: 1,
    altUsername: "ash_main",
    isMain: false,
    onDeleteAlt: jest.fn(),
    isDeletePending: false,
    refreshKey: 0,
    ...overrides,
  };
}

/** Set up both query mocks in one call. */
function setupQueryMocks(
  teamsState: {
    data?: AltTeam[] | null;
    isLoading?: boolean;
    isError?: boolean;
    error?: Error | null;
  },
  resultsState: {
    data?: TournamentResult[] | null;
    isLoading?: boolean;
    error?: Error | null;
  } = {}
) {
  // TeamsSubTable now uses useApiQuery (queryKey[0] === "altTeams").
  mockUseApiQuery.mockReturnValue({
    data: teamsState.data ?? [],
    isLoading: teamsState.isLoading ?? false,
    isError: teamsState.isError ?? false,
    error: teamsState.error ?? null,
  });

  // RecentResults still uses useSupabaseQuery (queryKey[0] === "altRecentResults").
  mockUseSupabaseQuery.mockReturnValue({
    data: resultsState.data ?? [],
    isLoading: resultsState.isLoading ?? false,
    error: resultsState.error ?? null,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TeamsSubTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupQueryMocks({ data: [], isLoading: false });
  });

  // -- useApiQuery receives correct args --

  describe("useApiQuery integration", () => {
    it("calls useApiQuery with the altTeams key including altId and refreshKey", () => {
      render(<TeamsSubTable {...getDefaultProps({ altId: 42, refreshKey: 3 })} />);
      expect(mockUseApiQuery).toHaveBeenCalledWith(
        ["altTeams", 42, 3],
        expect.any(Function),
        expect.objectContaining({ staleTime: 30_000 })
      );
    });

    it("increments the query key cache when refreshKey changes", () => {
      const { rerender } = render(
        <TeamsSubTable {...getDefaultProps({ refreshKey: 0 })} />
      );
      expect(mockUseApiQuery).toHaveBeenLastCalledWith(
        ["altTeams", 1, 0],
        expect.any(Function),
        expect.anything()
      );

      rerender(<TeamsSubTable {...getDefaultProps({ refreshKey: 1 })} />);
      expect(mockUseApiQuery).toHaveBeenLastCalledWith(
        ["altTeams", 1, 1],
        expect.any(Function),
        expect.anything()
      );
    });
  });

  // -- Loading state --

  it("renders loading spinner when teams are loading", () => {
    setupQueryMocks({ data: null, isLoading: true });
    render(<TeamsSubTable {...getDefaultProps()} />);
    // Should show at least one loader icon
    const loaders = screen.getAllByTestId("icon-loader");
    expect(loaders.length).toBeGreaterThanOrEqual(1);
  });

  // -- Error state --

  it("renders error alert when teams query fails", () => {
    setupQueryMocks({
      data: undefined,
      isError: true,
      error: new Error("Network error"),
    });
    render(<TeamsSubTable {...getDefaultProps()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders generic error message when error has no message", () => {
    setupQueryMocks({
      data: undefined,
      isError: true,
      error: null,
    });
    render(<TeamsSubTable {...getDefaultProps()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Failed to load teams")).toBeInTheDocument();
  });

  // -- Empty state --

  it("renders 'No teams yet' when there are no teams", () => {
    setupQueryMocks({ data: [], isLoading: false });
    render(<TeamsSubTable {...getDefaultProps()} />);
    expect(screen.getByText("No teams yet")).toBeInTheDocument();
  });

  it("renders 'No results yet' when there are no recent results", () => {
    setupQueryMocks(
      { data: [], isLoading: false },
      { data: [], isLoading: false }
    );
    render(<TeamsSubTable {...getDefaultProps()} />);
    expect(screen.getByText("No results yet")).toBeInTheDocument();
  });

  // -- Teams display --

  it("renders team names and pokemon sprites", () => {
    const teams: AltTeam[] = [
      {
        id: 1,
        name: "Rain Team",
        createdBy: 1,
        isPublic: false,
        formatLegal: null,
        pokemonSpecies: ["pelipper", "barraskewda"],
      },
      {
        id: 2,
        name: "Sun Team",
        createdBy: 1,
        isPublic: false,
        formatLegal: null,
        pokemonSpecies: ["torkoal", "venusaur"],
      },
    ];
    setupQueryMocks({ data: teams, isLoading: false });
    render(<TeamsSubTable {...getDefaultProps()} />);

    expect(screen.getByText("Rain Team")).toBeInTheDocument();
    expect(screen.getByText("Sun Team")).toBeInTheDocument();

    // Check sprite images
    const images = screen.getAllByTestId("mock-image");
    // 2 teams * 2 pokemon each = 4 images
    expect(images.length).toBe(4);
  });

  it("renders team links pointing to correct paths", () => {
    const teams: AltTeam[] = [
      {
        id: 7,
        name: "Trick Room",
        createdBy: 1,
        isPublic: false,
        formatLegal: true,
        pokemonSpecies: ["hatterene"],
      },
    ];
    setupQueryMocks({ data: teams, isLoading: false });
    render(<TeamsSubTable {...getDefaultProps({ altUsername: "ash_main" })} />);
    const link = screen.getByText("Trick Room").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/alts/ash_main/teams/7");
  });

  // -- Recent results display --

  it("renders tournament results with placement", () => {
    const results: TournamentResult[] = [
      {
        id: 10,
        tournamentName: "Pallet Open",
        tournamentSlug: "pallet-open",
        placement: 1,
        startDate: "2026-03-28",
        teamPokemon: ["pikachu"],
      },
      {
        id: 11,
        tournamentName: "Viridian Cup",
        tournamentSlug: "viridian-cup",
        placement: 4,
        startDate: "2026-03-15",
        teamPokemon: [],
      },
    ];
    setupQueryMocks(
      { data: [], isLoading: false },
      { data: results, isLoading: false }
    );
    render(<TeamsSubTable {...getDefaultProps()} />);

    expect(screen.getByText("Pallet Open")).toBeInTheDocument();
    expect(screen.getByText("Viridian Cup")).toBeInTheDocument();
    // First place shows trophy icon instead of #1 text
    expect(screen.getByTestId("icon-trophy")).toBeInTheDocument();
    expect(screen.getByText("#4")).toBeInTheDocument();
  });

  // -- Footer buttons --

  it("renders 'View alt' and 'History' links", () => {
    setupQueryMocks({ data: [], isLoading: false });
    render(<TeamsSubTable {...getDefaultProps()} />);

    const viewAltLink = screen.getByText("View alt");
    expect(viewAltLink.closest("a")).toHaveAttribute(
      "href",
      "/dashboard/alts/ash_main"
    );

    const historyLink = screen.getByText("History");
    expect(historyLink.closest("a")).toHaveAttribute(
      "href",
      "/dashboard/alts/ash_main/tournaments"
    );
  });

  it("renders Delete button for non-main alts", () => {
    setupQueryMocks({ data: [], isLoading: false });
    render(<TeamsSubTable {...getDefaultProps({ isMain: false })} />);
    expect(
      screen.getByRole("button", { name: /Delete/ })
    ).toBeInTheDocument();
  });

  it("does not render Delete button for main alt", () => {
    render(<TeamsSubTable {...getDefaultProps({ isMain: true })} />);
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("calls onDeleteAlt when delete button is clicked", () => {
    const props = getDefaultProps();
    render(<TeamsSubTable {...props} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(props.onDeleteAlt).toHaveBeenCalled();
  });

  it("disables delete button when isDeletePending is true", () => {
    render(<TeamsSubTable {...getDefaultProps({ isDeletePending: true })} />);
    const deleteBtn = screen.getByText("Delete");
    expect(deleteBtn).toBeDisabled();
  });

  // -- Section headings --

  it("renders Teams and Recent Results section headings", () => {
    setupQueryMocks({ data: [], isLoading: false });
    render(<TeamsSubTable {...getDefaultProps()} />);
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Recent Results")).toBeInTheDocument();
  });
});
