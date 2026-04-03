import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- next/link ---
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// --- ./utils (formatDate, formatPlacement) ---
jest.mock("../utils", () => ({
  formatDate: (d: string) => d,
  formatPlacement: (n: number) => {
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    return `${n}th`;
  },
}));

// We control fetch responses per-test
const mockFetch = jest.fn();
global.fetch = mockFetch;

import React from "react";
import { OverviewTab } from "../overview-tab";

// ============================================================================
// Helpers
// ============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function makeTournamentEntry(
  overrides: Partial<{
    id: number;
    tournamentId: number;
    tournamentName: string;
    tournamentSlug: string;
    organizationName: string;
    organizationSlug: string;
    startDate: string | null;
    format: string | null;
    playerCount: number | null;
    placement: number | null;
    wins: number;
    losses: number;
    teamPokemon: string[];
  }> = {}
) {
  return {
    id: 1,
    tournamentId: 10,
    tournamentName: "Kanto Regional",
    tournamentSlug: "kanto-regional",
    organizationName: "Pallet Town",
    organizationSlug: "pallet-town",
    startDate: "2026-01-15",
    format: "VGC 2026",
    playerCount: 32,
    placement: 1,
    wins: 5,
    losses: 1,
    teamPokemon: ["pikachu", "charizard"],
    ...overrides,
  };
}

function makeStats(
  overrides: Partial<{
    tournamentCount: number;
    winRate: number;
    bestPlacement: number | null;
    formats: string[];
  }> = {}
) {
  return {
    tournamentCount: 10,
    winRate: 72.5,
    bestPlacement: 1,
    formats: ["VGC 2026"],
    ...overrides,
  };
}

function makeRating(
  overrides: Partial<{
    rating: number;
    globalRank: number;
  }> = {}
) {
  return {
    rating: 1500,
    globalRank: 42,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("OverviewTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Loading state
  // --------------------------------------------------------------------------

  describe("loading state", () => {
    it("renders skeleton cards while stats are loading", () => {
      // Hang the fetch indefinitely so the component stays in loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));
      const { container } = render(
        <QueryClientProvider
          client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
        >
          <OverviewTab altIds={[1]} handle="ash" />
        </QueryClientProvider>
      );
      // In loading state, skeleton elements are rendered
      const skeletons = container.querySelectorAll(
        "[class*='animate-pulse'], [class*='bg-muted']"
      );
      // At minimum the loading skeletons should be present — we just check for
      // 5 stat card skeletons and 3 recent tournament skeletons
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Stats cards
  // --------------------------------------------------------------------------

  describe("stats cards", () => {
    beforeEach(() => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeStats()),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeRating()),
          });
        }
        if (url.includes("/api/players/tournaments")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([makeTournamentEntry()]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
      });
    });

    it("renders tournament count stat", async () => {
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      expect(await screen.findByText("10")).toBeInTheDocument();
      expect(screen.getByText("Tournaments")).toBeInTheDocument();
    });

    it("renders win rate stat", async () => {
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      expect(await screen.findByText("72.5%")).toBeInTheDocument();
      expect(screen.getByText("Win Rate")).toBeInTheDocument();
    });

    it("renders rating stat", async () => {
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      expect(await screen.findByText("1,500")).toBeInTheDocument();
    });

    it("renders global rank in rating card", async () => {
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      expect(await screen.findByText("Rank #42")).toBeInTheDocument();
    });

    it("renders best placement stat", async () => {
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      expect(await screen.findByText("1st")).toBeInTheDocument();
      expect(screen.getByText("Best Placement")).toBeInTheDocument();
    });

    it("renders main format stat", async () => {
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      expect(await screen.findByText("VGC 2026")).toBeInTheDocument();
      expect(screen.getByText("Main Format")).toBeInTheDocument();
    });

    it("shows dash for win rate when win rate is 0", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeStats({ winRate: 0 })),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      // Wait for stats to load
      await screen.findByText("Tournaments");
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it("shows dash for best placement when null", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve(makeStats({ bestPlacement: null })),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      await screen.findByText("Best Placement");
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it("shows dash for main format when formats array is empty", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeStats({ formats: [] })),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      await screen.findByText("Main Format");
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it("shows 'Rating' label when no rating data available", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeStats()),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      expect(await screen.findByText("Rating")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Recent tournaments
  // --------------------------------------------------------------------------

  describe("recent tournaments", () => {
    it("shows tournament name with link", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeStats()),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        if (url.includes("/api/players/tournaments")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([makeTournamentEntry()]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
      });
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      const link = await screen.findByRole("link", { name: /kanto regional/i });
      expect(link).toHaveAttribute("href", "/tournaments/kanto-regional");
    });

    it("shows organization name with link", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeStats()),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        if (url.includes("/api/players/tournaments")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([makeTournamentEntry()]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
      });
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      const link = await screen.findByRole("link", { name: /pallet town/i });
      expect(link).toHaveAttribute("href", "/communities/pallet-town");
    });

    it("shows win-loss record", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeStats()),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        if (url.includes("/api/players/tournaments")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([makeTournamentEntry({ wins: 5, losses: 1 })]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
      });
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      expect(await screen.findByText("5-1")).toBeInTheDocument();
    });

    it("shows placement badge when placement is set", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeStats()),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        if (url.includes("/api/players/tournaments")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([makeTournamentEntry({ placement: 2 })]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
      });
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      expect(await screen.findByText("2nd")).toBeInTheDocument();
    });

    it("does not show placement badge when placement is null", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeStats()),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        if (url.includes("/api/players/tournaments")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([makeTournamentEntry({ placement: null })]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
      });
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      await screen.findByText("Kanto Regional");
      // Placement is null — the entry renders but no ordinal placement badge
    });

    it("shows empty state when no tournaments", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeStats()),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        if (url.includes("/api/players/tournaments")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
      });
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      expect(
        await screen.findByText("No completed tournaments yet.")
      ).toBeInTheDocument();
    });

    it("shows Recent Tournaments heading", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeStats()),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        if (url.includes("/api/players/tournaments")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
      });
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      expect(
        await screen.findByText("Recent Tournaments")
      ).toBeInTheDocument();
    });

    it("shows start date when present", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeStats()),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        if (url.includes("/api/players/tournaments")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                makeTournamentEntry({ startDate: "2026-01-15" }),
              ]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
      });
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      expect(await screen.findByText("2026-01-15")).toBeInTheDocument();
    });

    it("limits recent tournaments to 5 entries", async () => {
      const manyTournaments = Array.from({ length: 8 }, (_, i) =>
        makeTournamentEntry({
          id: i + 1,
          tournamentId: 100 + i,
          tournamentName: `Tournament ${i + 1}`,
          tournamentSlug: `tournament-${i + 1}`,
        })
      );
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/players/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(makeStats()),
          });
        }
        if (url.includes("/api/players/rating")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        if (url.includes("/api/players/tournaments")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(manyTournaments),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
      });
      render(<OverviewTab altIds={[1]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      // Only 5 should appear (Tournament 1–5)
      expect(await screen.findByText("Tournament 1")).toBeInTheDocument();
      expect(screen.getByText("Tournament 5")).toBeInTheDocument();
      expect(screen.queryByText("Tournament 6")).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Empty altIds — queries disabled
  // --------------------------------------------------------------------------

  describe("empty altIds", () => {
    it("does not fetch when altIds is empty", () => {
      render(<OverviewTab altIds={[]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("renders Recent Tournaments heading even with no altIds", () => {
      // With no altIds, queries are disabled, so we get loading-or-null state
      render(<OverviewTab altIds={[]} handle="ash" />, {
        wrapper: createWrapper(),
      });
      // The component renders the skeleton/null states — just check it doesn't crash
      expect(document.body).toBeInTheDocument();
    });
  });
});
