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
// =============================================================================

describe("PokemonDetailsPopover", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the trigger button labeled 'More Pokémon details'", () => {
    render(
      <PokemonDetailsPopover
        teamId={1}
        pokemon={buildPokemon()}
        onUpdate={jest.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: /More Pokémon details/i })
    ).toBeInTheDocument();
  });

  describe("nickname field", () => {
    it("calls onUpdate with the typed nickname", async () => {
      const onUpdate = jest.fn();
      render(
        <PokemonDetailsPopover
          teamId={1}
          pokemon={buildPokemon()}
          onUpdate={onUpdate}
        />
      );
      const user = await openPopover();
      const input = await screen.findByLabelText("Nickname");
      await user.type(input, "S");
      // Each keystroke triggers an update — assert at least one call.
      expect(onUpdate).toHaveBeenCalledWith("nickname", "S");
    });
  });

  describe("gender radio", () => {
    it("calls onUpdate with the chosen gender (Male)", async () => {
      const onUpdate = jest.fn();
      render(
        <PokemonDetailsPopover
          teamId={1}
          pokemon={buildPokemon({ gender: null })}
          onUpdate={onUpdate}
        />
      );
      const user = await openPopover();
      // Radio labels are rendered as text labels next to the radio inputs.
      await user.click(await screen.findByText("Male"));
      expect(onUpdate).toHaveBeenCalledWith("gender", "Male");
    });

    it("stores null when 'Unknown' is selected from a non-Unknown starting state", async () => {
      const onUpdate = jest.fn();
      render(
        <PokemonDetailsPopover
          teamId={1}
          // Start with a real gender so clicking Unknown is a real change.
          pokemon={buildPokemon({ gender: "Male" })}
          onUpdate={onUpdate}
        />
      );
      const user = await openPopover();
      await user.click(await screen.findByText("Unknown"));
      expect(onUpdate).toHaveBeenCalledWith("gender", null);
    });
  });

  describe("shiny switch", () => {
    it("calls onUpdate with the toggled shiny state", async () => {
      const onUpdate = jest.fn();
      render(
        <PokemonDetailsPopover
          teamId={1}
          pokemon={buildPokemon({ is_shiny: false })}
          onUpdate={onUpdate}
        />
      );
      const user = await openPopover();
      const toggle = await screen.findByLabelText("Shiny");
      await user.click(toggle);
      expect(onUpdate).toHaveBeenCalledWith("is_shiny", true);
    });
  });

  describe("level field", () => {
    it("clamps the level to 1..100 and calls onUpdate", async () => {
      const onUpdate = jest.fn();
      render(
        <PokemonDetailsPopover
          teamId={1}
          pokemon={buildPokemon({ level: 50 })}
          onUpdate={onUpdate}
        />
      );
      const user = await openPopover();
      const input = await screen.findByLabelText("Level");
      // Replace the value entirely.
      await user.clear(input);
      await user.type(input, "150");
      // Last call should clamp to 100.
      expect(onUpdate).toHaveBeenLastCalledWith("level", 100);
    });
  });

  describe("export", () => {
    it("invokes the Showdown exporter when Export is clicked", async () => {
      const { exportPokemonToShowdown } = jest.requireMock(
        "@trainers/pokemon"
      ) as { exportPokemonToShowdown: jest.Mock };

      render(
        <PokemonDetailsPopover
          teamId={1}
          pokemon={buildPokemon()}
          onUpdate={jest.fn()}
        />
      );
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
          onUpdate={jest.fn()}
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
