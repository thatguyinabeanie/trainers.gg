import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  type SpeciesUsagePeriod,
  type SpeciesTeammatesResult,
} from "@trainers/supabase";

import { fetchSpeciesUsageDetail } from "@/actions/usage";

import { SpeciesDrilldown } from "../species-drilldown";

// Stub the drill-down chart components — they render real recharts
// (ResponsiveContainer needs ResizeObserver, absent in JSDOM). Each has its own
// dedicated test; this test only covers the shell's wiring + data routing.
jest.mock("../species-fingerprint", () => ({
  SpeciesFingerprint: () => <div data-testid="species-fingerprint" />,
}));
jest.mock("../species-move-combos", () => ({
  SpeciesMoveCombos: () => <div data-testid="species-move-combos" />,
}));
jest.mock("../species-timeline", () => ({
  SpeciesTimeline: () => <div data-testid="species-timeline" />,
}));
jest.mock("../species-teammate-constellation", () => ({
  SpeciesTeammateConstellation: () => (
    <div data-testid="species-teammate-constellation" />
  ),
}));
jest.mock("../species-teammate-heatmap", () => ({
  SpeciesTeammateHeatmap: () => <div data-testid="species-teammate-heatmap" />,
}));

// =============================================================================
// next/navigation
// =============================================================================

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// =============================================================================
// Server action stubs — prevent real fetch
// =============================================================================

jest.mock("@/actions/usage", () => ({
  fetchSpeciesUsageDetail: jest
    .fn()
    .mockResolvedValue({ success: true, data: [] }),
  fetchSpeciesMoveCombos: jest
    .fn()
    .mockResolvedValue({ success: true, data: [] }),
  fetchSpeciesTeammates: jest.fn().mockResolvedValue({
    success: true,
    data: {
      focalPlayers: 0,
      teammates: [],
      matrix: { order: [], cells: {} },
    },
  }),
  fetchFormatEvents: jest.fn().mockResolvedValue({ success: true, data: [] }),
  fetchFormatUsage: jest.fn().mockResolvedValue({ success: true, data: [] }),
}));

// =============================================================================
// @trainers/pokemon — minimal stubs
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  isChampionsFormatId: (id: string) => id.startsWith("gen9champions"),
  getFormatLabel: (id: string) => `Format:${id}`,
  getFormatById: (id: string) =>
    id === "gen9championsvgc2026regma"
      ? { id, label: "Champions M-A" }
      : undefined,
  getSpeciesTypes: () => ["Ice", "Psychic"],
}));

// @pkmn/dex — used inside speciesList query fn
jest.mock("@pkmn/dex", () => ({
  Dex: {
    species: {
      get: (slug: string) => ({
        exists: true,
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
      }),
    },
  },
}));

// =============================================================================
// @trainers/pokemon/sprites
// =============================================================================

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: () => ({
    url: "https://example.com/sprite.png",
    w: 96,
    h: 96,
    pixelated: true,
  }),
}));

// =============================================================================
// Suppress next/image + Breadcrumb noise in JSDOM
// =============================================================================

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

// =============================================================================
// Helpers
// =============================================================================

function makeDetailBucket(
  periodStart: string,
  usagePct: number
): SpeciesUsagePeriod {
  return {
    periodStart,
    periodEnd: periodStart,
    usagePct,
    rank: 1,
    sampleSize: 200,
    usageChange7d: 1.5,
    usageChange30d: -0.5,
    moves: [],
    tera: [],
    items: [],
    abilities: [],
    natures: [],
    abilityItems: [],
  };
}

const EMPTY_TEAMMATES: SpeciesTeammatesResult = {
  focalPlayers: 0,
  teammates: [],
  matrix: { order: [], cells: {} },
};

const DEFAULT_FILTERS = {
  format: "gen9championsvgc2026regma",
  source: "all" as const,
  periodType: "week" as const,
  minPlayers: 100,
  rangeStart: null,
  rangeEnd: null,
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function renderDrilldown(
  overrides?: Partial<React.ComponentProps<typeof SpeciesDrilldown>>
) {
  const props: React.ComponentProps<typeof SpeciesDrilldown> = {
    species: "calyrex-ice-rider",
    displayName: "Calyrex-Ice-Rider",
    hasData: true,
    isChampions: true,
    initialFilters: DEFAULT_FILTERS,
    initialDetail: [makeDetailBucket("2025-01-01", 48.2)],
    initialCombos: [],
    initialTeammates: EMPTY_TEAMMATES,
    initialEvents: [],
    initialSpeciesList: [
      { slug: "calyrex-ice-rider", name: "Calyrex-Ice-Rider" },
      { slug: "koraidon", name: "Koraidon" },
    ],
    ...overrides,
  };

  return render(<SpeciesDrilldown {...props} />, { wrapper: makeWrapper() });
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  mockSearchParams = new URLSearchParams();
  mockPush.mockClear();
  mockReplace.mockClear();
});

describe("SpeciesDrilldown — smoke render", () => {
  it("renders the display name in the hero h1", () => {
    renderDrilldown();
    // The h1 is the primary display name; breadcrumb also renders it.
    expect(
      screen.getByRole("heading", { level: 1, name: "Calyrex-Ice-Rider" })
    ).toBeInTheDocument();
  });

  it("renders headline usage stat when data is present", () => {
    renderDrilldown();
    // latestDetail.usagePct = 48.2 → shows "48.2% usage"
    expect(screen.getByText(/48\.2%\s*usage/i)).toBeInTheDocument();
  });

  it("mounts all five drill-down chart components", () => {
    renderDrilldown();
    // Chart components are stubbed (see top-of-file mocks) — assert each mounts.
    expect(screen.getByTestId("species-fingerprint")).toBeInTheDocument();
    expect(screen.getByTestId("species-move-combos")).toBeInTheDocument();
    expect(screen.getByTestId("species-timeline")).toBeInTheDocument();
    expect(
      screen.getByTestId("species-teammate-constellation")
    ).toBeInTheDocument();
    expect(screen.getByTestId("species-teammate-heatmap")).toBeInTheDocument();
  });

  it("does not contain the phrase 'top cut'", () => {
    const { container } = renderDrilldown();
    expect(container.textContent).not.toMatch(/top cut/i);
  });
});

describe("SpeciesDrilldown — empty state", () => {
  it("shows the empty state message when hasData=false and detail is empty", () => {
    renderDrilldown({ hasData: false, initialDetail: [] });
    // EmptyState renders the title in an h3; variant="minimal" renders a <p>
    // Multiple elements may contain the word; just verify the container has the text.
    expect(screen.getAllByText(/No usage data for/i).length).toBeGreaterThan(0);
  });

  it("does not render the chart components in the empty state", () => {
    renderDrilldown({ hasData: false, initialDetail: [] });
    expect(screen.queryByTestId("species-fingerprint")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("species-teammate-heatmap")
    ).not.toBeInTheDocument();
  });

  it("still renders the hero h1 in the empty state", () => {
    renderDrilldown({ hasData: false, initialDetail: [] });
    expect(
      screen.getByRole("heading", { level: 1, name: "Calyrex-Ice-Rider" })
    ).toBeInTheDocument();
  });
});

describe("SpeciesDrilldown — species switcher", () => {
  it("renders the species switcher combobox", () => {
    renderDrilldown();
    // The combobox input renders with a placeholder
    expect(screen.getByPlaceholderText(/Switch Pokémon/i)).toBeInTheDocument();
  });
});

describe("SpeciesDrilldown — error state", () => {
  it("shows an error alert when the detail query fails after a filter change", async () => {
    // Override the mock to return failure
    (fetchSpeciesUsageDetail as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: "Supabase is down",
    });

    // Use a non-default source so keyMatchesInitial is false → no initialData →
    // the queryFn fires immediately and picks up the failure mock. (A bogus
    // format would just coerce back to the default and still match.)
    mockSearchParams = new URLSearchParams("source=rk9");

    renderDrilldown({ initialDetail: [] });

    // Wait for the query to settle in error state and the Alert to appear.
    await waitFor(() => {
      expect(
        screen.getByText(/failed to load usage data/i)
      ).toBeInTheDocument();
    });
  });
});
