"use client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Fire", "Water", "Grass", "Dragon"],
  getAllLegalMoves: jest.fn(() => [
    "Tailwind",
    "Trick Room",
    "Fire Blast",
    "Fire Punch",
  ]),
  getAbilityShortDesc: jest.fn((n: string) => `${n} short desc`),
}));

import { SpeciesSmartSearch } from "../pickers/species-smart-search";
import { type SpeciesSearchEntry } from "@trainers/pokemon";

function makeEntry(
  species: string,
  abilities: string[] = ["Pressure"]
): SpeciesSearchEntry {
  return {
    species,
    types: ["Dragon", "Ground"],
    abilities,
    abilitySlot1: abilities[0] ?? null,
    abilitySlot2: abilities[1] ?? null,
    hiddenAbility: abilities[2] ?? null,
    roles: [],
    baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    bst: 600,
  };
}

const sampleIndex: SpeciesSearchEntry[] = [
  makeEntry("Charizard", ["Blaze", "Solar Power"]),
  makeEntry("Garchomp", ["Sand Veil", "Rough Skin"]),
  makeEntry("Drampa", ["Sap Sipper", "Cloud Nine", "Berserk"]),
];

// SpeciesSmartSearch now only renders Type / Moves / Abilities suggestions.
// Pokémon results are no longer duplicated here — the main species table
// (filtered by the same query) shows them as full rich rows.

describe("SpeciesSmartSearch", () => {
  it("renders Type category for matching types", () => {
    render(
      <SpeciesSmartSearch
        query="fire"
        index={sampleIndex}
        format={undefined}
        onFilter={jest.fn()}
      />
    );
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Fire")).toBeInTheDocument();
  });

  it("renders Moves category when format defined", () => {
    render(
      <SpeciesSmartSearch
        query="tail"
        index={sampleIndex}
        format={{ id: "x" } as never}
        onFilter={jest.fn()}
      />
    );
    expect(screen.getByText("Moves")).toBeInTheDocument();
    expect(screen.getByText("Tailwind")).toBeInTheDocument();
  });

  it("renders Abilities category from index walk", () => {
    render(
      <SpeciesSmartSearch
        query="blaze"
        index={sampleIndex}
        format={undefined}
        onFilter={jest.fn()}
      />
    );
    expect(screen.getByText("Abilities")).toBeInTheDocument();
    expect(screen.getByText("Blaze")).toBeInTheDocument();
  });

  it("does NOT render a Pokémon category — those live in the main table", () => {
    render(
      <SpeciesSmartSearch
        query="char"
        index={sampleIndex}
        format={undefined}
        onFilter={jest.fn()}
      />
    );
    expect(screen.queryByText("Pokémon")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /select/i })
    ).not.toBeInTheDocument();
  });

  it("clicking Filter on a type calls onFilter with type", async () => {
    const user = userEvent.setup();
    const onFilter = jest.fn();
    render(
      <SpeciesSmartSearch
        query="fire"
        index={sampleIndex}
        format={undefined}
        onFilter={onFilter}
      />
    );
    const filterBtns = screen.getAllByRole("button", { name: /filter/i });
    await user.click(filterBtns[0]!);
    expect(onFilter).toHaveBeenCalledWith({ type: "Fire" });
  });

  it("renders nothing when no Type / Moves / Abilities match", () => {
    const { container } = render(
      <SpeciesSmartSearch
        query="zzzzz"
        index={sampleIndex}
        format={undefined}
        onFilter={jest.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("omits Moves category when no format", () => {
    render(
      <SpeciesSmartSearch
        query="tail"
        index={sampleIndex}
        format={undefined}
        onFilter={jest.fn()}
      />
    );
    expect(screen.queryByText("Moves")).not.toBeInTheDocument();
    expect(screen.queryByText("Tailwind")).not.toBeInTheDocument();
  });
});
