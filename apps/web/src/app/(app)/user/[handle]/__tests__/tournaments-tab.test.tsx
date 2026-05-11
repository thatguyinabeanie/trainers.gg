import { render, screen, waitFor } from "@testing-library/react";
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
import { TournamentsTab } from "../tournaments-tab";

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

function makeEntry(
  overrides: Partial<{
    id: number;
    altId: number;
    tournamentId: number;
    tournamentName: string;
    tournamentSlug: string;
    startDate: string | null;
    status: string;
    format: string | null;
    organizationName: string | null;
    organizationSlug: string | null;
    placement: number | null;
    wins: number;
    losses: number;
  }> = {}
) {
  return {
    id: 1,
    altId: 1,
    tournamentId: 10,
    tournamentName: "Kanto Regional",
    tournamentSlug: "kanto-regional",
    startDate: "2025-03-15",
    status: "completed",
    format: "vgc",
    organizationName: "Indigo League",
    organizationSlug: "indigo-league",
    placement: 2,
    wins: 5,
    losses: 1,
    ...overrides,
  };
}

const defaultProps = {
  altIds: [1],
  allAltIds: [1],
  isOwner: false,
  altMap: {} as Record<number, string>,
  handle: "ash_ketchum",
};

// ============================================================================
// Tests
// ============================================================================

describe("TournamentsTab", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("shows skeletons while loading", () => {
    // Never resolve fetch
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { container } = render(<TournamentsTab {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    // Skeleton cards render with animate-pulse class
    const skeletons = container.querySelectorAll(
      "[class*='animate-pulse'], [data-slot='skeleton']"
    );
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty state when no tournaments returned", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], totalCount: 0, page: 1 }),
    });

    render(<TournamentsTab {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/no tournaments found/i)
      ).toBeInTheDocument();
    });
  });

  it("renders tournament entries with name, org, record, and placement", async () => {
    const entry = makeEntry();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [entry], totalCount: 1, page: 1 }),
    });

    render(<TournamentsTab {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Kanto Regional")).toBeInTheDocument();
    });

    expect(screen.getByText("Indigo League")).toBeInTheDocument();
    expect(screen.getByText("5-1")).toBeInTheDocument();
    expect(screen.getByText("2nd")).toBeInTheDocument();
  });

  it("shows pagination when totalCount exceeds page size", async () => {
    const entries = Array.from({ length: 20 }, (_, i) =>
      makeEntry({ id: i + 1, tournamentName: `Tournament ${i + 1}` })
    );
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: entries, totalCount: 45, page: 1 }),
    });

    render(<TournamentsTab {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
    });
  });

  it("owner sees alt filter dropdown when allAltIds has multiple entries", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], totalCount: 0, page: 1 }),
    });

    const { container } = render(
      <TournamentsTab
        {...defaultProps}
        isOwner={true}
        allAltIds={[1, 2]}
        altMap={{ 1: "ash", 2: "red" }}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/no tournaments found/i)).toBeInTheDocument();
    });

    // Owner with multiple alts gets 3 select triggers (Year, Status, Alt)
    const triggers = container.querySelectorAll("button[aria-haspopup='listbox']");
    expect(triggers.length).toBe(3);
  });

  it("non-owner does not see alt filter dropdown", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], totalCount: 0, page: 1 }),
    });

    const { container } = render(
      <TournamentsTab
        {...defaultProps}
        isOwner={false}
        allAltIds={[1, 2]}
        altMap={{ 1: "ash", 2: "red" }}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/no tournaments found/i)).toBeInTheDocument();
    });

    // Non-owner only gets 2 select triggers (Year, Status)
    const triggers = container.querySelectorAll("button[aria-haspopup='listbox']");
    expect(triggers.length).toBe(2);
  });

  it("shows 'as @username' label when altMap matches entry altId", async () => {
    const entry = makeEntry({ altId: 2 });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [entry], totalCount: 1, page: 1 }),
    });

    render(
      <TournamentsTab
        {...defaultProps}
        altIds={[1, 2]}
        altMap={{ 2: "red_trainer" }}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("as @red_trainer")).toBeInTheDocument();
    });
  });
});
