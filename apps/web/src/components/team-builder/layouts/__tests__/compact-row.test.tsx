/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import React from "react";

import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock heavy child components to isolate layout rendering
jest.mock("../../lanes/calc-reverse-card", () => ({
  CalcReverseColumn: () => <div data-testid="calc-reverse" />,
}));
jest.mock("../../lanes/moves-lane", () => ({
  MovesLane: () => <div data-testid="moves-lane" />,
}));
jest.mock("../../lanes/stats-lane", () => ({
  StatsLane: () => <div data-testid="stats-lane" />,
}));
jest.mock("../../pickers/species-picker-dialog", () => ({
  SpeciesPickerDialog: () => null,
}));
jest.mock("../../shared/fields", () => ({
  FormCells: () => <div data-testid="form-cells" />,
}));
jest.mock("../../shared/meta-bar", () => ({
  MetaBar: ({ variant }: { variant: string }) => (
    <div data-testid="meta-bar" data-variant={variant} />
  ),
}));
jest.mock("../../shared/sprite-section", () => ({
  SpriteSection: () => <div data-testid="sprite-section" />,
}));
jest.mock("../../validation/field-error", () => ({
  FieldErrors: () => null,
}));

const mockCalcEnabled = jest.fn().mockReturnValue(false);
jest.mock("../../calc/calc-state-context", () => ({
  useCalcEnabled: () => mockCalcEnabled(),
}));

jest.mock("../../shared/use-identity-state", () => ({
  useIdentityState: () => ({
    nickDraft: "Chomp",
    setNickDraft: jest.fn(),
    nicknameRef: { current: null },
    gender: "Male" as const,
    isShiny: false,
    level: 50,
    showLevel: true,
    handleNickBlur: jest.fn(),
    handleGenderToggle: jest.fn(),
    handleShinyToggle: jest.fn(),
    handleSpeciesPick: jest.fn(),
    speciesErrors: [],
    nicknameErrors: [],
    genderErrors: [],
    itemErrors: [],
    abilityErrors: [],
    natureErrors: [],
    isMegaStone: false,
    natUp: null,
    natDown: null,
    types: [],
  }),
}));

import { CompactRow } from "../compact-row";

// =============================================================================
// Helpers
// =============================================================================

function makePokemon(overrides: Partial<Tables<"pokemon">> = {}): Tables<"pokemon"> {
  return {
    id: "poke-1",
    species: "Garchomp",
    nickname: "Chomp",
    gender: "M",
    level: 50,
    held_item: "Choice Scarf",
    ability: "Rough Skin",
    nature: "Jolly",
    tera_type: "Steel",
    is_shiny: false,
    move_1: "Earthquake",
    move_2: "Dragon Claw",
    move_3: "Swords Dance",
    move_4: "Protect",
    ev_hp: 0,
    ev_attack: 252,
    ev_defense: 0,
    ev_special_attack: 0,
    ev_special_defense: 4,
    ev_speed: 252,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    created_at: "",
    updated_at: "",
    ...overrides,
  } as Tables<"pokemon">;
}

const defaultProps = {
  idx: 0,
  pokemon: makePokemon(),
  teamPokemon: [] as TeamWithPokemon["team_pokemon"],
  format: "gen9vgc2024regg" as any,
  onUpdate: jest.fn(),
  onRemove: jest.fn(),
};

// =============================================================================
// Tests
// =============================================================================

describe("CompactRow", () => {
  it("renders without crashing", () => {
    const { container } = render(<CompactRow {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("displays the slot number (01-padded)", () => {
    render(<CompactRow {...defaultProps} idx={2} />);
    expect(screen.getAllByText("03").length).toBeGreaterThan(0);
  });

  it("renders remove buttons with correct aria-label", () => {
    render(<CompactRow {...defaultProps} />);
    const removeButtons = screen.getAllByRole("button", {
      name: /Remove Garchomp from slot 1/,
    });
    expect(removeButtons.length).toBeGreaterThan(0);
  });

  it("applies opacity-50 when isDragging", () => {
    const { container } = render(<CompactRow {...defaultProps} isDragging />);
    expect(container.firstChild).toHaveClass("opacity-50");
  });

  it("renders stats and moves lanes", () => {
    render(<CompactRow {...defaultProps} />);
    expect(screen.getByTestId("stats-lane")).toBeInTheDocument();
    expect(screen.getByTestId("moves-lane")).toBeInTheDocument();
  });

  it("renders calc strip when calc is enabled", () => {
    mockCalcEnabled.mockReturnValue(true);
    render(<CompactRow {...defaultProps} />);
    expect(screen.getByTestId("calc-reverse")).toBeInTheDocument();
  });

  it("does not render calc strip when calc is disabled", () => {
    mockCalcEnabled.mockReturnValue(false);
    render(<CompactRow {...defaultProps} />);
    expect(screen.queryByTestId("calc-reverse")).not.toBeInTheDocument();
  });
});
