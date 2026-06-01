"use client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Fire", "Water", "Grass"],
  isChampionsFormat: jest.fn(
    (f: { gameShort?: string } | undefined) => f?.gameShort === "Champions"
  ),
  getAllLegalAbilities: jest.fn(() => ["Drought", "Drizzle", "Intimidate"]),
  getAllLegalMoves: jest.fn(() => ["Tailwind", "Trick Room", "Follow Me"]),
  calculateTeamSynergy: jest.fn(() => null),
}));

import { SpeciesSidebar } from "../pickers/species-sidebar";
import { DEFAULT_SPECIES_FILTERS } from "../pickers/species-filter-state";

const championsFormat = { id: "gen9championsvgc2026regma", gameShort: "Champions" } as never;

function renderSidebar(overrides = {}) {
  return render(
    <SpeciesSidebar
      filters={DEFAULT_SPECIES_FILTERS}
      onFiltersChange={() => {}}
      format={undefined}
      currentTeam={[]}
      {...overrides}
    />
  );
}

describe("SpeciesSidebar", () => {
  it("renders type chips (TypeSymbolIcon buttons labelled by type)", () => {
    renderSidebar();
    expect(screen.getByRole("button", { name: "Fire" })).toBeInTheDocument();
  });

  it("clicking a type adds it to filters.types", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({ onFiltersChange: onChange });
    await user.click(screen.getByRole("button", { name: "Fire" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ types: ["Fire"] })
    );
  });

  it("Mega toggle hidden for non-Champions", () => {
    renderSidebar();
    expect(screen.queryByText("Mega only")).not.toBeInTheDocument();
  });

  it("Mega toggle visible for Champions", () => {
    renderSidebar({ format: championsFormat });
    expect(screen.getByText("Mega only")).toBeInTheDocument();
  });

  it("ability section always renders a typeahead input", () => {
    renderSidebar({ format: { id: "gen9vgc2026regg" } as never });
    expect(
      screen.getByPlaceholderText(/type or click an ability/i)
    ).toBeInTheDocument();
  });

  it("ability section renders selected abilities as removable chips", () => {
    renderSidebar({
      filters: { ...DEFAULT_SPECIES_FILTERS, abilities: ["Drought", "Drizzle"] },
    });
    expect(screen.getByRole("button", { name: "Drought" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drizzle" })).toBeInTheDocument();
  });

  it("clicking an ability chip removes it from the filter", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      filters: { ...DEFAULT_SPECIES_FILTERS, abilities: ["Drought"] },
      onFiltersChange: onChange,
    });
    await user.click(screen.getByRole("button", { name: "Drought" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ abilities: [] })
    );
  });

  it("placeholder changes to 'Add another ability' when abilities are already selected", () => {
    renderSidebar({
      format: { id: "gen9vgc2026regg" } as never,
      filters: { ...DEFAULT_SPECIES_FILTERS, abilities: ["Drought"] },
    });
    expect(
      screen.getByPlaceholderText(/add another ability/i)
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Move typeahead — Enter only commits on suggestion match
  // ---------------------------------------------------------------------------

  it("move Enter with no matching suggestion is a no-op", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      format: { id: "gen9vgc2026regg" } as never,
      onFiltersChange: onChange,
    });
    const input = screen.getByPlaceholderText(/type a move/i);
    await user.type(input, "xyzzz");
    await user.keyboard("{Enter}");
    // No suggestion matched "xyzzz" → handler early-returns without calling onChange
    expect(onChange).not.toHaveBeenCalled();
  });

  it("move Enter with a matching suggestion commits the matched value", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      format: { id: "gen9vgc2026regg" } as never,
      onFiltersChange: onChange,
    });
    const input = screen.getByPlaceholderText(/type a move/i);
    // "Tail" matches "Tailwind" (first in the mock list)
    await user.type(input, "Tail");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ moves: ["Tailwind"] })
    );
  });

  it("move typeahead excludes already-applied moves; Enter is a no-op", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      format: { id: "gen9vgc2026regg" } as never,
      filters: { ...DEFAULT_SPECIES_FILTERS, moves: ["Tailwind"] },
      onFiltersChange: onChange,
    });
    const input = screen.getByPlaceholderText(/type a move/i);
    // "Tail" would match "Tailwind", but Tailwind is already in filters.moves —
    // the suggestion list filters it out, so Enter has no first suggestion to commit.
    await user.type(input, "Tail");
    await user.keyboard("{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Ability typeahead — Enter only commits on suggestion match
  // ---------------------------------------------------------------------------

  it("ability Enter with no matching suggestion is a no-op", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      format: { id: "gen9vgc2026regg" } as never,
      onFiltersChange: onChange,
    });
    const input = screen.getByPlaceholderText(/type or click an ability/i);
    await user.type(input, "xyzzz");
    await user.keyboard("{Enter}");
    // No suggestion matched "xyzzz" → handler early-returns without calling onChange
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ability Enter with a matching suggestion adds the matched value to abilities array", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      format: { id: "gen9vgc2026regg" } as never,
      onFiltersChange: onChange,
    });
    const input = screen.getByPlaceholderText(/type or click an ability/i);
    // "Dro" matches "Drought" (first in the mock list after filter)
    await user.type(input, "Dro");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ abilities: ["Drought"] })
    );
  });
});
