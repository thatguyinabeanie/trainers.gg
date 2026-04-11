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

jest.mock("@trainers/pokemon", () => ({
  getFormatLabel: jest.fn((id: string) => id.toUpperCase()),
}));

jest.mock("@/components/team-builder/team-card", () => ({
  TeamCard: ({ team }: { team: { id: number; name: string } }) => (
    <div data-testid={`team-card-${team.id}`}>{team.name}</div>
  ),
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
    pokemon_count: number;
  }> = {}
) {
  return {
    id: 1,
    name: "My Team",
    format: "gen9vgc2024regg" as string | null,
    pokemon_count: 6,
    species_list: ["Incineroar", "Rillaboom"],
    created_at: "2026-01-01T00:00:00Z",
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

  it("renders team cards for teams", () => {
    const teams = [
      buildTeam({ id: 1, name: "Team Alpha" }),
      buildTeam({ id: 2, name: "Team Beta" }),
    ];

    render(<TeamsListClient {...defaultProps} initialTeams={teams} />);

    expect(screen.getByTestId("team-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("team-card-2")).toBeInTheDocument();
  });

  it("groups teams by format in 'all' view", () => {
    const teams = [
      buildTeam({ id: 1, name: "VGC Team", format: "gen9vgc2024regg" }),
      buildTeam({ id: 2, name: "Draft Team", format: "gen9draft" }),
    ];

    render(<TeamsListClient {...defaultProps} initialTeams={teams} />);

    // Format headers rendered via getFormatLabel mock (uppercased)
    expect(screen.getByText("GEN9VGC2024REGG")).toBeInTheDocument();
    expect(screen.getByText("GEN9DRAFT")).toBeInTheDocument();
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

    expect(screen.getByTestId("team-card-1")).toBeInTheDocument();
    expect(screen.queryByTestId("team-card-2")).not.toBeInTheDocument();
  });

  it("renders New Team and Import Paste buttons", () => {
    render(<TeamsListClient {...defaultProps} initialTeams={[]} />);

    // Toolbar buttons
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

  it("handles teams with no format", () => {
    const teams = [buildTeam({ id: 1, name: "Unformatted", format: null })];

    render(<TeamsListClient {...defaultProps} initialTeams={teams} />);

    expect(screen.getByText("No Format")).toBeInTheDocument();
    expect(screen.getByTestId("team-card-1")).toBeInTheDocument();
  });
});
