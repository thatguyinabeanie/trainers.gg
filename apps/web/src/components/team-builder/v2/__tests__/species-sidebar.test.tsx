"use client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Fire", "Water", "Grass"],
  isChampionsFormat: jest.fn(
    (f: { id?: string } | undefined) => f?.id === "championsvgc2026regma"
  ),
  getAllLegalAbilities: jest.fn(() => ["Drought", "Drizzle", "Intimidate"]),
  getAllLegalMoves: jest.fn(() => ["Tailwind", "Trick Room", "Follow Me"]),
  calculateTeamSynergy: jest.fn(() => null),
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getShowdownTypeIconUrl: jest.fn(
    (type: string) => `https://example.com/sprites/${type}.png`
  ),
}));

import { SpeciesSidebar } from "../pickers/species-sidebar";
import { DEFAULT_SPECIES_FILTERS } from "../pickers/species-filter-state";

const championsFormat = { id: "championsvgc2026regma" } as never;

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
  it("renders type chips (Showdown icon buttons labelled by type)", () => {
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

  it("Clear all resets filters", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      filters: {
        ...DEFAULT_SPECIES_FILTERS,
        types: ["Fire"],
        roles: ["spread"],
      },
      onFiltersChange: onChange,
    });
    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_SPECIES_FILTERS);
  });

  it("ability section renders a typeahead input when no ability is set", () => {
    renderSidebar({ format: { id: "gen9vgc2026regg" } as never });
    expect(
      screen.getByPlaceholderText(/type or click an ability/i)
    ).toBeInTheDocument();
  });

  it("ability section renders the active ability as a removable chip", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      filters: { ...DEFAULT_SPECIES_FILTERS, ability: "Drought" },
      onFiltersChange: onChange,
    });
    const chip = screen.getByRole("button", { name: /clear drought/i });
    expect(chip).toHaveTextContent("Drought");
    await user.click(chip);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ ability: null })
    );
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

  it("ability Enter with a matching suggestion commits the matched value", async () => {
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
      expect.objectContaining({ ability: "Drought" })
    );
  });
});
