import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AltTournamentHistory } from "../alt-tournament-history";

// --- Mocks ---

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

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

jest.mock("@/components/ui/status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

jest.mock("lucide-react", () => ({
  Trophy: () => <span data-testid="trophy-icon" />,
  Calendar: () => <span data-testid="calendar-icon" />,
  ChevronLeft: () => <span>&lt;</span>,
  ChevronRight: () => <span>&gt;</span>,
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// --- Helpers ---

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const defaultProps = { altId: 42, handle: "ash_ketchum" };

// --- Tests ---

describe("AltTournamentHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeletons while fetching", () => {
    // Never resolve fetch so it stays loading
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<AltTournamentHistory {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders empty state when no tournaments found", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], totalCount: 0, page: 1 }),
    });

    render(<AltTournamentHistory {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("No tournaments found.")).toBeInTheDocument();
    });
  });

  it("renders tournament entries with correct data", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: 1,
              tournamentId: 100,
              tournamentName: "VGC Regionals 2025",
              tournamentSlug: "vgc-regionals-2025",
              startDate: "2025-03-15",
              status: "completed",
              format: "vgc",
              organizationName: "Pokemon Company",
              organizationSlug: "pokemon-company",
              placement: 1,
              wins: 7,
              losses: 1,
            },
            {
              id: 2,
              tournamentId: 101,
              tournamentName: "Local Weekly",
              tournamentSlug: "local-weekly",
              startDate: null,
              status: "active",
              format: null,
              organizationName: null,
              organizationSlug: null,
              placement: null,
              wins: 3,
              losses: 0,
            },
          ],
          totalCount: 2,
          page: 1,
        }),
    });

    render(<AltTournamentHistory {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    // Wait for data to render
    await waitFor(() => {
      expect(screen.getByText("VGC Regionals 2025")).toBeInTheDocument();
    });

    // Check tournament links
    expect(screen.getByText("VGC Regionals 2025")).toHaveAttribute(
      "href",
      "/tournaments/vgc-regionals-2025"
    );

    // Check organization link
    expect(screen.getByText("Pokemon Company")).toHaveAttribute(
      "href",
      "/communities/pokemon-company"
    );

    // Check record display
    expect(screen.getByText("7-1")).toBeInTheDocument();
    expect(screen.getByText("3-0")).toBeInTheDocument();

    // Check placement (1st)
    expect(screen.getByText("1st")).toBeInTheDocument();

    // Check format is uppercased
    expect(screen.getByText("VGC")).toBeInTheDocument();

    // Check status badges
    const badges = screen.getAllByTestId("status-badge");
    expect(badges[0]).toHaveTextContent("completed");
    expect(badges[1]).toHaveTextContent("active");

    // Second tournament should NOT have placement
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });

  it("handles API error gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<AltTournamentHistory {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    // After error, should not show data or crash — shows empty state
    // (TanStack Query with retry: false will leave data undefined)
    await waitFor(() => {
      expect(screen.queryAllByTestId("skeleton")).toHaveLength(0);
    });

    // Should not show tournament entries
    expect(screen.queryByTestId("trophy-icon")).not.toBeInTheDocument();
  });
});
