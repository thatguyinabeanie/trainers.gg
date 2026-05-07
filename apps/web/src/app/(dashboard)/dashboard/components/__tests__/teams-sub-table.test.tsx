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
  }),
}));

// --- @trainers/supabase ---
jest.mock("@trainers/supabase", () => ({
  getTeamsForAlt: jest.fn(),
  getPlayerTournamentHistory: jest.fn(),
}));

// --- @/lib/supabase ---
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

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Loader2: () => <svg data-testid="icon-loader" />,
  ExternalLink: () => <svg data-testid="icon-external-link" />,
  Trophy: () => <svg data-testid="icon-trophy" />,
  Swords: () => <svg data-testid="icon-swords" />,
  ChevronRight: () => <svg data-testid="icon-chevron-right" />,
  History: () => <svg data-testid="icon-history" />,
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

type Team = {
  id: number;
  name: string;
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

function setupQueryMocks(
  teamsData: { data: Team[] | null; isLoading: boolean },
  resultsData: {
    data: TournamentResult[] | null;
    isLoading: boolean;
  } = { data: [], isLoading: false }
) {
  // useSupabaseQuery is called twice per render: teams first, then results.
  // We identify the call by the query key array (second argument).
  mockUseSupabaseQuery.mockImplementation(
    (_queryFn: unknown, keys: unknown[]) => {
      const tag = keys[0];
      if (tag === "altTeams") return teamsData;
      if (tag === "altRecentResults") return resultsData;
      return { data: null, isLoading: false };
    }
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TeamsSubTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: empty data, not loading
    setupQueryMocks({ data: [], isLoading: false });
  });

  // -- Loading state --

  it("renders loading spinner when teams are loading", () => {
    setupQueryMocks({ data: null, isLoading: true });
    render(<TeamsSubTable {...getDefaultProps()} />);
    // Should show at least one loader icon
    const loaders = screen.getAllByTestId("icon-loader");
    expect(loaders.length).toBeGreaterThanOrEqual(1);
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
    const teams: Team[] = [
      { id: 1, name: "Rain Team", pokemonSpecies: ["pelipper", "barraskewda"] },
      { id: 2, name: "Sun Team", pokemonSpecies: ["torkoal", "venusaur"] },
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
