/**
 * Tests for CurrentMatchBanner.
 *
 * Key assertion: the component no longer reads `alts` via the browser Supabase
 * client. Instead it uses `useCurrentUser()` (API-backed) to get the altId,
 * then queries `tournament_matches` directly (still allowed post-revoke).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CurrentMatchBanner } from "../current-match-banner";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// useCurrentUser — API-backed hook, no direct Supabase reads
const mockUseCurrentUser = jest.fn();
jest.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

// useSupabase — only used for tournament_matches query (NOT alts)
const mockFrom = jest.fn();
const mockSupabase = {
  from: mockFrom,
};
jest.mock("@/lib/supabase", () => ({
  useSupabase: () => mockSupabase,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/** Build a chainable Supabase query builder stub. */
function buildQueryChain(resolveWith: unknown) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(resolveWith),
  };
  return chain;
}

const DEFAULT_TOURNAMENT_ID = 42;
const DEFAULT_SLUG = "test-tournament";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CurrentMatchBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("No alts read via browser client", () => {
    it("does NOT call supabase.from('alts') — alts read is removed", async () => {
      // Even if there IS an authenticated user with an alt, the banner must
      // never query the `alts` table directly.
      mockUseCurrentUser.mockReturnValue({
        user: {
          id: "user-1",
          alt: { id: 7, username: "ash", displayName: "Ash" },
        },
        isAuthenticated: true,
        isLoading: false,
      });
      mockFrom.mockReturnValue(buildQueryChain({ data: null, error: null }));

      render(
        <CurrentMatchBanner
          tournamentId={DEFAULT_TOURNAMENT_ID}
          tournamentSlug={DEFAULT_SLUG}
        />,
        { wrapper }
      );

      // Wait for any async work to settle
      await new Promise((r) => setTimeout(r, 10));

      // The browser client should query tournament_matches but NOT alts
      const calledTables = mockFrom.mock.calls.map(([table]: [string]) => table);
      expect(calledTables).not.toContain("alts");
    });

    it("queries tournament_matches using the altId from useCurrentUser", async () => {
      mockUseCurrentUser.mockReturnValue({
        user: {
          id: "user-1",
          alt: { id: 7, username: "ash", displayName: "Ash" },
        },
        isAuthenticated: true,
        isLoading: false,
      });
      const queryChain = buildQueryChain({ data: null, error: null });
      mockFrom.mockReturnValue(queryChain);

      render(
        <CurrentMatchBanner
          tournamentId={DEFAULT_TOURNAMENT_ID}
          tournamentSlug={DEFAULT_SLUG}
        />,
        { wrapper }
      );

      await new Promise((r) => setTimeout(r, 10));

      // Should query tournament_matches (still allowed post-revoke)
      expect(mockFrom).toHaveBeenCalledWith("tournament_matches");
      // The .or() filter should reference the altId (7), not query alts first
      expect(queryChain.or).toHaveBeenCalledWith(
        expect.stringContaining("7")
      );
    });
  });

  describe("Unauthenticated user", () => {
    it("renders nothing when user is not authenticated", () => {
      mockUseCurrentUser.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      const { container } = render(
        <CurrentMatchBanner
          tournamentId={DEFAULT_TOURNAMENT_ID}
          tournamentSlug={DEFAULT_SLUG}
        />,
        { wrapper }
      );

      expect(container.firstChild).toBeNull();
      // No supabase queries should fire
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("renders nothing when user has no alt", () => {
      mockUseCurrentUser.mockReturnValue({
        user: { id: "user-1", alt: null },
        isAuthenticated: true,
        isLoading: false,
      });

      const { container } = render(
        <CurrentMatchBanner
          tournamentId={DEFAULT_TOURNAMENT_ID}
          tournamentSlug={DEFAULT_SLUG}
        />,
        { wrapper }
      );

      expect(container.firstChild).toBeNull();
      // No supabase queries: enabled=false because altId is null
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe("Match found — active", () => {
    it("renders the banner with LIVE badge when match is active", async () => {
      mockUseCurrentUser.mockReturnValue({
        user: {
          id: "user-1",
          alt: { id: 7, username: "ash", displayName: "Ash" },
        },
        isAuthenticated: true,
        isLoading: false,
      });

      const matchPayload = {
        id: 10,
        status: "active",
        alt1_id: 7,
        alt2_id: 99,
        table_number: 3,
        player1: [{ id: 7, username: "ash" }],
        player2: [{ id: 99, username: "gary" }],
        round: {
          round_number: 2,
          phase: { name: "Swiss", tournament_id: DEFAULT_TOURNAMENT_ID },
        },
      };

      mockFrom.mockReturnValue(
        buildQueryChain({ data: matchPayload, error: null })
      );

      render(
        <CurrentMatchBanner
          tournamentId={DEFAULT_TOURNAMENT_ID}
          tournamentSlug={DEFAULT_SLUG}
        />,
        { wrapper }
      );

      await screen.findByText("LIVE");
      expect(screen.getByText("Your Match")).toBeInTheDocument();
      expect(screen.getByText("Round 2")).toBeInTheDocument();
      expect(screen.getByText("vs gary")).toBeInTheDocument();
    });
  });

  describe("Match found — pending", () => {
    it("renders the banner with READY badge when match is pending", async () => {
      mockUseCurrentUser.mockReturnValue({
        user: {
          id: "user-1",
          alt: { id: 7, username: "ash", displayName: "Ash" },
        },
        isAuthenticated: true,
        isLoading: false,
      });

      const matchPayload = {
        id: 11,
        status: "pending",
        alt1_id: 7,
        alt2_id: 99,
        table_number: 1,
        player1: [{ id: 7, username: "ash" }],
        player2: [{ id: 99, username: "gary" }],
        round: {
          round_number: 1,
          phase: { name: "Swiss", tournament_id: DEFAULT_TOURNAMENT_ID },
        },
      };

      mockFrom.mockReturnValue(
        buildQueryChain({ data: matchPayload, error: null })
      );

      render(
        <CurrentMatchBanner
          tournamentId={DEFAULT_TOURNAMENT_ID}
          tournamentSlug={DEFAULT_SLUG}
        />,
        { wrapper }
      );

      await screen.findByText("READY");
      expect(screen.getByText("Go to Match")).toBeInTheDocument();
    });
  });

  describe("No match", () => {
    it("renders nothing when no match data is returned", async () => {
      mockUseCurrentUser.mockReturnValue({
        user: {
          id: "user-1",
          alt: { id: 7, username: "ash", displayName: "Ash" },
        },
        isAuthenticated: true,
        isLoading: false,
      });

      mockFrom.mockReturnValue(buildQueryChain({ data: null, error: null }));

      const { container } = render(
        <CurrentMatchBanner
          tournamentId={DEFAULT_TOURNAMENT_ID}
          tournamentSlug={DEFAULT_SLUG}
        />,
        { wrapper }
      );

      // Wait for query to settle
      await new Promise((r) => setTimeout(r, 10));

      expect(container.firstChild).toBeNull();
    });
  });
});
