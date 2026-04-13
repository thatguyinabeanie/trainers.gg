import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
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
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn((species: string) => ({
    url: `https://sprites.test/${species}.png`,
  })),
}));

jest.mock("@trainers/utils", () => ({
  formatTimeAgo: jest.fn(() => "2h ago"),
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
    { id: "gen9vgc2024regg", label: "Reg G" },
    { id: "gen9vgc2024regh", label: "Reg H" },
  ],
  selectedFormat: undefined,
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

  it("renders format-specific empty state when filtered", () => {
    render(
      <TeamsListClient
        {...defaultProps}
        initialTeams={[]}
        selectedFormat="gen9vgc2024regg"
      />
    );

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

  it("filters teams by selected format", () => {
    const teams = [
      buildTeam({ id: 1, name: "VGC Team", format: "gen9vgc2024regg" }),
      buildTeam({ id: 2, name: "Draft Team", format: "gen9draft" }),
    ];

    render(
      <TeamsListClient
        {...defaultProps}
        initialTeams={teams}
        selectedFormat="gen9vgc2024regg"
      />
    );

    expect(screen.getByText("VGC Team")).toBeInTheDocument();
    expect(screen.queryByText("Draft Team")).not.toBeInTheDocument();
  });

  it("renders New Team and Import Paste buttons", () => {
    render(<TeamsListClient {...defaultProps} initialTeams={[]} />);

    const newTeamLinks = screen.getAllByText("New Team");
    expect(newTeamLinks.length).toBeGreaterThan(0);

    const importLinks = screen.getAllByText("Import Paste");
    expect(importLinks.length).toBeGreaterThan(0);
  });

  it("renders format filter chips", () => {
    render(<TeamsListClient {...defaultProps} initialTeams={[buildTeam()]} />);

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Reg G")).toBeInTheDocument();
    expect(screen.getByText("Reg H")).toBeInTheDocument();
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
