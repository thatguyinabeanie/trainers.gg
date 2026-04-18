import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks — keep the popover test focused on wiring, not domain.
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  exportPokemonToShowdown: jest.fn(() => "Mocked Showdown set\n"),
  parsePokemon: jest.fn((text: string) => {
    if (!text || text === "garbage") return null;
    return {
      species: "Pikachu",
      nickname: "Sparky",
      ability: "Static",
      nature: "Jolly",
      moves: ["Thunderbolt"],
      level: 50,
      shiny: true,
      teraType: null,
      gender: "M",
      item: null,
      evs: {},
      ivs: {},
    };
  }),
  // pokemon-utils.dbPokemonToFlat → fromFlat is referenced via this barrel,
  // even though we mock its caller too — keep the mock complete so the
  // module loads without hitting `undefined is not a function`.
  fromFlat: jest.fn((flat: unknown) => flat),
}));

jest.mock("@trainers/validators", () => ({
  containsProfanity: jest.fn(() => false),
}));

const mockUpdatePokemonAction = jest.fn(async () => ({
  success: true as const,
  data: undefined,
}));
jest.mock("@/actions/teams", () => ({
  updatePokemonAction: (...args: Parameters<typeof mockUpdatePokemonAction>) =>
    mockUpdatePokemonAction(...args),
}));

import { PokemonDetailsPopover } from "../pokemon-details-popover";
import { type Tables } from "@trainers/supabase";

// =============================================================================
// Helpers
// =============================================================================

function buildPokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    ability: "Static",
    created_at: null,
    ev_attack: 0,
    ev_defense: 0,
    ev_hp: 0,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 0,
    format_legal: true,
    gender: null,
    held_item: null,
    id: 7,
    is_shiny: false,
    iv_attack: 31,
    iv_defense: 31,
    iv_hp: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    move1: "Thunderbolt",
    move2: null,
    move3: null,
    move4: null,
    nature: "Jolly",
    nickname: null,
    notes: null,
    species: "Pikachu",
    tera_type: null,
    ...overrides,
  };
}

async function openPopover() {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: /More Pokémon details/i })
  );
  return user;
}

// =============================================================================
// Tests
//
// Note: nickname, gender, shiny, and level have moved to inline controls in
// EditorHeaderBand. This file covers only the ⋯ popover's scope: Showdown
// set export and import.
// =============================================================================

describe("PokemonDetailsPopover", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the trigger button labeled 'More Pokémon details'", () => {
    render(<PokemonDetailsPopover teamId={1} pokemon={buildPokemon()} />);
    expect(
      screen.getByRole("button", { name: /More Pokémon details/i })
    ).toBeInTheDocument();
  });

  it("does not render nickname / gender / shiny / level fields (moved inline)", async () => {
    render(<PokemonDetailsPopover teamId={1} pokemon={buildPokemon()} />);
    const user = await openPopover();
    // These controls belong in EditorHeaderBand now — not in the popover.
    expect(screen.queryByLabelText("Nickname")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Male")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Shiny")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Level")).not.toBeInTheDocument();
    // Silence unused variable warning.
    void user;
  });

  describe("export", () => {
    it("invokes the Showdown exporter when Export is clicked", async () => {
      const { exportPokemonToShowdown } = jest.requireMock(
        "@trainers/pokemon"
      ) as { exportPokemonToShowdown: jest.Mock };

      render(<PokemonDetailsPopover teamId={1} pokemon={buildPokemon()} />);
      const user = await openPopover();
      await user.click(await screen.findByRole("button", { name: "Export" }));
      // We assert the exporter ran rather than the clipboard write — jsdom's
      // navigator.clipboard is brittle to mock and the clipboard fallback
      // path is exercised by a manual smoke test, not unit tests.
      expect(exportPokemonToShowdown).toHaveBeenCalled();
    });
  });

  describe("import", () => {
    it("parses the pasted set and calls updatePokemonAction", async () => {
      const onImported = jest.fn();
      render(
        <PokemonDetailsPopover
          teamId={42}
          pokemon={buildPokemon()}
          onImported={onImported}
        />
      );
      const user = await openPopover();
      // Toggle the import textarea open.
      await user.click(await screen.findByRole("button", { name: "Import" }));
      const textarea = await screen.findByLabelText("Showdown set text");
      await user.type(textarea, "Pikachu @ Light Ball");
      await user.click(screen.getByRole("button", { name: /Apply import/i }));
      expect(mockUpdatePokemonAction).toHaveBeenCalledWith(
        42,
        7,
        expect.objectContaining({ species: "Pikachu" })
      );
      expect(onImported).toHaveBeenCalled();
    });
  });
});
