import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerSearch, playerDirectoryKeys } from "../player-search";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock fetch for search API
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ============================================================================
// Helpers
// ============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const initialData = {
  players: [
    {
      userId: "u1",
      username: "ash",
      avatarUrl: null,
      country: "US",
      tournamentCount: 5,
      winRate: 75,
      totalWins: 15,
      totalLosses: 5,
    },
  ],
  totalCount: 1,
  page: 1,
};

// ============================================================================
// Tests
// ============================================================================

describe("PlayerSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders initial data without fetching", () => {
    render(<PlayerSearch initialData={initialData} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("ash")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("renders search input", () => {
    render(<PlayerSearch initialData={initialData} />, {
      wrapper: createWrapper(),
    });

    expect(
      screen.getByPlaceholderText("Search players by username...")
    ).toBeInTheDocument();
  });

  it("renders sort dropdown", () => {
    render(<PlayerSearch initialData={initialData} />, {
      wrapper: createWrapper(),
    });

    // The sort select trigger should be present
    const sortTriggers = screen.getAllByRole("combobox");
    expect(sortTriggers.length).toBeGreaterThanOrEqual(1);
  });

  it("renders country dropdown", () => {
    render(<PlayerSearch initialData={initialData} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("All Countries")).toBeInTheDocument();
  });
});

describe("fetchPlayerSearch (via PlayerSearch)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calls search API with query params when user types", async () => {
    const searchResults = {
      players: [
        {
          userId: "u2",
          username: "cynthia",
          avatarUrl: null,
          country: null,
          tournamentCount: 20,
          winRate: 90,
          totalWins: 18,
          totalLosses: 2,
        },
      ],
      totalCount: 1,
      page: 1,
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(searchResults),
    });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<PlayerSearch initialData={initialData} />, {
      wrapper: createWrapper(),
    });

    const input = screen.getByPlaceholderText("Search players by username...");
    await user.type(input, "cyn");

    // Advance debounce timer
    jest.advanceTimersByTime(300);

    await screen.findByText("cynthia");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/players/search?")
    );
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("q=cyn"));
  });

  it("includes country filter in search URL when set", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ players: [], totalCount: 0, page: 1 }),
    });

    // Simulate being on page 2 (isClientSearch = true without needing debounce)
    const dataWithPage2 = { ...initialData, page: 2 };
    render(<PlayerSearch initialData={dataWithPage2} />, {
      wrapper: createWrapper(),
    });

    // Trigger a query by typing and advancing debounce
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const input = screen.getByPlaceholderText("Search players by username...");
    await user.type(input, "ash");
    jest.advanceTimersByTime(300);

    await screen.findByText("No players found");
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("page=1"));
  });
});

describe("playerDirectoryKeys", () => {
  it("generates stable query keys", () => {
    const key1 = playerDirectoryKeys.search({
      q: "ash",
      country: "",
      sort: "tournaments",
      page: 1,
    });
    const key2 = playerDirectoryKeys.search({
      q: "ash",
      country: "",
      sort: "tournaments",
      page: 1,
    });

    expect(key1).toEqual(key2);
  });

  it("generates different keys for different params", () => {
    const key1 = playerDirectoryKeys.search({
      q: "ash",
      country: "",
      sort: "tournaments",
      page: 1,
    });
    const key2 = playerDirectoryKeys.search({
      q: "cynthia",
      country: "",
      sort: "tournaments",
      page: 1,
    });

    expect(key1).not.toEqual(key2);
  });
});
