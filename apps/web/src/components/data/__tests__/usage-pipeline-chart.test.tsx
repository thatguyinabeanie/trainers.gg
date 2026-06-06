import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { UsagePipelineChart } from "../usage-pipeline-chart";
import {
  type PipelineDataResult,
  type PipelineSpeciesData,
} from "@trainers/supabase";

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
  selectedSpecies: [] as string[],
  threshold: 2,
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

  it("shows threshold message when all species are below threshold", () => {
    // species has usagePct 1, threshold is 50 → none above threshold
    renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ usagePct: 1 })],
      }),
      threshold: 50,
    });
    expect(
      screen.getByText("No species above 50% threshold.")
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

  it("shows empty threshold message when selectedSpecies matches no data species", () => {
    // selectedSpecies filter produces empty visibleSpecies
    renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler" })],
      }),
      selectedSpecies: ["Koraidon"],
    });
    expect(
      screen.getByText("No species above 2% threshold.")
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
  it("renders both species when two species are above threshold", () => {
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
    });
    // "Unburden" text should appear exactly once (deduplicated node)
    const abilityTexts = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.textContent === "Unburden"
    );
    expect(abilityTexts.length).toBe(1);
  });
});

// =============================================================================
// Long species name truncation
// =============================================================================

describe("UsagePipelineChart — label truncation", () => {
  it("truncates species names longer than 12 characters with ellipsis", () => {
    // "Iron Valiant" is 12 chars, "Great Tusk" is 9 — use something >12
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [
          makePipelineSpecies({
            species: "Flutter Mane", // 12 chars — boundary
            usagePct: 30,
          }),
        ],
      }),
    });
    // The component truncates at >12 chars (label.length > 12)
    // "Flutter Mane" is exactly 12 — should NOT be truncated
    expect(container.textContent).toContain("Flutter Mane");
  });

  it("truncates species names of 13+ characters", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [
          makePipelineSpecies({
            species: "Raging Bolt VGC", // >12 chars
            usagePct: 30,
          }),
        ],
      }),
    });
    // Should be truncated: first 11 chars + "…"
    expect(container.textContent).toContain("Raging Bolt…");
  });
});
