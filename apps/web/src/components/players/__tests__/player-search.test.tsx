import { render, screen } from "@testing-library/react";
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

    // The "Sort by" select trigger should be present
    expect(screen.getByText("Most Tournaments")).toBeInTheDocument();
  });

  it("renders country dropdown", () => {
    render(<PlayerSearch initialData={initialData} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("All Countries")).toBeInTheDocument();
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
