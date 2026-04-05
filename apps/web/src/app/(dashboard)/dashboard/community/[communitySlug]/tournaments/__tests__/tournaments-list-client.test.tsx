import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams } from "next/navigation";
import { TournamentsListClient } from "../tournaments-list-client";
import { useSupabaseQuery } from "@/lib/supabase";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock Supabase query hook
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(),
}));

// Mock the supabase query function to prevent real DB calls
jest.mock("@trainers/supabase", () => ({
  listCommunityTournaments: jest.fn(),
}));

// Mock tournament list components — testing routing/grouping logic here,
// not the list component rendering
jest.mock("@/components/tournaments/tournament-list", () => ({
  SectionHeader: ({ title, count }: { title: string; count: number }) => (
    <div data-testid={`section-${title.toLowerCase()}`}>
      {title} ({count})
    </div>
  ),
  ActiveTournaments: ({ tournaments }: { tournaments: unknown[] }) => (
    <div data-testid="active-tournaments">{tournaments.length} active</div>
  ),
  UpcomingTournaments: ({ tournaments }: { tournaments: unknown[] }) => (
    <div data-testid="upcoming-tournaments">{tournaments.length} upcoming</div>
  ),
  CompletedTournaments: ({ tournaments }: { tournaments: unknown[] }) => (
    <div data-testid="completed-tournaments">
      {tournaments.length} completed
    </div>
  ),
  TournamentListEmpty: ({
    title,
    description,
  }: {
    title?: string;
    description?: string;
  }) => (
    <div data-testid="empty-state">
      {title ?? "No tournaments found"}
      {description && ` — ${description}`}
    </div>
  ),
}));

const makeTournament = (overrides = {}) => ({
  id: 1,
  name: "Test Tournament",
  slug: "test-tournament",
  status: "upcoming",
  start_date: "2026-05-01T10:00:00Z",
  end_date: null,
  registrationCount: 8,
  max_participants: 32,
  organization: { id: 1, name: "Test Org", slug: "test-org" },
  winner: null,
  ...overrides,
});

const mockQuerySuccess = (tournaments: ReturnType<typeof makeTournament>[]) => {
  (useSupabaseQuery as jest.Mock).mockReturnValue({
    data: { tournaments },
    isLoading: false,
    error: null,
  });
};

const mockQueryLoading = () => {
  (useSupabaseQuery as jest.Mock).mockReturnValue({
    data: null,
    isLoading: true,
    error: null,
  });
};

const mockQueryError = () => {
  (useSupabaseQuery as jest.Mock).mockReturnValue({
    data: null,
    isLoading: false,
    error: new Error("Failed to fetch"),
  });
};

const renderComponent = (props = {}) => {
  return render(
    <TournamentsListClient
      communityId={1}
      communitySlug="test-org"
      {...props}
    />
  );
};

describe("TournamentsListClient", () => {
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
  });

  describe("Loading state", () => {
    it("renders a spinner while data is loading", () => {
      mockQueryLoading();
      renderComponent();
      // Loader2 icon from lucide has the animate-spin class
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("renders 'Failed to load tournaments' when an error occurs", () => {
      mockQueryError();
      renderComponent();
      expect(
        screen.getByText("Failed to load tournaments")
      ).toBeInTheDocument();
    });

    it("renders a Retry button when an error occurs", () => {
      mockQueryError();
      renderComponent();
      expect(
        screen.getByRole("button", { name: /retry/i })
      ).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("shows 'Create your first tournament to get started' when all tab has no tournaments", () => {
      mockQuerySuccess([]);
      renderComponent();
      expect(screen.getByTestId("empty-state")).toHaveTextContent(
        "Create your first tournament to get started"
      );
    });

    it("shows 'No active tournaments' when active tab has no tournaments", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("status=active")
      );
      mockQuerySuccess([]);
      renderComponent();
      expect(screen.getByTestId("empty-state")).toHaveTextContent(
        "No active tournaments"
      );
    });

    it("shows 'No draft tournaments' when draft tab has no tournaments", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("status=draft")
      );
      mockQuerySuccess([]);
      renderComponent();
      expect(screen.getByTestId("empty-state")).toHaveTextContent(
        "No draft tournaments"
      );
    });
  });

  describe("All view — grouped sections", () => {
    it("renders all section components when tournaments of every status are present", () => {
      mockQuerySuccess([
        makeTournament({ status: "active" }),
        makeTournament({ id: 2, status: "upcoming" }),
        makeTournament({ id: 3, status: "draft" }),
        makeTournament({ id: 4, status: "completed" }),
        makeTournament({ id: 5, status: "cancelled" }),
      ]);
      renderComponent();

      expect(screen.getByTestId("active-tournaments")).toBeInTheDocument();
      expect(screen.getAllByTestId("upcoming-tournaments")).toHaveLength(2); // upcoming + draft both use UpcomingTournaments
      expect(screen.getAllByTestId("completed-tournaments")).toHaveLength(2); // completed + cancelled both use CompletedTournaments
    });

    it("renders section headers with correct counts for each status group", () => {
      mockQuerySuccess([
        makeTournament({ status: "active" }),
        makeTournament({ id: 2, status: "upcoming" }),
        makeTournament({ id: 3, status: "draft" }),
        makeTournament({ id: 4, status: "completed" }),
        makeTournament({ id: 5, status: "cancelled" }),
      ]);
      renderComponent();

      expect(screen.getByTestId("section-in progress")).toBeInTheDocument();
      expect(screen.getByTestId("section-upcoming")).toBeInTheDocument();
      expect(screen.getByTestId("section-draft")).toBeInTheDocument();
      expect(screen.getByTestId("section-completed")).toBeInTheDocument();
      expect(screen.getByTestId("section-cancelled")).toBeInTheDocument();
    });

    it("does not render sections whose status group is empty", () => {
      mockQuerySuccess([makeTournament({ status: "upcoming" })]);
      renderComponent();

      expect(
        screen.queryByTestId("active-tournaments")
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("section-draft")).not.toBeInTheDocument();
      expect(screen.queryByTestId("section-completed")).not.toBeInTheDocument();
      expect(screen.queryByTestId("section-cancelled")).not.toBeInTheDocument();
    });
  });

  describe("Status tab switching", () => {
    it("calls router.push with status=draft when Draft tab is clicked", async () => {
      const user = userEvent.setup();
      mockQuerySuccess([]);
      renderComponent();

      const draftTab = screen.getByRole("tab", { name: /draft/i });
      await user.click(draftTab);

      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining("status=draft")
      );
    });

    it("calls router.push without status= when All tab is clicked from a filtered view", async () => {
      const user = userEvent.setup();
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("status=active")
      );
      mockQuerySuccess([]);
      renderComponent();

      const allTab = screen.getByRole("tab", { name: /^all$/i });
      await user.click(allTab);

      const pushCall = mockRouter.push.mock.calls[0]?.[0] as string;
      expect(pushCall).not.toContain("status=");
    });
  });

  describe("Filtered views", () => {
    it.each([
      ["active", "active-tournaments"],
      ["upcoming", "upcoming-tournaments"],
      ["draft", "upcoming-tournaments"],
      ["completed", "completed-tournaments"],
      ["cancelled", "completed-tournaments"],
    ])(
      "renders %s status using the correct list component (%s testid)",
      (status, testId) => {
        (useSearchParams as jest.Mock).mockReturnValue(
          new URLSearchParams(`status=${status}`)
        );
        mockQuerySuccess([makeTournament({ status })]);
        renderComponent();

        expect(screen.getByTestId(testId)).toBeInTheDocument();
      }
    );
  });
});
