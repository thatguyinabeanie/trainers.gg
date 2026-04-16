import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(({ initialData }: { initialData: unknown }) => ({
    data: initialData,
  })),
}));

jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(() => ({})),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, ...rest }: { alt: string } & Record<string, unknown>) => (
    <img alt={alt} {...rest} />
  ),
}));

jest.mock("@trainers/pokemon", () => ({
  getFormatLabel: jest.fn((id: string) => id.toUpperCase()),
  MAX_TEAM_SIZE: 6,
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn((species: string) => ({
    url: `https://sprites.test/${species}.png`,
  })),
}));

jest.mock("@trainers/utils", () => ({
  formatTimeAgo: jest.fn(() => "2h ago"),
}));

// Stub the dialog so tests don't transitively pull in `@/actions/teams`
// (which loads `next/cache` — incompatible with the Jest environment).
const mockNewTeamDialog = jest.fn(
  (props: { open: boolean; initialMode: string }) => (
    <div
      data-testid="new-team-dialog"
      data-open={props.open}
      data-mode={props.initialMode}
    />
  )
);
jest.mock("../new-team-dialog", () => ({
  NewTeamDialog: (props: { open: boolean; initialMode: string }) =>
    mockNewTeamDialog(props),
}));

import { TeamsListClient, teamKeys } from "../teams-list-client";

// =============================================================================
// Helpers
// =============================================================================

function buildTeam(
  overrides: Partial<{
    id: number;
    name: string;
    format: string | null;
    updated_at: string | null;
  }> = {}
) {
  return {
    id: 1,
    name: "My Team",
    format: "gen9vgc2024regg" as string | null,
    is_public: false,
    updated_at: "2026-04-13T00:00:00Z",
    created_at: "2026-04-13T00:00:00Z",
    team_pokemon: [
      {
        id: 10,
        team_position: 1,
        pokemon: { id: 100, species: "Incineroar", is_shiny: false },
      },
      {
        id: 11,
        team_position: 2,
        pokemon: { id: 101, species: "Rillaboom", is_shiny: false },
      },
    ],
    ...overrides,
  };
}

const defaultProps = {
  altId: 42,
  handle: "ash_ketchum",
  activeFormats: [
    { id: "gen9vgc2024regg", label: "Reg G", game: "Scarlet & Violet" },
    { id: "gen9vgc2024regh", label: "Reg H", game: "Scarlet & Violet" },
    {
      id: "championsvgc2026regma",
      label: "Reg M-A",
      game: "Pokemon Champions",
    },
  ],
} as const;

// =============================================================================
// Tests
// =============================================================================

describe("TeamsListClient", () => {
  describe("teamKeys", () => {
    it("generates query keys for alt teams list", () => {
      expect(teamKeys.all(42)).toEqual(["teams", 42]);
    });

    it("generates query keys for team detail", () => {
      expect(teamKeys.detail(99)).toEqual(["team", 99]);
    });
  });

  it("renders empty state when no teams exist", () => {
    render(<TeamsListClient {...defaultProps} initialTeams={[]} />);

    expect(screen.getByText("No teams yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create your first team or import a Showdown paste to get started."
      )
    ).toBeInTheDocument();
  });

  it("renders format-specific empty state when format filter is active", () => {
    render(
      <TeamsListClient
        {...defaultProps}
        initialTeams={[buildTeam({ format: "other-format" })]}
      />
    );

    // Select a format from the dropdown
    const formatSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(formatSelect!, { target: { value: "gen9vgc2024regg" } });

    expect(screen.getByText("No teams yet")).toBeInTheDocument();
    expect(
      screen.getByText("No teams for this format yet.")
    ).toBeInTheDocument();
  });

  it("renders team rows in data table", () => {
    const teams = [
      buildTeam({ id: 1, name: "Team Alpha" }),
      buildTeam({ id: 2, name: "Team Beta" }),
    ];

    render(<TeamsListClient {...defaultProps} initialTeams={teams} />);

    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(screen.getByText("Team Beta")).toBeInTheDocument();
  });

  it("renders table column headers", () => {
    render(<TeamsListClient {...defaultProps} initialTeams={[buildTeam()]} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Pokemon")).toBeInTheDocument();
    expect(screen.getByText("Format")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
  });

  it("renders pokemon sprites in table rows", () => {
    render(<TeamsListClient {...defaultProps} initialTeams={[buildTeam()]} />);

    expect(screen.getByAltText("Incineroar")).toBeInTheDocument();
    expect(screen.getByAltText("Rillaboom")).toBeInTheDocument();
  });

  it("filters teams by selected format via dropdown", () => {
    const teams = [
      buildTeam({ id: 1, name: "VGC Team", format: "gen9vgc2024regg" }),
      buildTeam({
        id: 2,
        name: "Champions Team",
        format: "championsvgc2026regma",
      }),
    ];

    render(<TeamsListClient {...defaultProps} initialTeams={teams} />);

    const formatSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(formatSelect!, { target: { value: "gen9vgc2024regg" } });

    expect(screen.getByText("VGC Team")).toBeInTheDocument();
    expect(screen.queryByText("Champions Team")).not.toBeInTheDocument();
  });

  it("renders New Team and Import Paste buttons", () => {
    render(<TeamsListClient {...defaultProps} initialTeams={[]} />);

    const newTeamLinks = screen.getAllByText("New Team");
    expect(newTeamLinks.length).toBeGreaterThan(0);

    const importLinks = screen.getAllByText("Import Paste");
    expect(importLinks.length).toBeGreaterThan(0);
  });

  it("opens the dialog in empty mode when New Team is clicked", () => {
    render(<TeamsListClient {...defaultProps} initialTeams={[buildTeam()]} />);

    // Dialog starts closed
    expect(screen.getByTestId("new-team-dialog")).toHaveAttribute(
      "data-open",
      "false"
    );

    fireEvent.click(screen.getByText("New Team"));

    const dialog = screen.getByTestId("new-team-dialog");
    expect(dialog).toHaveAttribute("data-open", "true");
    expect(dialog).toHaveAttribute("data-mode", "empty");
  });

  it("opens the dialog in import mode when Import Paste is clicked", () => {
    render(<TeamsListClient {...defaultProps} initialTeams={[buildTeam()]} />);

    fireEvent.click(screen.getByText("Import Paste"));

    const dialog = screen.getByTestId("new-team-dialog");
    expect(dialog).toHaveAttribute("data-open", "true");
    expect(dialog).toHaveAttribute("data-mode", "import");
  });

  it("renders game and format dropdowns with correct options", () => {
    render(<TeamsListClient {...defaultProps} initialTeams={[buildTeam()]} />);

    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);

    // Game dropdown has "All Games" + unique games
    expect(
      screen.getByRole("option", { name: "All Games" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Scarlet & Violet" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Pokemon Champions" })
    ).toBeInTheDocument();

    // Format dropdown has "All Formats"
    expect(
      screen.getByRole("option", { name: "All Formats" })
    ).toBeInTheDocument();
  });

  it("filters format dropdown when a game is selected", () => {
    render(<TeamsListClient {...defaultProps} initialTeams={[buildTeam()]} />);

    const gameSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(gameSelect!, { target: { value: "Scarlet & Violet" } });

    // Only Scarlet & Violet formats should appear in the format dropdown
    expect(screen.getByRole("option", { name: "Reg G" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Reg H" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Reg M-A" })
    ).not.toBeInTheDocument();
  });

  it("resets format selection when game changes, showing all teams", () => {
    const teams = [
      buildTeam({ id: 1, name: "VGC Team", format: "gen9vgc2024regg" }),
      buildTeam({
        id: 2,
        name: "Champions Team",
        format: "championsvgc2026regma",
      }),
    ];

    render(<TeamsListClient {...defaultProps} initialTeams={teams} />);

    // Select a specific format to narrow the list
    const formatSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(formatSelect!, { target: { value: "gen9vgc2024regg" } });

    // Only VGC Team should be visible
    expect(screen.getByText("VGC Team")).toBeInTheDocument();
    expect(screen.queryByText("Champions Team")).not.toBeInTheDocument();

    // Change game — format filter resets to null, all teams become visible
    const gameSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(gameSelect!, { target: { value: "Pokemon Champions" } });

    // Both teams visible again because selectedFormat reset to null
    expect(screen.getByText("VGC Team")).toBeInTheDocument();
    expect(screen.getByText("Champions Team")).toBeInTheDocument();
  });

  it("links team name to the editor", () => {
    render(
      <TeamsListClient
        {...defaultProps}
        initialTeams={[buildTeam({ id: 7, name: "My Team" })]}
      />
    );

    const link = screen.getByText("My Team").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/alts/ash_ketchum/teams/7");
  });
});
