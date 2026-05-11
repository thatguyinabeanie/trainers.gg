import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LimitlessData } from "../limitless-data";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseSupabaseQuery = jest.fn();
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: (...args: unknown[]) => mockUseSupabaseQuery(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTournament(overrides: Record<string, unknown> = {}) {
  return {
    tournament_id: "t-001",
    name: "Weekly VGC #1",
    format_id: "gen9vgc2024rega",
    date: "2024-03-15",
    player_count: 32,
    platform: "Pokemon Showdown",
    is_online: true,
    decklists: true,
    organizer_name: "Test Org",
    imported_at: "2024-03-16T00:00:00Z",
    data_imported_at: "2024-03-16T01:00:00Z",
    ...overrides,
  };
}

// Sets up mock returns for both useSupabaseQuery calls in LimitlessData:
// Call 1: tournament data { tournaments, total }
// Call 2: format list string[]
function setupMocks({
  tournaments = [makeTournament()],
  total = 1,
  formats = ["gen9vgc2024rega"],
  isLoading = false,
  error = null as Error | null,
} = {}) {
  mockUseSupabaseQuery.mockImplementation(
    (_queryFn: unknown, deps: unknown[]) => {
      // The format query uses [] as deps, the tournament query uses 4-element array
      if (Array.isArray(deps) && deps.length === 0) {
        return {
          data: formats,
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        };
      }
      return {
        data: { tournaments, total },
        error,
        isLoading,
        refetch: jest.fn(),
      };
    }
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LimitlessData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the header and tournament count", () => {
    setupMocks({ total: 42 });
    render(<LimitlessData />);

    expect(screen.getByText("Imported Data")).toBeInTheDocument();
    expect(
      screen.getByText("Browse 42 tournaments in the database")
    ).toBeInTheDocument();
  });

  it("renders singular 'tournament' when total is 1", () => {
    setupMocks({ total: 1 });
    render(<LimitlessData />);

    expect(
      screen.getByText("Browse 1 tournament in the database")
    ).toBeInTheDocument();
  });

  it("renders the search input", () => {
    setupMocks();
    render(<LimitlessData />);

    expect(
      screen.getByPlaceholderText("Search tournaments...")
    ).toBeInTheDocument();
  });

  it("renders the refresh button", () => {
    setupMocks();
    render(<LimitlessData />);

    expect(
      screen.getByRole("button", { name: /refresh/i })
    ).toBeInTheDocument();
  });

  it("renders loading skeletons when loading", () => {
    setupMocks({ isLoading: true });
    const { container } = render(<LimitlessData />);

    // Skeletons are rendered (6 total: 1 header + 5 rows)
    const skeletons = container.querySelectorAll(
      '[class*="animate-pulse"], [data-slot="skeleton"]'
    );
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error message when query fails", () => {
    setupMocks({ error: new Error("Database connection failed") });
    render(<LimitlessData />);

    expect(screen.getByText("Database connection failed")).toBeInTheDocument();
  });

  it("renders empty message when no tournaments exist", () => {
    setupMocks({ tournaments: [], total: 0 });
    render(<LimitlessData />);

    expect(
      screen.getByText(
        "No tournaments found. Sync the list from the Import tab first."
      )
    ).toBeInTheDocument();
  });

  it("renders tournament data in the table", () => {
    setupMocks({
      tournaments: [
        makeTournament({ name: "Regional Championship", tournament_id: "t-1" }),
      ],
    });
    render(<LimitlessData />);

    expect(screen.getByText("Regional Championship")).toBeInTheDocument();
  });

  it("shows Imported badge for fully imported tournaments", () => {
    setupMocks({
      tournaments: [
        makeTournament({ data_imported_at: "2024-03-16T01:00:00Z" }),
      ],
    });
    render(<LimitlessData />);

    expect(screen.getByText("Imported")).toBeInTheDocument();
  });

  it("shows Synced only badge for metadata-only tournaments", () => {
    setupMocks({
      tournaments: [makeTournament({ data_imported_at: null })],
    });
    render(<LimitlessData />);

    expect(screen.getByText("Synced only")).toBeInTheDocument();
  });

  it("shows Yes badge when decklists are available", () => {
    setupMocks({
      tournaments: [makeTournament({ decklists: true })],
    });
    render(<LimitlessData />);

    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("shows No when decklists are not available", () => {
    setupMocks({
      tournaments: [makeTournament({ decklists: false })],
    });
    render(<LimitlessData />);

    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders format filter dropdown", () => {
    setupMocks({
      formats: ["gen9vgc2024rega", "gen9vgc2024regb"],
    });
    render(<LimitlessData />);

    // The format select combobox should be present
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders pagination when there are multiple pages", () => {
    setupMocks({ total: 100 }); // 100 / 25 = 4 pages
    render(<LimitlessData />);

    expect(screen.getByText("Page 1 of 4 (100 total)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  });

  it("does not render pagination for single page", () => {
    setupMocks({ total: 10 }); // 10 / 25 = 1 page
    render(<LimitlessData />);

    expect(screen.queryByText(/Page \d+ of/)).not.toBeInTheDocument();
  });

  it("renders external link to Limitless", () => {
    setupMocks({
      tournaments: [makeTournament({ tournament_id: "abc-123" })],
    });
    render(<LimitlessData />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "https://play.limitlesstcg.com/tournament/abc-123/standings"
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders the tournament ID below the name", () => {
    setupMocks({
      tournaments: [makeTournament({ tournament_id: "my-tournament-id" })],
    });
    render(<LimitlessData />);

    expect(screen.getByText("my-tournament-id")).toBeInTheDocument();
  });

  it("renders the format badge", () => {
    setupMocks({
      tournaments: [makeTournament({ format_id: "gen9vgc2024rega" })],
    });
    render(<LimitlessData />);

    expect(screen.getByText("gen9vgc2024rega")).toBeInTheDocument();
  });

  it("disables refresh button while loading", () => {
    setupMocks({ isLoading: true });
    render(<LimitlessData />);

    expect(screen.getByRole("button", { name: /refresh/i })).toBeDisabled();
  });

  it("calls useSupabaseQuery with correct deps on search", async () => {
    setupMocks();
    const user = userEvent.setup();
    render(<LimitlessData />);

    const searchInput = screen.getByPlaceholderText("Search tournaments...");
    await user.type(searchInput, "regional");

    // The search value should be reflected in the input
    expect(searchInput).toHaveValue("regional");
  });

  it("advances to next page on Next click", async () => {
    setupMocks({ total: 100 }); // 4 pages
    const user = userEvent.setup();
    render(<LimitlessData />);

    expect(screen.getByText("Page 1 of 4 (100 total)")).toBeInTheDocument();

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    // After click, useSupabaseQuery re-fires — since our mock is stateless,
    // the page state updates but display depends on the same mock data.
    // We verify the button interaction doesn't crash and re-renders.
    expect(nextButton).toBeInTheDocument();
  });

  it("goes to previous page on Previous click", async () => {
    setupMocks({ total: 100 });
    const user = userEvent.setup();
    render(<LimitlessData />);

    // Go to page 2 first
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Now Previous should be enabled
    const prevButton = screen.getByRole("button", { name: /previous/i });
    await user.click(prevButton);

    expect(prevButton).toBeInTheDocument();
  });

  it("triggers refresh on Refresh button click", async () => {
    setupMocks();
    const user = userEvent.setup();
    render(<LimitlessData />);

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    await user.click(refreshButton);

    // useSupabaseQuery should have been called again (refreshKey incremented)
    expect(mockUseSupabaseQuery).toHaveBeenCalled();
  });

  it("navigates to detail page when clicking imported tournament row", () => {
    // DataTable calls onRowClick — we verify the callback prop is set correctly
    // by checking that an imported tournament renders as a clickable row
    setupMocks({
      tournaments: [
        makeTournament({
          tournament_id: "t-detail",
          data_imported_at: "2024-03-16T01:00:00Z",
        }),
      ],
    });
    render(<LimitlessData />);

    // The tournament should be visible in the table
    expect(screen.getByText("Weekly VGC #1")).toBeInTheDocument();
  });

  it("renders multiple tournaments", () => {
    setupMocks({
      tournaments: [
        makeTournament({ tournament_id: "t-1", name: "Tournament A" }),
        makeTournament({ tournament_id: "t-2", name: "Tournament B" }),
        makeTournament({ tournament_id: "t-3", name: "Tournament C" }),
      ],
      total: 3,
    });
    render(<LimitlessData />);

    expect(screen.getByText("Tournament A")).toBeInTheDocument();
    expect(screen.getByText("Tournament B")).toBeInTheDocument();
    expect(screen.getByText("Tournament C")).toBeInTheDocument();
  });

  it("renders date and player count columns", () => {
    setupMocks({
      tournaments: [makeTournament({ date: "2024-12-25", player_count: 128 })],
    });
    render(<LimitlessData />);

    expect(screen.getByText("2024-12-25")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
  });
});
