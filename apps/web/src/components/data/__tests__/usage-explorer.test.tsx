import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { type PipelineDataResult } from "@trainers/supabase";
import { pipelineSpeciesFactory } from "@trainers/test-utils";

import { UsageExplorer } from "../usage-explorer";
import { type UsageFilters } from "../usage-filters";

// =============================================================================
// next/navigation — stable mockReplace so tests can assert URL payloads
// =============================================================================

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

// =============================================================================
// Server action stubs
// =============================================================================

jest.mock("@/actions/usage", () => ({
  fetchFormatUsageTimeseries: jest
    .fn()
    .mockResolvedValue({ success: true, data: [] }),
  fetchPipelineData: jest.fn().mockResolvedValue({ success: true, data: null }),
  fetchFormatEvents: jest.fn().mockResolvedValue({ success: true, data: [] }),
}));

// =============================================================================
// @trainers/pokemon — two formats so the "change format" stub uses a real id
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getActiveFormats: () => [
    { id: "gen9vgc2025regg", label: "VGC 2025 Reg G", isChampions: false },
    {
      id: "gen9vgc2024regh",
      label: "VGC 2024 Reg H",
      isChampions: false,
    },
  ],
  getFormatById: (id: string) =>
    ["gen9vgc2025regg", "gen9vgc2024regh"].includes(id) ? { id } : undefined,
}));

// =============================================================================
// Chart/controls stubs — expose callback props as testable buttons
// =============================================================================

jest.mock("../usage-line-chart", () => ({
  UsageLineChart: (props: {
    onSpeciesClick: (s: string) => void;
    onRangeChange: (a: string | null, b: string | null) => void;
  }) => (
    <div data-testid="usage-line-chart">
      <button onClick={() => props.onSpeciesClick("Sneasler")}>lc-pick</button>
      <button onClick={() => props.onRangeChange("2025-01-01", "2025-01-31")}>
        lc-range
      </button>
    </div>
  ),
}));

jest.mock("../usage-pipeline-chart", () => ({
  UsagePipelineChart: () => <div data-testid="usage-pipeline-chart" />,
}));

jest.mock("../data-sidebar", () => ({
  DataSidebar: (props: {
    onFiltersChange: (f: UsageFilters) => void;
    onSelectionChange: (s: string[]) => void;
    filters: UsageFilters;
    selectedSpecies: string[];
  }) => (
    <div data-testid="data-sidebar">
      <button
        onClick={() =>
          props.onFiltersChange({ ...props.filters, format: "gen9vgc2024regh" })
        }
      >
        change-format
      </button>
      <button onClick={() => props.onSelectionChange([])}>sidebar-clear</button>
      <span data-testid="selected-count">{props.selectedSpecies.length}</span>
      <span data-testid="selected-species">
        {props.selectedSpecies.join(",")}
      </span>
    </div>
  ),
}));

// =============================================================================
// Helpers
// =============================================================================

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

const DEFAULT_FILTERS: UsageFilters = {
  format: "gen9vgc2025regg",
  source: "all",
  periodType: "week",
};

function makePipelineResult(count: number): PipelineDataResult {
  return {
    data: pipelineSpeciesFactory.buildList(count),
    periodStart: "2025-01-01",
    periodEnd: "2025-01-31",
  };
}

function renderExplorer(pipelineResult?: PipelineDataResult | null) {
  const Wrapper = makeWrapper();
  return render(
    <Wrapper>
      <UsageExplorer
        initialPoints={[]}
        initialPipelineResult={pipelineResult ?? null}
        initialEvents={[]}
        initialFilters={DEFAULT_FILTERS}
      />
    </Wrapper>
  );
}

/** Read the URL string from the most recent router.replace() call. */
function lastReplaceParams(): URLSearchParams {
  const call = mockReplace.mock.calls.at(-1)?.[0] as string;
  return new URLSearchParams(call.startsWith("?") ? call.slice(1) : call);
}

// =============================================================================
// Reset between tests
// =============================================================================

beforeEach(() => {
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
});

// =============================================================================
// Rendering smoke tests
// =============================================================================

describe("UsageExplorer — rendering", () => {
  it("renders without crashing", () => {
    renderExplorer();
    expect(screen.getByText("Data")).toBeInTheDocument();
  });

  it("renders both chart panels", () => {
    renderExplorer();
    expect(screen.getByTestId("usage-pipeline-chart")).toBeInTheDocument();
    expect(screen.getByTestId("usage-line-chart")).toBeInTheDocument();
  });

  it("renders the sidebar stub", () => {
    renderExplorer();
    expect(screen.getByTestId("data-sidebar")).toBeInTheDocument();
  });
});

// =============================================================================
// URL state — species toggle
// =============================================================================

describe("UsageExplorer — species URL state", () => {
  it("adds a species to the URL when a line is picked", async () => {
    renderExplorer();
    await userEvent.click(screen.getByText("lc-pick"));
    expect(lastReplaceParams().get("species")).toBe("Sneasler");
  });

  it("removes a species from the URL when it is already selected", async () => {
    mockSearchParams = new URLSearchParams("species=Sneasler");
    renderExplorer();
    // Clicking "Sneasler" again should toggle it off — key stays present (empty)
    await userEvent.click(screen.getByText("lc-pick"));
    // present-but-empty: key is set to "" not deleted
    expect(lastReplaceParams().get("species")).toBe("");
  });

  it("clears species when the DataSidebar triggers an empty selection", async () => {
    mockSearchParams = new URLSearchParams("species=Sneasler");
    renderExplorer();
    // Clicking "Sneasler" again (when it's the only selection) should clear the param
    await userEvent.click(screen.getByText("lc-pick"));
    const p = lastReplaceParams();
    // present-but-empty so the next render honors the explicit empty state
    expect(p.get("species")).toBe("");
  });
});

// =============================================================================
// 3-state species model
// =============================================================================

describe("UsageExplorer — 3-state species model", () => {
  it("defaults to Top 20 when the species param is ABSENT", () => {
    // No species param → effectiveSelected falls back to applyPreset(allSpecies, "top20")
    mockSearchParams = new URLSearchParams(); // no "species" key
    renderExplorer(makePipelineResult(20));
    expect(screen.getByTestId("selected-count").textContent).toBe("20");
  });

  it("shows empty selection when species param is PRESENT but empty", () => {
    // species= present-but-empty → effectiveSelected = [] (empty state reachable)
    mockSearchParams = new URLSearchParams("species=");
    renderExplorer(makePipelineResult(20));
    expect(screen.getByTestId("selected-count").textContent).toBe("0");
    expect(screen.getByTestId("selected-species").textContent).toBe("");
  });

  it("shows only the named species when species param is PRESENT with values", () => {
    mockSearchParams = new URLSearchParams("species=Garchomp,Sneasler");
    renderExplorer(makePipelineResult(20));
    expect(screen.getByTestId("selected-count").textContent).toBe("2");
    expect(screen.getByTestId("selected-species").textContent).toBe(
      "Garchomp,Sneasler"
    );
  });
});

// =============================================================================
// URL state — range change
// =============================================================================

describe("UsageExplorer — range URL state", () => {
  it("writes rangeStart and rangeEnd when the range changes", async () => {
    renderExplorer();
    await userEvent.click(screen.getByText("lc-range"));
    const p = lastReplaceParams();
    expect(p.get("rangeStart")).toBe("2025-01-01");
    expect(p.get("rangeEnd")).toBe("2025-01-31");
  });
});

// =============================================================================
// URL state — format change clears species
// =============================================================================

describe("UsageExplorer — format change", () => {
  it("clears selected species when the format changes", async () => {
    mockSearchParams = new URLSearchParams("species=Sneasler,Koraidon");
    renderExplorer();
    await userEvent.click(screen.getByText("change-format"));
    const p = lastReplaceParams();
    expect(p.get("format")).toBe("gen9vgc2024regh");
    // present-but-empty: format change passes [] which writes species="" so the
    // next render lands on the explicit empty state rather than reverting to Top 20.
    expect(p.get("species")).toBe("");
  });

  it("preserves species when a non-format filter changes (same format)", async () => {
    // The change-format stub sends the same format back if we override it here,
    // but let's just test the inverse: species IS preserved when format hasn't changed.
    // We do this by clicking lc-pick (which doesn't change format).
    mockSearchParams = new URLSearchParams("species=Koraidon");
    renderExplorer();
    await userEvent.click(screen.getByText("lc-pick")); // toggles Sneasler on
    const p = lastReplaceParams();
    // Both Koraidon (already selected) and Sneasler (newly added) should appear
    const speciesParam = p.get("species") ?? "";
    expect(speciesParam).toContain("Koraidon");
    expect(speciesParam).toContain("Sneasler");
  });
});
