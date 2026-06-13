import React from "react";
import { render, screen } from "@testing-library/react";

import { type PipelineDataResult, type ConversionRow } from "@trainers/supabase";

import { DataSummaryHeader } from "../data-summary-header";

// =============================================================================
// @trainers/pokemon stub — getFormatLabel is the only symbol used
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getFormatLabel: (id: string) => `Format: ${id}`,
}));

// =============================================================================
// Helpers
// =============================================================================

function makePipelineResult(count: number = 3): PipelineDataResult {
  return {
    data: Array.from({ length: count }, (_, i) => ({
      species: `pokemon-${i}`,
      usagePct: 10 - i,
      rank: i + 1,
      usageChange7d: null,
    })),
    periodStart: "2026-01-06",
    periodEnd: "2026-01-12",
  };
}

function makeConversionRows(
  species: string,
  players: number,
  usagePct: number
): ConversionRow {
  return {
    species,
    players,
    usagePct,
    topPlayers: Math.round(players * 0.1),
    topField: 100,
    topSharePct: 50,
    conversionPct: 25,
    rankedPlayers: Math.round(players * 0.5),
  };
}

// =============================================================================
// Rendering — null pipelineResult (loading / no data state)
// =============================================================================

describe("DataSummaryHeader — null pipelineResult", () => {
  it("renders the format label when pipelineResult is null", () => {
    render(
      <DataSummaryHeader
        format="gen9vgc2025regg"
        pipelineResult={null}
        conversionRows={[]}
      />
    );
    expect(screen.getByText("Format: gen9vgc2025regg")).toBeInTheDocument();
  });

  it("does not render Species or Period when pipelineResult is null", () => {
    render(
      <DataSummaryHeader
        format="gen9vgc2025regg"
        pipelineResult={null}
        conversionRows={[]}
      />
    );
    expect(screen.queryByText("Species")).not.toBeInTheDocument();
    expect(screen.queryByText("Period")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Rendering — with pipelineResult
// =============================================================================

describe("DataSummaryHeader — with pipelineResult", () => {
  it("renders the species count chip", () => {
    const pipeline = makePipelineResult(7);
    render(
      <DataSummaryHeader
        format="gen9vgc2025regg"
        pipelineResult={pipeline}
        conversionRows={[]}
      />
    );
    expect(screen.getByText("Species")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders the period chip when periodStart and periodEnd are set", () => {
    const pipeline = makePipelineResult(3);
    render(
      <DataSummaryHeader
        format="gen9vgc2025regg"
        pipelineResult={pipeline}
        conversionRows={[]}
      />
    );
    expect(screen.getByText("Period")).toBeInTheDocument();
    // The formatted date should appear; "Jan" is present in both dates.
    expect(screen.getByText(/Jan/)).toBeInTheDocument();
  });

  it("renders estimated players chip when a valid conversion row is present", () => {
    // usagePct=50, players=500 → N = 500 / (50/100) = 1000
    const conversionRows = [makeConversionRows("Koraidon", 500, 50)];
    const pipeline = makePipelineResult(3);

    render(
      <DataSummaryHeader
        format="gen9vgc2025regg"
        pipelineResult={pipeline}
        conversionRows={conversionRows}
      />
    );
    expect(screen.getByText("Players")).toBeInTheDocument();
    // ~1,000 estimated players
    expect(screen.getByText(/~1,000/)).toBeInTheDocument();
  });

  it("omits the players chip when conversionRows is empty", () => {
    const pipeline = makePipelineResult(3);

    render(
      <DataSummaryHeader
        format="gen9vgc2025regg"
        pipelineResult={pipeline}
        conversionRows={[]}
      />
    );
    expect(screen.queryByText("Players")).not.toBeInTheDocument();
  });

  it("omits the players chip when usagePct is 0 (divide-by-zero guard)", () => {
    const conversionRows = [makeConversionRows("Koraidon", 500, 0)];
    const pipeline = makePipelineResult(3);

    render(
      <DataSummaryHeader
        format="gen9vgc2025regg"
        pipelineResult={pipeline}
        conversionRows={conversionRows}
      />
    );
    expect(screen.queryByText("Players")).not.toBeInTheDocument();
  });

  it("adds aria-label to the summary container", () => {
    const pipeline = makePipelineResult(3);
    render(
      <DataSummaryHeader
        format="gen9vgc2025regg"
        pipelineResult={pipeline}
        conversionRows={[]}
      />
    );
    expect(screen.getByRole("generic", { name: /meta snapshot summary/i })).toBeInTheDocument();
  });
});

// =============================================================================
// estimateTotalPlayers — back-computation edge cases
// =============================================================================

describe("DataSummaryHeader — player estimation edge cases", () => {
  it("uses the row with the highest player count as the denominator", () => {
    // Row 1: 10 players, 10% → N = 100
    // Row 2: 200 players, 20% → N = 1000  ← higher players → used
    const conversionRows = [
      makeConversionRows("A", 10, 10),
      makeConversionRows("B", 200, 20),
    ];
    const pipeline = makePipelineResult(3);
    render(
      <DataSummaryHeader
        format="gen9vgc2025regg"
        pipelineResult={pipeline}
        conversionRows={conversionRows}
      />
    );
    expect(screen.getByText(/~1,000/)).toBeInTheDocument();
  });

  it("omits the players chip when usagePct > 100 (invalid data guard)", () => {
    const conversionRows = [makeConversionRows("A", 100, 150)];
    const pipeline = makePipelineResult(3);
    render(
      <DataSummaryHeader
        format="gen9vgc2025regg"
        pipelineResult={pipeline}
        conversionRows={conversionRows}
      />
    );
    expect(screen.queryByText("Players")).not.toBeInTheDocument();
  });
});

// =============================================================================
// className passthrough
// =============================================================================

describe("DataSummaryHeader — className passthrough", () => {
  it("applies the supplied className to the outer div", () => {
    const { container } = render(
      <DataSummaryHeader
        format="gen9vgc2025regg"
        pipelineResult={null}
        conversionRows={[]}
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
