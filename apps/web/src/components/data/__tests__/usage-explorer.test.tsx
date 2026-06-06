import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { UsageExplorer } from "../usage-explorer";
import { type UsageFilters } from "../usage-controls";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/actions/usage", () => ({
  fetchFormatUsageTimeseries: jest
    .fn()
    .mockResolvedValue({ success: true, data: [] }),
}));

jest.mock("@trainers/pokemon", () => ({
  getActiveFormats: () => [
    { id: "gen9vgc2025regg", label: "VGC 2025 Reg G", isChampions: false },
  ],
  getFormatById: (id: string) => ({ id }),
}));

// Stub the chart to avoid Recharts/canvas complexity
jest.mock("../usage-stream-chart", () => ({
  UsageStreamChart: () => <div data-testid="usage-stream-chart" />,
}));

// =============================================================================
// Helpers
// =============================================================================

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function makeWrapper() {
  const queryClient = makeQueryClient();
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
  threshold: 1,
};

// =============================================================================
// Tests
// =============================================================================

describe("UsageExplorer", () => {
  it("renders without crashing", () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <UsageExplorer initialPoints={[]} initialFilters={DEFAULT_FILTERS} />
      </Wrapper>
    );
    // The component mounted — spot-check a stable element from UsageControls
    expect(screen.getByText(/Highlight/i)).toBeInTheDocument();
  });

  it("renders the stream chart placeholder", () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <UsageExplorer initialPoints={[]} initialFilters={DEFAULT_FILTERS} />
      </Wrapper>
    );
    expect(screen.getByTestId("usage-stream-chart")).toBeInTheDocument();
  });

  it("renders the controls section with the highlight input", () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <UsageExplorer initialPoints={[]} initialFilters={DEFAULT_FILTERS} />
      </Wrapper>
    );
    expect(
      screen.getByPlaceholderText("Type a Pokemon...")
    ).toBeInTheDocument();
  });

  it("renders the usage legend paragraph", () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <UsageExplorer initialPoints={[]} initialFilters={DEFAULT_FILTERS} />
      </Wrapper>
    );
    // The informational paragraph below the chart
    expect(screen.getByText(/drag the slider/i)).toBeInTheDocument();
  });

  it("renders all three chart mode tabs from UsageControls", () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <UsageExplorer initialPoints={[]} initialFilters={DEFAULT_FILTERS} />
      </Wrapper>
    );
    expect(screen.getByRole("tab", { name: /Stream/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Stacked/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Lines/i })).toBeInTheDocument();
  });
});
