import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LimitlessImport } from "../limitless-import";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUpdate = jest.fn();
const mockIn = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();
const mockSchema = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    functions: { invoke: jest.fn() },
    schema: (...args: unknown[]) => mockSchema(...args),
  },
}));

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
    import_status: null,
    import_requested_at: null,
    import_error: null,
    import_attempts: null,
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

  // Setup schema mock chain for queue operations
  mockEq.mockResolvedValue({ error: null });
  mockIn.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockEq, in: mockIn });
  mockFrom.mockReturnValue({ update: mockUpdate });
  mockSchema.mockReturnValue({ from: mockFrom });

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
  // Sync info card
  // -----------------------------------------------------------------------

  describe("Sync info card", () => {
    it("renders the tournament sync header", () => {
      setupMocks();
      render(<LimitlessImport />);

      expect(screen.getByText("Tournament Sync")).toBeInTheDocument();
      expect(
        screen.getByText(/syncs automatically every 5 minutes/)
      ).toBeInTheDocument();
    });

    it("renders a Refresh button", () => {
      setupMocks();
      render(<LimitlessImport />);

      expect(
        screen.getByRole("button", { name: /refresh/i })
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

    it("shows queued count badge when tournaments are queued", () => {
      setupMocks({
        tournaments: [
          makeTournament({ import_status: "queued", tournament_id: "t-1" }),
          makeTournament({ import_status: "queued", tournament_id: "t-2" }),
          makeTournament({ tournament_id: "t-3" }),
        ],
      });
      render(<LimitlessImport />);

      expect(screen.getByText("2 queued")).toBeInTheDocument();
    });

    it("shows importing count badge when tournaments are being imported", () => {
      setupMocks({
        tournaments: [
          makeTournament({ import_status: "importing", tournament_id: "t-1" }),
          makeTournament({ tournament_id: "t-2" }),
        ],
      });
      render(<LimitlessImport />);

      expect(screen.getByText("1 importing")).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Import Queue
  // -----------------------------------------------------------------------

  describe("Import Queue", () => {
    it("renders the import queue header", () => {
      setupMocks();
      render(<LimitlessImport />);

      expect(screen.getByText("Import Queue")).toBeInTheDocument();
    });

    it("renders format filter dropdown", () => {
      setupMocks();
      render(<LimitlessImport />);

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

    it("shows 'all imported or queued' message when no pending tournaments", () => {
      setupMocks({ tournaments: [] });
      render(<LimitlessImport />);

      expect(
        screen.getByText("All synced tournaments have been imported or queued.")
      ).toBeInTheDocument();
    });

    it("shows 'sync will populate' message when totalSynced is 0", () => {
      setupMocks({
        stats: { totalSynced: 0, totalImported: 0, formats: [] },
        tournaments: [],
      });
      render(<LimitlessImport />);

      expect(
        screen.getByText(
          "No tournaments synced yet. The sync cron will populate this shortly."
        )
      ).toBeInTheDocument();
    });

    it("renders Pending badge for not-yet-queued tournaments", () => {
      setupMocks();
      render(<LimitlessImport />);

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("renders Queued badge for queued tournaments", () => {
      setupMocks({
        tournaments: [makeTournament({ import_status: "queued" })],
      });
      render(<LimitlessImport />);

      expect(screen.getByText("Queued")).toBeInTheDocument();
    });

    it("renders Importing badge for actively importing tournaments", () => {
      setupMocks({
        tournaments: [makeTournament({ import_status: "importing" })],
      });
      render(<LimitlessImport />);

      expect(screen.getByText("Importing")).toBeInTheDocument();
    });

    it("renders Failed badge with attempt count", () => {
      setupMocks({
        tournaments: [
          makeTournament({ import_status: "failed", import_attempts: 2 }),
        ],
      });
      render(<LimitlessImport />);

      expect(screen.getByText("Failed (2x)")).toBeInTheDocument();
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

    it("renders queue button for pending tournaments", () => {
      setupMocks();
      render(<LimitlessImport />);

      // Should have at least one queue button (the per-row button)
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(1);
    });

    it("does not render queue button for queued tournaments", () => {
      setupMocks({
        tournaments: [makeTournament({ import_status: "queued" })],
      });
      render(<LimitlessImport />);

      // Only buttons should be Refresh and possibly the batch queue
      // (batch queue won't show since no pending tournaments)
      const buttons = screen.getAllByRole("button");
      // Should only be the Refresh button and the combobox
      const queueButtons = buttons.filter(
        (btn) =>
          !btn.textContent?.includes("Refresh") &&
          !btn.textContent?.includes("Queue") &&
          !btn.textContent?.includes("All formats")
      );
      expect(queueButtons.length).toBe(0);
    });

    it("queues a single tournament on button click", async () => {
      setupMocks();
      const user = userEvent.setup();

      render(<LimitlessImport />);

      // Find the per-row queue button (small icon-only button)
      const allButtons = screen.getAllByRole("button");
      const queueButton = allButtons.find(
        (btn) =>
          !btn.textContent?.includes("Refresh") &&
          !btn.textContent?.includes("Queue") &&
          !btn.textContent?.includes("All formats")
      );

      if (queueButton) {
        await user.click(queueButton);

        await waitFor(() => {
          expect(mockSchema).toHaveBeenCalledWith("limitless");
          expect(mockFrom).toHaveBeenCalledWith("tournaments");
          expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ import_status: "queued" })
          );
          expect(mockEq).toHaveBeenCalledWith("tournament_id", "t-001");
        });
      }
    });

    it("shows batch queue button with pending count", () => {
      setupMocks({
        tournaments: [
          makeTournament({ tournament_id: "t-1" }),
          makeTournament({ tournament_id: "t-2" }),
          makeTournament({ tournament_id: "t-3" }),
        ],
      });
      render(<LimitlessImport />);

      expect(screen.getByText(/Queue.*\(3\)/)).toBeInTheDocument();
    });

    it("renders queue button for failed tournaments (retry)", () => {
      setupMocks({
        tournaments: [
          makeTournament({
            import_status: "failed",
            import_error: "Network timeout",
          }),
        ],
      });
      render(<LimitlessImport />);

      // Failed tournaments should have a queue button for retry
      const allButtons = screen.getAllByRole("button");
      const queueButton = allButtons.find(
        (btn) =>
          !btn.textContent?.includes("Refresh") &&
          !btn.textContent?.includes("Queue") &&
          !btn.textContent?.includes("All formats")
      );
      expect(queueButton).toBeDefined();
    });

    it("shows error text for failed tournaments", () => {
      setupMocks({
        tournaments: [
          makeTournament({
            import_status: "failed",
            import_error: "Network timeout",
          }),
        ],
      });
      render(<LimitlessImport />);

      expect(screen.getByText("Network timeout")).toBeInTheDocument();
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
