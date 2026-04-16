import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

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
  (props: {
    open: boolean;
    initialMode: string;
    alts?: Array<{ id: number; username: string }>;
  }) => (
    <div
      data-testid="new-team-dialog"
      data-open={props.open}
      data-mode={props.initialMode}
      data-has-alts={props.alts ? "true" : "false"}
    />
  )
);
jest.mock("../new-team-dialog", () => ({
  NewTeamDialog: (props: {
    open: boolean;
    initialMode: string;
    alts?: Array<{ id: number; username: string }>;
  }) => mockNewTeamDialog(props),
}));

import { AllTeamsClient } from "../all-teams-client";

// =============================================================================
// Fixtures
// =============================================================================

function buildTeam(
  overrides: Partial<{
    id: number;
    name: string;
    format: string | null;
    alt_username: string;
  }> = {}
) {
  return {
    id: 1,
    name: "Cross-Alt Team",
    format: "gen9vgc2024regg" as string | null,
    is_public: false,
    updated_at: "2026-04-13T00:00:00Z",
    created_at: "2026-04-13T00:00:00Z",
    alt_username: "ash_ketchum",
    team_pokemon: [
      {
        id: 10,
        team_position: 1,
        pokemon: { id: 100, species: "Incineroar", is_shiny: false },
      },
    ],
    ...overrides,
  };
}

const ALTS = [
  { id: 1, username: "ash_ketchum" },
  { id: 2, username: "misty_cerulean" },
];

const ACTIVE_FORMATS = [
  { id: "gen9vgc2024regg", label: "Reg G", game: "Scarlet & Violet" },
  { id: "gen9vgc2024regh", label: "Reg H", game: "Scarlet & Violet" },
];

const defaultProps = {
  alts: ALTS,
  activeFormats: ACTIVE_FORMATS,
} as const;

// =============================================================================
// Tests
// =============================================================================

describe("AllTeamsClient", () => {
  it("renders empty state when initialTeams is empty", () => {
    render(<AllTeamsClient {...defaultProps} initialTeams={[]} />);

    expect(screen.getByText("No teams yet")).toBeInTheDocument();
    expect(screen.getByText("New Team")).toBeInTheDocument();
    expect(screen.getByText("Import Paste")).toBeInTheDocument();
  });

  it("renders data table with team rows", () => {
    render(
      <AllTeamsClient
        {...defaultProps}
        initialTeams={[
          buildTeam({ id: 1, name: "Alpha" }),
          buildTeam({ id: 2, name: "Beta" }),
        ]}
      />
    );

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("renders alt chips when user has multiple alts", () => {
    render(<AllTeamsClient {...defaultProps} initialTeams={[buildTeam()]} />);

    // Use role=button to distinguish chip from the table cell text
    expect(
      screen.getByRole("button", { name: "ash_ketchum" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "misty_cerulean" })
    ).toBeInTheDocument();
  });

  it("filters teams by alt chip when clicked", () => {
    render(
      <AllTeamsClient
        {...defaultProps}
        initialTeams={[
          buildTeam({ id: 1, name: "Ash Team", alt_username: "ash_ketchum" }),
          buildTeam({
            id: 2,
            name: "Misty Team",
            alt_username: "misty_cerulean",
          }),
        ]}
      />
    );

    // Both visible initially
    expect(screen.getByText("Ash Team")).toBeInTheDocument();
    expect(screen.getByText("Misty Team")).toBeInTheDocument();

    // Click misty chip
    fireEvent.click(screen.getByRole("button", { name: "misty_cerulean" }));

    expect(screen.queryByText("Ash Team")).not.toBeInTheDocument();
    expect(screen.getByText("Misty Team")).toBeInTheDocument();
  });

  it("opens dialog in empty mode when New Team is clicked (toolbar)", () => {
    render(<AllTeamsClient {...defaultProps} initialTeams={[buildTeam()]} />);

    expect(screen.getByTestId("new-team-dialog")).toHaveAttribute(
      "data-open",
      "false"
    );

    fireEvent.click(screen.getByText("New Team"));

    const dialog = screen.getByTestId("new-team-dialog");
    expect(dialog).toHaveAttribute("data-open", "true");
    expect(dialog).toHaveAttribute("data-mode", "empty");
  });

  it("opens dialog in import mode when Import Paste is clicked (toolbar)", () => {
    render(<AllTeamsClient {...defaultProps} initialTeams={[buildTeam()]} />);

    fireEvent.click(screen.getByText("Import Paste"));

    const dialog = screen.getByTestId("new-team-dialog");
    expect(dialog).toHaveAttribute("data-open", "true");
    expect(dialog).toHaveAttribute("data-mode", "import");
  });

  it("opens dialog from empty state CTAs", () => {
    render(<AllTeamsClient {...defaultProps} initialTeams={[]} />);

    fireEvent.click(screen.getByText("New Team"));

    const dialog = screen.getByTestId("new-team-dialog");
    expect(dialog).toHaveAttribute("data-open", "true");
    expect(dialog).toHaveAttribute("data-mode", "empty");
  });

  it("passes alts prop to the dialog (cross-alt context)", () => {
    render(<AllTeamsClient {...defaultProps} initialTeams={[buildTeam()]} />);

    expect(screen.getByTestId("new-team-dialog")).toHaveAttribute(
      "data-has-alts",
      "true"
    );
  });

  it("navigates to team editor via row click", () => {
    render(
      <AllTeamsClient
        {...defaultProps}
        initialTeams={[
          buildTeam({ id: 7, name: "Clickable", alt_username: "ash_ketchum" }),
        ]}
      />
    );

    const link = screen.getByText("Clickable").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/alts/ash_ketchum/teams/7");
  });
});
