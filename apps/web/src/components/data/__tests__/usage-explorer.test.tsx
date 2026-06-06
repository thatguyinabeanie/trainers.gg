import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { UsageExplorer } from "../usage-explorer";
import { type UsageFilters } from "../usage-controls";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/actions/usage", () => ({
  fetchFormatUsageTimeseries: jest
    .fn()
    .mockResolvedValue({ success: true, data: [] }),
  fetchPipelineData: jest.fn().mockResolvedValue({ success: true, data: null }),
  fetchFormatEvents: jest.fn().mockResolvedValue({ success: true, data: [] }),
}));

jest.mock("@trainers/pokemon", () => ({
  getActiveFormats: () => [
    { id: "gen9vgc2025regg", label: "VGC 2025 Reg G", isChampions: false },
  ],
  getFormatById: (id: string) => ({ id }),
}));

// Stub the charts to avoid Recharts / SVG layout complexity in JSDOM.
jest.mock("../usage-pipeline-chart", () => ({
  UsagePipelineChart: () => <div data-testid="usage-pipeline-chart" />,
}));
jest.mock("../usage-line-chart", () => ({
  UsageLineChart: () => <div data-testid="usage-line-chart" />,
}));

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
  threshold: 2,
};

function renderExplorer() {
  const Wrapper = makeWrapper();
  return render(
    <Wrapper>
      <UsageExplorer
        initialPoints={[]}
        initialPipelineResult={null}
        initialEvents={[]}
        initialFilters={DEFAULT_FILTERS}
      />
    </Wrapper>
  );
}

describe("UsageExplorer", () => {
  it("renders without crashing", () => {
    renderExplorer();
    expect(screen.getByText("Meta Pipeline")).toBeInTheDocument();
  });

  it("renders both chart panels", () => {
    renderExplorer();
    expect(screen.getByTestId("usage-pipeline-chart")).toBeInTheDocument();
    expect(screen.getByTestId("usage-line-chart")).toBeInTheDocument();
  });

  it("renders the controls with the search input", () => {
    renderExplorer();
    expect(screen.getByPlaceholderText("Search Pokémon...")).toBeInTheDocument();
  });
});
