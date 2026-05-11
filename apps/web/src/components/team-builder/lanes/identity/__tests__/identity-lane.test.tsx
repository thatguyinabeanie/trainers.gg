import { render, screen } from "@testing-library/react";
import React from "react";

import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

const mockContainerCompact = jest.fn().mockReturnValue(false);
jest.mock("../../../use-container-compact", () => ({
  useContainerCompact: () => mockContainerCompact(),
}));

const mockLayoutMode = jest.fn().mockReturnValue("1x6");
jest.mock("../../../use-team-layout", () => ({
  useTeamLayoutMode: () => mockLayoutMode(),
}));

jest.mock("../identity-lane-ghost", () => ({
  IdentityLaneGhost: ({ variant }: { variant: string }) => (
    <div data-testid="ghost" data-variant={variant} />
  ),
}));
jest.mock("../identity-mid-stack", () => ({
  IdentityMidStack: () => <div data-testid="mid-stack" />,
}));
jest.mock("../identity-single-row", () => ({
  IdentitySingleRow: () => <div data-testid="single-row" />,
}));
jest.mock("../identity-vertical", () => ({
  IdentityVertical: () => <div data-testid="vertical" />,
}));

jest.mock("../../../shared/identity-layout-props", () => ({
  filterCurrentTeam: (siblings: any) => siblings ?? [],
}));

import { IdentityLane } from "../identity-lane";

// =============================================================================
// Helpers
// =============================================================================

function makePokemon(): Tables<"pokemon"> {
  return {
    id: "poke-1",
    species: "Garchomp",
    nickname: null,
    gender: "M",
    level: 50,
    held_item: null,
    ability: "Rough Skin",
    nature: "Jolly",
    tera_type: null,
    is_shiny: false,
    move_1: null,
    move_2: null,
    move_3: null,
    move_4: null,
    ev_hp: 0,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 0,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    created_at: "",
    updated_at: "",
  } as Tables<"pokemon">;
}

// =============================================================================
// Tests
// =============================================================================

describe("IdentityLane", () => {
  beforeEach(() => {
    mockContainerCompact.mockReturnValue(false);
    mockLayoutMode.mockReturnValue("1x6");
  });

  it("renders ghost when pokemon is null", () => {
    render(<IdentityLane pokemon={null} />);
    expect(screen.getByTestId("ghost")).toBeInTheDocument();
  });

  it("renders single-row when layout is 1x6 (always compact)", () => {
    mockLayoutMode.mockReturnValue("1x6");
    render(<IdentityLane pokemon={makePokemon()} />);
    expect(screen.getByTestId("single-row")).toBeInTheDocument();
  });

  it("renders vertical when layout ends with -vertical and not compact", () => {
    mockLayoutMode.mockReturnValue("2x3-vertical");
    mockContainerCompact.mockReturnValue(false);
    render(<IdentityLane pokemon={makePokemon()} />);
    expect(screen.getByTestId("vertical")).toBeInTheDocument();
  });

  it("renders mid-stack when not compact and not vertical", () => {
    mockLayoutMode.mockReturnValue("2x3");
    mockContainerCompact.mockReturnValue(false);
    render(<IdentityLane pokemon={makePokemon()} />);
    expect(screen.getByTestId("mid-stack")).toBeInTheDocument();
  });

  it("renders single-row when containerCompact is true", () => {
    mockLayoutMode.mockReturnValue("2x3");
    mockContainerCompact.mockReturnValue(true);
    render(<IdentityLane pokemon={makePokemon()} />);
    expect(screen.getByTestId("single-row")).toBeInTheDocument();
  });
});
