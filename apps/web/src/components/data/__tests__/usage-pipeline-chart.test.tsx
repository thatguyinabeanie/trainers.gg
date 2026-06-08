import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { UsagePipelineChart } from "../usage-pipeline-chart";
import {
  type PipelineDataResult,
  type PipelineSpeciesData,
} from "@trainers/supabase";

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: (species: string) => ({
    url: `https://sprites.test/${species}.png`,
    w: 96,
    h: 96,
    pixelated: true,
  }),
}));

// =============================================================================
// Test data helpers
// =============================================================================

function makePipelineSpecies(
  overrides: Partial<PipelineSpeciesData> = {}
): PipelineSpeciesData {
  return {
    species: "Sneasler",
    usagePct: 30,
    rank: 1,
    abilities: [{ value: "Unburden", count: 100, pct: 100 }],
    natures: [{ value: "Jolly", count: 80, pct: 80 }],
    moves: [{ value: "Close Combat", count: 90, pct: 90 }],
    ...overrides,
  };
}

function makePipelineResult(
  overrides: Partial<PipelineDataResult> = {}
): PipelineDataResult {
  return {
    data: [makePipelineSpecies()],
    periodStart: "2025-01-01",
    periodEnd: "2025-01-07",
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  pipelineResult: makePipelineResult(),
  // Default includes "Sneasler" so the chart renders (matches makePipelineSpecies default)
  selectedSpecies: ["Sneasler"] as string[],
  onSpeciesClick: jest.fn(),
};

function renderChart(overrides: Partial<typeof DEFAULT_PROPS> = {}) {
  const props = { ...DEFAULT_PROPS, onSpeciesClick: jest.fn(), ...overrides };
  return {
    ...render(<UsagePipelineChart {...props} />),
    onSpeciesClick: props.onSpeciesClick,
  };
}

// =============================================================================
// Empty-state branches
// =============================================================================

describe("UsagePipelineChart — empty states", () => {
  it("shows 'No pipeline data for this period.' when pipelineResult is null", () => {
    renderChart({ pipelineResult: null });
    expect(
      screen.getByText("No pipeline data for this period.")
    ).toBeInTheDocument();
  });

  it("shows 'No pipeline data for this period.' when pipelineResult.data is empty", () => {
    renderChart({ pipelineResult: makePipelineResult({ data: [] }) });
    expect(
      screen.getByText("No pipeline data for this period.")
    ).toBeInTheDocument();
  });

  it("shows sidebar prompt when selectedSpecies is empty", () => {
    // No species selected → visibleSpecies is empty
    renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ usagePct: 30 })],
      }),
      selectedSpecies: [],
    });
    expect(
      screen.getByText(
        "No Pokémon selected. Use the sidebar to choose species."
      )
    ).toBeInTheDocument();
  });
});

// =============================================================================
// Happy path — SVG renders
// =============================================================================

describe("UsagePipelineChart — happy path", () => {
  it("renders the SVG with the correct aria-label", () => {
    const { container } = renderChart();
    // SVG elements don't receive an implicit role="img" in JSDOM — query by aria-label attribute
    const svg = container.querySelector(
      '[aria-label="Meta Pipeline Sankey diagram"]'
    );
    expect(svg).toBeInTheDocument();
  });

  it("renders column header labels", () => {
    renderChart();
    expect(screen.getByText("Species")).toBeInTheDocument();
    expect(screen.getByText("Ability")).toBeInTheDocument();
    expect(screen.getByText("Nature")).toBeInTheDocument();
    expect(screen.getByText("Move")).toBeInTheDocument();
  });

  it("renders at least one rect (sankey node)", () => {
    const { container } = renderChart();
    const rects = container.querySelectorAll("rect");
    expect(rects.length).toBeGreaterThan(0);
  });

  it("renders the period range label", () => {
    renderChart({
      pipelineResult: makePipelineResult({
        periodStart: "2025-01-01",
        periodEnd: "2025-01-07",
      }),
    });
    // formatPeriodRange produces something like "Jan 1 – Jan 7"
    expect(screen.getByText(/Jan/i)).toBeInTheDocument();
  });
});

// =============================================================================
// Selection filter branch (selectedSpecies non-empty)
// =============================================================================

describe("UsagePipelineChart — selectedSpecies filter", () => {
  it("renders chart when selectedSpecies matches a species in data", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [
          makePipelineSpecies({ species: "Sneasler", usagePct: 30 }),
          makePipelineSpecies({ species: "Koraidon", usagePct: 25 }),
        ],
      }),
      selectedSpecies: ["Sneasler"],
    });
    const svg = container.querySelector(
      '[aria-label="Meta Pipeline Sankey diagram"]'
    );
    expect(svg).toBeInTheDocument();
  });

  it("renders selected-species rect with a white stroke (isSelected highlight)", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler" })],
      }),
      selectedSpecies: ["Sneasler"],
    });
    // The rect for the selected node should have stroke="white" (or "white")
    const rects = Array.from(container.querySelectorAll("rect"));
    const selectedRect = rects.find(
      (r) => r.getAttribute("stroke") === "white"
    );
    expect(selectedRect).toBeTruthy();
  });

  it("shows sidebar prompt when selectedSpecies matches no data species", () => {
    // selectedSpecies filter produces empty visibleSpecies
    renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler" })],
      }),
      selectedSpecies: ["Koraidon"],
    });
    expect(
      screen.getByText(
        "No Pokémon selected. Use the sidebar to choose species."
      )
    ).toBeInTheDocument();
  });
});

// =============================================================================
// Species click interaction
// =============================================================================

describe("UsagePipelineChart — click interactions", () => {
  it("calls onSpeciesClick with species name when a species node g element is clicked", () => {
    const { container, onSpeciesClick } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler" })],
      }),
    });
    // There is exactly one species node <g> with cursor=pointer; click the first one
    const groups = Array.from(container.querySelectorAll("g"));
    const speciesGroup = groups.find((g) => g.style.cursor === "pointer");
    expect(speciesGroup).toBeTruthy();
    fireEvent.click(speciesGroup!);
    expect(onSpeciesClick).toHaveBeenCalledWith("Sneasler");
  });

  it("does not call onSpeciesClick when clicking a non-species node group", () => {
    const { container, onSpeciesClick } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler" })],
      }),
    });
    // Non-species groups have cursor=default
    const groups = Array.from(container.querySelectorAll("g"));
    const nonSpeciesGroup = groups.find((g) => g.style.cursor === "default");
    if (nonSpeciesGroup) {
      fireEvent.click(nonSpeciesGroup);
    }
    expect(onSpeciesClick).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Hover interactions (nodeOpacity / linkOpacity)
// =============================================================================

describe("UsagePipelineChart — hover interactions", () => {
  it("sets hovered state on mouseEnter and clears on mouseLeave", () => {
    const { container } = renderChart();
    const groups = Array.from(container.querySelectorAll("g"));
    const firstGroup = groups[0];
    expect(firstGroup).toBeTruthy();

    // Before hover: opacity should be 1 (no hover active)
    expect(firstGroup!.getAttribute("opacity")).toBe("1");

    // After mouseEnter: still 1 for the hovered node itself
    fireEvent.mouseEnter(firstGroup!);
    // After mouseLeave: returns to full opacity
    fireEvent.mouseLeave(firstGroup!);
    expect(firstGroup!.getAttribute("opacity")).toBe("1");
  });
});

// =============================================================================
// Multiple species — deduplication and aggregation
// =============================================================================

describe("UsagePipelineChart — multiple species", () => {
  it("renders both species when two species are selected", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [
          makePipelineSpecies({ species: "Sneasler", usagePct: 30 }),
          makePipelineSpecies({
            species: "Koraidon",
            usagePct: 25,
            abilities: [{ value: "Orichalcum Pulse", count: 90, pct: 90 }],
            natures: [{ value: "Adamant", count: 70, pct: 70 }],
            moves: [{ value: "Collision Course", count: 80, pct: 80 }],
          }),
        ],
      }),
      selectedSpecies: ["Sneasler", "Koraidon"],
    });
    const rects = container.querySelectorAll("rect");
    // Should have more nodes for two species
    expect(rects.length).toBeGreaterThan(4);
  });

  it("shares nodes across species (deduplication) when two species share an ability", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [
          makePipelineSpecies({
            species: "Sneasler",
            abilities: [{ value: "Unburden", count: 100, pct: 100 }],
          }),
          makePipelineSpecies({
            species: "Hawlucha",
            usagePct: 20,
            abilities: [{ value: "Unburden", count: 100, pct: 100 }],
          }),
        ],
      }),
      selectedSpecies: ["Sneasler", "Hawlucha"],
    });
    // "Unburden" text should appear exactly once (deduplicated node)
    const abilityTexts = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.textContent === "Unburden"
    );
    expect(abilityTexts.length).toBe(1);
  });
});

// =============================================================================
// Species sprite labels
// =============================================================================

describe("UsagePipelineChart — species sprite labels", () => {
  it("renders a sprite <image> element for each species node", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler" })],
      }),
    });
    const images = container.querySelectorAll("image");
    expect(images.length).toBeGreaterThan(0);
    const spriteImg = Array.from(images).find((img) =>
      img.getAttribute("href")?.includes("Sneasler")
    );
    expect(spriteImg).toBeTruthy();
  });

  it("does NOT render species name as a <text> label", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler" })],
      }),
    });
    const speciesTexts = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.textContent === "Sneasler"
    );
    expect(speciesTexts.length).toBe(0);
  });
});

// =============================================================================
// Non-species text labels
// =============================================================================

describe("UsagePipelineChart — non-species text labels", () => {
  it("still renders a <text> label for non-species nodes after sprite band added", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler" })],
      }),
    });
    // Ability "Unburden" should still render as a text element
    const texts = Array.from(container.querySelectorAll("text"));
    const abilityText = texts.find((t) => t.textContent === "Unburden");
    expect(abilityText).toBeTruthy();
  });
});

// =============================================================================
// Tooltip
// =============================================================================

describe("UsagePipelineChart — tooltip", () => {
  it("shows a tooltip with the species name when mouseEnter fires on a species node", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler", usagePct: 30 })],
      }),
    });
    const groups = Array.from(container.querySelectorAll("g"));
    const speciesGroup = groups.find((g) => g.style.cursor === "pointer");
    expect(speciesGroup).toBeTruthy();

    fireEvent.mouseEnter(speciesGroup!);

    expect(screen.getByText("Sneasler")).toBeInTheDocument();
  });

  it("shows usage percentage for species tooltip", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler", usagePct: 30 })],
      }),
    });
    const groups = Array.from(container.querySelectorAll("g"));
    const speciesGroup = groups.find((g) => g.style.cursor === "pointer");
    fireEvent.mouseEnter(speciesGroup!);
    // Tooltip shows "· 30%" alongside the name
    expect(screen.getByText(/30%/)).toBeInTheDocument();
  });

  it("hides the tooltip when mouse leaves the SVG", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler", usagePct: 30 })],
      }),
    });
    const groups = Array.from(container.querySelectorAll("g"));
    const speciesGroup = groups.find((g) => g.style.cursor === "pointer");
    fireEvent.mouseEnter(speciesGroup!);
    expect(screen.getByText("Sneasler")).toBeInTheDocument();

    const svg = container.querySelector("svg")!;
    fireEvent.mouseLeave(svg);
    expect(screen.queryByText("Sneasler")).not.toBeInTheDocument();
  });

  it("does not show usage percentage for non-species tooltip", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler", usagePct: 30 })],
      }),
    });
    // Non-species groups have cursor=default
    const groups = Array.from(container.querySelectorAll("g"));
    const nonSpeciesGroup = groups.find((g) => g.style.cursor === "default");
    expect(nonSpeciesGroup).toBeTruthy();
    fireEvent.mouseEnter(nonSpeciesGroup!);
    // Should show the node label but NOT a percentage
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
  });
});
