import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getLearnableMoves: jest.fn((species: string) => {
    const moves: Record<string, string[]> = {
      Incineroar: ["Fake Out", "Flare Blitz", "Darkest Lariat", "Taunt"],
      Rillaboom: ["Fake Out", "Drum Beating", "Tailwind", "U-turn"],
      Slowbro: ["Icy Wind", "Scald", "Trick Room", "Slack Off"],
      Rattata: ["Tackle", "Quick Attack"],
    };
    return moves[species] ?? [];
  }),
  getMoveType: jest.fn((move: string) => {
    const types: Record<string, string> = {
      "Fake Out": "Normal",
      "Flare Blitz": "Fire",
      "Darkest Lariat": "Dark",
      Tailwind: "Flying",
      "Trick Room": "Psychic",
      "Icy Wind": "Ice",
    };
    return types[move] ?? "Normal";
  }),
  getMoveCategory: jest.fn((move: string) => {
    const categories: Record<string, string> = {
      "Fake Out": "Physical",
      "Flare Blitz": "Physical",
      "Darkest Lariat": "Physical",
      Tailwind: "Status",
      "Trick Room": "Status",
      "Icy Wind": "Special",
    };
    return categories[move] ?? "Physical";
  }),
  getMoveBP: jest.fn((move: string) => {
    const bp: Record<string, number> = {
      "Fake Out": 40,
      "Flare Blitz": 120,
      "Darkest Lariat": 85,
      "Icy Wind": 55,
    };
    return bp[move] ?? null;
  }),
}));

// TeamFitAnalysis has its own complex logic — stub it out for these tests
jest.mock("../team-fit-analysis", () => ({
  TeamFitAnalysis: ({
    candidateSpecies,
  }: {
    currentTeam: Array<{ species: string }>;
    candidateSpecies: string;
  }) => (
    <div data-testid="team-fit-analysis">Team fit for {candidateSpecies}</div>
  ),
}));

import { SpeciesDetail } from "../species-detail";
import { type SpeciesSearchEntry } from "@trainers/pokemon";

// =============================================================================
// Factories
// =============================================================================

function makeSpecies(
  overrides: Partial<SpeciesSearchEntry> = {}
): SpeciesSearchEntry {
  return {
    species: "Incineroar",
    types: ["Fire", "Dark"],
    abilities: ["Intimidate", "Blaze"],
    baseStats: { hp: 95, atk: 115, def: 90, spa: 80, spd: 90, spe: 60 },
    bst: 530,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("SpeciesDetail", () => {
  describe("null species (empty state)", () => {
    it("renders the empty state prompt when species is null", () => {
      render(
        <SpeciesDetail species={null} currentTeam={[]} onSelect={jest.fn()} />
      );
      expect(
        screen.getByText("Select a species from the table to see details")
      ).toBeInTheDocument();
    });

    it("does not render action buttons when species is null", () => {
      render(
        <SpeciesDetail species={null} currentTeam={[]} onSelect={jest.fn()} />
      );
      expect(
        screen.queryByRole("button", { name: /select with defaults/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /select blank/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("species name and types", () => {
    it("renders the species name as a heading", () => {
      render(
        <SpeciesDetail
          species={makeSpecies()}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(
        screen.getByRole("heading", { name: "Incineroar" })
      ).toBeInTheDocument();
    });

    it("renders each type pill", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({ types: ["Fire", "Dark"] })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByText("Fire")).toBeInTheDocument();
      expect(screen.getByText("Dark")).toBeInTheDocument();
    });

    it("renders a single type for mono-type species", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({ species: "Rillaboom", types: ["Grass"] })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByText("Grass")).toBeInTheDocument();
    });
  });

  describe("base stats", () => {
    it("renders all six stat labels", () => {
      render(
        <SpeciesDetail
          species={makeSpecies()}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByText("HP")).toBeInTheDocument();
      expect(screen.getByText("Atk")).toBeInTheDocument();
      expect(screen.getByText("Def")).toBeInTheDocument();
      expect(screen.getByText("SpA")).toBeInTheDocument();
      expect(screen.getByText("SpD")).toBeInTheDocument();
      expect(screen.getByText("Spe")).toBeInTheDocument();
    });

    it("renders each stat value", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({
            baseStats: { hp: 95, atk: 115, def: 90, spa: 80, spd: 90, spe: 60 },
          })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByText("95")).toBeInTheDocument();
      expect(screen.getByText("115")).toBeInTheDocument();
      expect(screen.getByText("60")).toBeInTheDocument();
    });

    it("renders the BST value", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({ bst: 530 })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByText("BST")).toBeInTheDocument();
      expect(screen.getByText("530")).toBeInTheDocument();
    });
  });

  describe("abilities", () => {
    it("renders the Abilities section header", () => {
      render(
        <SpeciesDetail
          species={makeSpecies()}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByText("Abilities")).toBeInTheDocument();
    });

    it("renders each ability as a badge", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({ abilities: ["Intimidate", "Blaze"] })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByText("Intimidate")).toBeInTheDocument();
      expect(screen.getByText("Blaze")).toBeInTheDocument();
    });

    it("renders a hidden ability when present", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({
            abilities: ["Intimidate", "Blaze", "Unnerve"],
          })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByText("Unnerve")).toBeInTheDocument();
    });
  });

  describe("competitive moves section", () => {
    it("renders Key Moves section when species has competitive moves", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({ species: "Incineroar" })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByText("Key Moves")).toBeInTheDocument();
    });

    it("renders competitive move names", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({ species: "Incineroar" })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      // Incineroar mock returns: ["Fake Out", "Flare Blitz", "Darkest Lariat", "Taunt"]
      // Of those, COMPETITIVE_MOVES contains: "Fake Out" and "Taunt"
      expect(screen.getByText("Fake Out")).toBeInTheDocument();
      expect(screen.getByText("Taunt")).toBeInTheDocument();
    });

    it("renders move type for each competitive move", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({ species: "Incineroar" })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      // getMoveType returns "Normal" for Fake Out
      const normalLabels = screen.getAllByText("Normal");
      expect(normalLabels.length).toBeGreaterThan(0);
    });

    it("renders category label for physical moves as 'P'", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({ species: "Incineroar" })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      // Physical category renders as "P"
      const categoryLabels = screen.getAllByText("P");
      expect(categoryLabels.length).toBeGreaterThan(0);
    });

    it("renders category label for status moves as '—'", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({ species: "Rillaboom" })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      // Tailwind is Status, renders as "—"
      const dashLabels = screen.getAllByText("—");
      expect(dashLabels.length).toBeGreaterThan(0);
    });

    it("does not render Key Moves section when no competitive moves are learnable", () => {
      // Override getLearnableMoves to return moves NOT in COMPETITIVE_MOVES
      const pokemon = jest.requireMock("@trainers/pokemon") as {
        getLearnableMoves: jest.Mock;
      };
      pokemon.getLearnableMoves.mockReturnValueOnce(["Tackle", "Scratch"]);
      render(
        <SpeciesDetail
          species={makeSpecies({
            species: "Rattata",
            types: ["Normal"],
            abilities: ["Run Away"],
          })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(screen.queryByText("Key Moves")).not.toBeInTheDocument();
    });
  });

  describe("team fit analysis", () => {
    it("renders TeamFitAnalysis when currentTeam has members", () => {
      render(
        <SpeciesDetail
          species={makeSpecies()}
          currentTeam={[{ species: "Rillaboom" }]}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByTestId("team-fit-analysis")).toBeInTheDocument();
    });

    it("does not render TeamFitAnalysis when currentTeam is empty", () => {
      render(
        <SpeciesDetail
          species={makeSpecies()}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(screen.queryByTestId("team-fit-analysis")).not.toBeInTheDocument();
    });

    it("passes candidateSpecies to TeamFitAnalysis", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({ species: "Incineroar" })}
          currentTeam={[{ species: "Rillaboom" }]}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByText("Team fit for Incineroar")).toBeInTheDocument();
    });
  });

  describe("proven sets stub", () => {
    it("renders the placeholder text for proven sets", () => {
      render(
        <SpeciesDetail
          species={makeSpecies()}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(
        screen.getByText("Proven sets will appear here when data is available")
      ).toBeInTheDocument();
    });
  });

  describe("action buttons", () => {
    it("renders the 'Select with defaults' button", () => {
      render(
        <SpeciesDetail
          species={makeSpecies()}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(
        screen.getByRole("button", { name: /select with defaults/i })
      ).toBeInTheDocument();
    });

    it("renders the 'Select blank' button", () => {
      render(
        <SpeciesDetail
          species={makeSpecies()}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      expect(
        screen.getByRole("button", { name: /select blank/i })
      ).toBeInTheDocument();
    });

    it("calls onSelect with 'defaults' mode when 'Select with defaults' is clicked", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(
        <SpeciesDetail
          species={makeSpecies({ species: "Incineroar" })}
          currentTeam={[]}
          onSelect={onSelect}
        />
      );
      await user.click(
        screen.getByRole("button", { name: /select with defaults/i })
      );
      expect(onSelect).toHaveBeenCalledWith("Incineroar", "defaults");
    });

    it("calls onSelect with 'blank' mode when 'Select blank' is clicked", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(
        <SpeciesDetail
          species={makeSpecies({ species: "Incineroar" })}
          currentTeam={[]}
          onSelect={onSelect}
        />
      );
      await user.click(screen.getByRole("button", { name: /select blank/i }));
      expect(onSelect).toHaveBeenCalledWith("Incineroar", "blank");
    });

    it("passes the correct species name when multiple are rendered in sequence", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      const { rerender } = render(
        <SpeciesDetail
          species={makeSpecies({ species: "Incineroar" })}
          currentTeam={[]}
          onSelect={onSelect}
        />
      );
      rerender(
        <SpeciesDetail
          species={makeSpecies({ species: "Rillaboom", types: ["Grass"] })}
          currentTeam={[]}
          onSelect={onSelect}
        />
      );
      await user.click(
        screen.getByRole("button", { name: /select with defaults/i })
      );
      expect(onSelect).toHaveBeenCalledWith("Rillaboom", "defaults");
    });
  });

  describe("unknown type fallback", () => {
    it("renders with an unknown type without crashing (fallback class applied)", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({
            species: "Missingno",
            types: ["????" as "Normal"],
            abilities: ["Glitch"],
          })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      // The type pill falls back to "bg-muted text-foreground" — it still renders
      expect(screen.getByText("????")).toBeInTheDocument();
    });

    it("renders a move with an unknown type using the fallback color", () => {
      const pokemon = jest.requireMock("@trainers/pokemon") as {
        getMoveType: jest.Mock;
      };
      // getMoveType returns an unrecognized type for this call
      pokemon.getMoveType.mockReturnValueOnce("????");
      render(
        <SpeciesDetail
          species={makeSpecies({ species: "Incineroar" })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      // The move type badge renders with fallback styling — no crash
      expect(screen.getByText("Fake Out")).toBeInTheDocument();
    });
  });

  describe("stat coloring boundary conditions", () => {
    it("renders all stats for a species with high and low stat values", () => {
      render(
        <SpeciesDetail
          species={makeSpecies({
            baseStats: { hp: 125, atk: 55, def: 80, spa: 55, spd: 80, spe: 30 },
            bst: 425,
          })}
          currentTeam={[]}
          onSelect={jest.fn()}
        />
      );
      // High stat (>=120) gets emerald coloring — still renders correctly
      expect(screen.getByText("125")).toBeInTheDocument();
      // Low stat (<70) gets muted coloring — still renders
      expect(screen.getByText("30")).toBeInTheDocument();
    });
  });
});
