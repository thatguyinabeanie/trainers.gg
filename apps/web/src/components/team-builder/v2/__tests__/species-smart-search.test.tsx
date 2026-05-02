"use client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Fire", "Water", "Grass", "Dragon"],
  getAllLegalMoves: jest.fn(() => ["Tailwind", "Trick Room", "Fire Blast", "Fire Punch"]),
  getAbilityShortDesc: jest.fn((n: string) => `${n} short desc`),
}));

import { SpeciesSmartSearch } from "../pickers/species-smart-search";
import { type SpeciesSearchEntry } from "@trainers/pokemon";

function makeEntry(species: string, abilities: string[] = ["Pressure"]): SpeciesSearchEntry {
  return {
    species, types: ["Dragon", "Ground"],
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

describe("SpeciesSmartSearch", () => {
  it("renders Type category for matching types", () => {
    render(<SpeciesSmartSearch query="fire" index={sampleIndex} format={undefined} onFilter={jest.fn()} onPick={jest.fn()} />);
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Fire")).toBeInTheDocument();
  });

  it("renders Moves category when format defined", () => {
    render(<SpeciesSmartSearch query="tail" index={sampleIndex} format={{ id: "x" } as never} onFilter={jest.fn()} onPick={jest.fn()} />);
    expect(screen.getByText("Moves")).toBeInTheDocument();
    expect(screen.getByText("Tailwind")).toBeInTheDocument();
  });

  it("renders Abilities category from index walk", () => {
    render(<SpeciesSmartSearch query="blaze" index={sampleIndex} format={undefined} onFilter={jest.fn()} onPick={jest.fn()} />);
    expect(screen.getByText("Abilities")).toBeInTheDocument();
    expect(screen.getByText("Blaze")).toBeInTheDocument();
  });

  it("renders Pokémon category with Select buttons", () => {
    render(<SpeciesSmartSearch query="char" index={sampleIndex} format={undefined} onFilter={jest.fn()} onPick={jest.fn()} />);
    expect(screen.getByText("Pokémon")).toBeInTheDocument();
    expect(screen.getByText("Charizard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select/i })).toBeInTheDocument();
  });

  it("clicking Filter on a type calls onFilter with type", async () => {
    const user = userEvent.setup();
    const onFilter = jest.fn();
    render(<SpeciesSmartSearch query="fire" index={sampleIndex} format={undefined} onFilter={onFilter} onPick={jest.fn()} />);
    const filterBtns = screen.getAllByRole("button", { name: /filter/i });
    await user.click(filterBtns[0]!);
    expect(onFilter).toHaveBeenCalledWith({ type: "Fire" });
  });

  it("clicking Select on a species calls onPick", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    render(<SpeciesSmartSearch query="char" index={sampleIndex} format={undefined} onFilter={jest.fn()} onPick={onPick} />);
    await user.click(screen.getByRole("button", { name: /select/i }));
    expect(onPick).toHaveBeenCalledWith("Charizard");
  });

  it("renders empty state when nothing matches", () => {
    render(<SpeciesSmartSearch query="zzzzz" index={sampleIndex} format={undefined} onFilter={jest.fn()} onPick={jest.fn()} />);
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it("omits Moves category when no format", () => {
    render(<SpeciesSmartSearch query="tail" index={sampleIndex} format={undefined} onFilter={jest.fn()} onPick={jest.fn()} />);
    expect(screen.queryByText("Moves")).not.toBeInTheDocument();
    expect(screen.queryByText("Tailwind")).not.toBeInTheDocument();
  });
});
