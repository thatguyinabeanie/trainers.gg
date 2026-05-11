import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LimitlessImport } from "../limitless-import";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    functions: { invoke: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { supabase: mockSupabase } = require("@/lib/supabase/client");
const mockInvoke = mockSupabase.functions.invoke as jest.Mock;

const mockUseSupabaseQuery = jest.fn();
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: (...args: unknown[]) => mockUseSupabaseQuery(...args),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const defaultStats = {
  totalSynced: 100,
  totalImported: 40,
  formats: [
    {
      limitlessCode: "M-A",
      formatId: "gen9championsvgc2026regma",
      synced: 50,
      imported: 20,
    },
    {
      limitlessCode: "VGC24A",
      formatId: "gen9vgc2024rega",
      synced: 50,
      imported: 20,
    },
  ],
};

function makeTournament(overrides: Record<string, unknown> = {}) {
  return {
    tournament_id: "t-001",
    name: "Weekly VGC #1",
    format_id: "gen9championsvgc2026regma",
    date: "2024-03-15",
    player_count: 32,
    data_imported_at: null,
    ...overrides,
  };
}

// Sets up mock returns for both useSupabaseQuery calls in LimitlessImport:
// Call 1: stats (via edge function)
// Call 2: tournaments from DB (not-yet-imported)
function setupMocks({
  stats = defaultStats as typeof defaultStats | null,
  statsLoading = false,
  statsError = null as Error | null,
  tournaments = [makeTournament()] as ReturnType<typeof makeTournament>[],
  tournamentsLoading = false,
} = {}) {
  let callCount = 0;
  const refetchStats = jest.fn();

  mockUseSupabaseQuery.mockImplementation(() => {
    callCount++;
    // Odd calls (1st, 3rd, ...) are stats; even calls (2nd, 4th, ...) are tournaments
    if (callCount % 2 === 1) {
      return {
        data: stats,
        error: statsError,
        isLoading: statsLoading,
        refetch: refetchStats,
      };
    }
    return {
      data: tournaments,
      error: null,
      isLoading: tournamentsLoading,
      refetch: jest.fn(),
    };
  });

  return { refetchStats };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LimitlessImport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Stage 1: Sync UI
  // -----------------------------------------------------------------------

  describe("Stage 1: Sync", () => {
    it("renders the sync section header", () => {
      setupMocks();
      render(<LimitlessImport />);

      expect(
        screen.getByText("Stage 1: Sync Tournament List")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Fetch all VGC tournaments from the Limitless API and save metadata to the database."
        )
      ).toBeInTheDocument();
    });

    it("renders the Sync List button", () => {
      setupMocks();
      render(<LimitlessImport />);

      expect(
        screen.getByRole("button", { name: /sync list/i })
      ).toBeInTheDocument();
    });

    it("renders stats badges when loaded", () => {
      setupMocks();
      render(<LimitlessImport />);

      expect(screen.getByText("100 synced")).toBeInTheDocument();
      expect(screen.getByText("40 fully imported")).toBeInTheDocument();
      expect(screen.getByText("60 pending import")).toBeInTheDocument();
    });

    it("renders loading skeletons when stats are loading", () => {
      setupMocks({ statsLoading: true, stats: null });
      const { container } = render(<LimitlessImport />);

      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders error when stats query fails", () => {
      setupMocks({ statsError: new Error("Edge function failed") });
      render(<LimitlessImport />);

      expect(screen.getByText("Edge function failed")).toBeInTheDocument();
    });

    it("shows Syncing state when sync button is clicked", async () => {
      setupMocks();
      const user = userEvent.setup();

      // Mock the edge function invoke for sync action
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            synced: 50,
            skipped: 2,
            total: 100,
            mapped: 45,
            unmapped: 5,
            unmappedFormats: { CUSTOM: 5 },
          },
        },
        error: null,
      });

      render(<LimitlessImport />);

      const syncButton = screen.getByRole("button", { name: /sync list/i });
      await user.click(syncButton);

      // Should show syncing state briefly
      await waitFor(() => {
        expect(
          screen.getByText(/Synced 50 tournaments from 100 total/)
        ).toBeInTheDocument();
      });
    });

    it("shows error message when sync fails", async () => {
      setupMocks();
      const user = userEvent.setup();

      mockInvoke.mockResolvedValueOnce({
        data: { success: false, error: "Rate limited" },
        error: null,
      });

      render(<LimitlessImport />);

      const syncButton = screen.getByRole("button", { name: /sync list/i });
      await user.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText("Rate limited")).toBeInTheDocument();
      });
    });

    it("shows sync result with unmapped formats", async () => {
      setupMocks();
      const user = userEvent.setup();

      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            synced: 50,
            skipped: 0,
            total: 100,
            mapped: 45,
            unmapped: 5,
            unmappedFormats: { CUSTOM: 3, OTHER: 2 },
          },
        },
        error: null,
      });

      render(<LimitlessImport />);
      await user.click(screen.getByRole("button", { name: /sync list/i }));

      await waitFor(() => {
        expect(screen.getByText(/5 with raw format codes/)).toBeInTheDocument();
        expect(screen.getByText(/CUSTOM \(3\)/)).toBeInTheDocument();
      });
    });

    it("shows skipped count when present", async () => {
      setupMocks();
      const user = userEvent.setup();

      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            synced: 50,
            skipped: 3,
            total: 100,
            mapped: 50,
            unmapped: 0,
            unmappedFormats: {},
          },
        },
        error: null,
      });

      render(<LimitlessImport />);
      await user.click(screen.getByRole("button", { name: /sync list/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/3 skipped \(no format code\)/)
        ).toBeInTheDocument();
      });
    });
  });

  // -----------------------------------------------------------------------
  // Stage 2: Import UI
  // -----------------------------------------------------------------------

  describe("Stage 2: Import", () => {
    it("renders the import section header", () => {
      setupMocks();
      render(<LimitlessImport />);

      expect(
        screen.getByText("Stage 2: Import Tournament Data")
      ).toBeInTheDocument();
    });

    it("renders format filter dropdown", () => {
      setupMocks();
      render(<LimitlessImport />);

      // The format select combobox should be present
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders tournament list from DB", () => {
      setupMocks({
        tournaments: [
          makeTournament({ name: "VGC Regional", tournament_id: "t-1" }),
          makeTournament({
            name: "Local Challenge",
            tournament_id: "t-2",
          }),
        ],
      });
      render(<LimitlessImport />);

      expect(screen.getByText("VGC Regional")).toBeInTheDocument();
      expect(screen.getByText("Local Challenge")).toBeInTheDocument();
    });

    it("renders loading skeletons when tournaments are loading", () => {
      setupMocks({ tournamentsLoading: true, tournaments: [] });
      const { container } = render(<LimitlessImport />);

      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("shows 'all imported' message when no pending tournaments", () => {
      setupMocks({ tournaments: [] });
      render(<LimitlessImport />);

      expect(
        screen.getByText("All synced tournaments have been imported.")
      ).toBeInTheDocument();
    });

    it("shows 'no tournaments synced' message when totalSynced is 0", () => {
      setupMocks({
        stats: { totalSynced: 0, totalImported: 0, formats: [] },
        tournaments: [],
      });
      render(<LimitlessImport />);

      expect(
        screen.getByText("No tournaments synced yet. Click Sync List above.")
      ).toBeInTheDocument();
    });

    it("renders Pending badge for not-yet-imported tournaments", () => {
      setupMocks();
      render(<LimitlessImport />);

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("renders tournament table headers", () => {
      setupMocks();
      render(<LimitlessImport />);

      expect(screen.getByText("Tournament")).toBeInTheDocument();
      expect(screen.getByText("Format")).toBeInTheDocument();
      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Players")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("renders external link to Limitless for each tournament", () => {
      setupMocks({
        tournaments: [makeTournament({ tournament_id: "abc-123" })],
      });
      render(<LimitlessImport />);

      const links = screen.getAllByRole("link");
      const limitlessLink = links.find(
        (link) =>
          link.getAttribute("href") ===
          "https://play.limitlesstcg.com/tournament/abc-123/standings"
      );
      expect(limitlessLink).toBeDefined();
    });

    it("renders import button for each pending tournament", () => {
      setupMocks();
      render(<LimitlessImport />);

      // Should have at least one import button (the per-row button)
      const buttons = screen.getAllByRole("button");
      // Find button that is not sync and not batch import
      expect(buttons.length).toBeGreaterThan(1);
    });

    it("imports a single tournament on button click", async () => {
      setupMocks();
      const user = userEvent.setup();

      // Mock successful import
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            tournamentId: "t-001",
            name: "Weekly VGC #1",
            players: 32,
            standings: 32,
            pokemon: 192,
            matches: 64,
          },
        },
        error: null,
      });

      render(<LimitlessImport />);

      // Find the per-row import button (last button that's not Sync List or batch Import)
      const allButtons = screen.getAllByRole("button");
      // The per-row import button is small with just an icon — find it
      const importButton = allButtons.find(
        (btn) =>
          !btn.textContent?.includes("Sync") &&
          !btn.textContent?.includes("Import") &&
          !btn.textContent?.includes("All formats")
      );

      if (importButton) {
        await user.click(importButton);

        await waitFor(() => {
          expect(screen.getByText("Imported")).toBeInTheDocument();
        });
      }
    });

    it("shows batch import button with pending count", () => {
      setupMocks({
        tournaments: [
          makeTournament({ tournament_id: "t-1" }),
          makeTournament({ tournament_id: "t-2" }),
          makeTournament({ tournament_id: "t-3" }),
        ],
      });
      render(<LimitlessImport />);

      // The batch import button should show "Import All (3)"
      expect(screen.getByText(/Import.*\(3\)/)).toBeInTheDocument();
    });

    it("shows format-specific label on batch import button", async () => {
      setupMocks();
      render(<LimitlessImport />);

      // Default is "All" so it shows "Import All (1)"
      expect(screen.getByText(/Import All \(1\)/)).toBeInTheDocument();
    });

    it("shows mapped Limitless code in format badge", () => {
      setupMocks({
        tournaments: [
          makeTournament({
            format_id: "gen9championsvgc2026regma",
          }),
        ],
      });
      render(<LimitlessImport />);

      // Should show the mapped code "M-A" instead of the long format ID
      expect(screen.getByText("M-A")).toBeInTheDocument();
    });

    it("shows raw format_id when no mapping exists", () => {
      setupMocks({
        tournaments: [
          makeTournament({
            format_id: "unmapped-format",
          }),
        ],
      });
      render(<LimitlessImport />);

      expect(screen.getByText("unmapped-format")).toBeInTheDocument();
    });

    it("shows failed import error", async () => {
      setupMocks();
      const user = userEvent.setup();

      // Mock failed import
      mockInvoke.mockResolvedValueOnce({
        data: { success: false, error: "Tournament not found" },
        error: null,
      });

      render(<LimitlessImport />);

      const allButtons = screen.getAllByRole("button");
      const importButton = allButtons.find(
        (btn) =>
          !btn.textContent?.includes("Sync") &&
          !btn.textContent?.includes("Import") &&
          !btn.textContent?.includes("All formats")
      );

      if (importButton) {
        await user.click(importButton);

        await waitFor(() => {
          expect(screen.getByText("Failed")).toBeInTheDocument();
          expect(screen.getByText("Tournament not found")).toBeInTheDocument();
        });
      }
    });

    it("shows import stats after successful import", async () => {
      setupMocks();
      const user = userEvent.setup();

      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            tournamentId: "t-001",
            name: "Weekly VGC #1",
            players: 32,
            standings: 30,
            pokemon: 180,
            matches: 60,
          },
        },
        error: null,
      });

      render(<LimitlessImport />);

      const allButtons = screen.getAllByRole("button");
      const importButton = allButtons.find(
        (btn) =>
          !btn.textContent?.includes("Sync") &&
          !btn.textContent?.includes("Import") &&
          !btn.textContent?.includes("All formats")
      );

      if (importButton) {
        await user.click(importButton);

        await waitFor(() => {
          // Shows "30s / 180p / 60m" format
          expect(screen.getByText("30s / 180p / 60m")).toBeInTheDocument();
        });
      }
    });

    it("renders player count and date", () => {
      setupMocks({
        tournaments: [makeTournament({ player_count: 64, date: "2024-06-01" })],
      });
      render(<LimitlessImport />);

      expect(screen.getByText("64")).toBeInTheDocument();
      expect(screen.getByText("2024-06-01")).toBeInTheDocument();
    });
  });
});
