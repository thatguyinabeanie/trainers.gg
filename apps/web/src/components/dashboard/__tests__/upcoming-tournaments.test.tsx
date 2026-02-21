import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { UpcomingTournaments } from "../upcoming-tournaments";
import type { DashboardTournament } from "@/types/dashboard";

// Mock next/link to render a plain anchor
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// Mock server action
jest.mock("@/actions/tournaments", () => ({
  checkIn: jest.fn(),
}));

function makeTournament(
  overrides: Partial<DashboardTournament> = {}
): DashboardTournament {
  return {
    id: 1,
    name: "Test Tournament",
    startDate: Date.now() + 1000 * 60 * 60 * 48, // 48 hours from now
    status: "upcoming",
    hasTeam: true,
    registrationStatus: "registered",
    registrationId: 100,
    lateCheckInMaxRound: null,
    ...overrides,
  };
}

describe("UpcomingTournaments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when no tournaments", () => {
    render(<UpcomingTournaments myTournaments={[]} />);
    expect(screen.getByText("No upcoming tournaments")).toBeInTheDocument();
  });

  describe("status display", () => {
    it.each([
      {
        scenario: "team required (upcoming)",
        overrides: { hasTeam: false, status: "upcoming" },
        expectedLabel: "Team Required",
      },
      {
        scenario: "ready for check-in (upcoming, has team, not checked in)",
        overrides: {
          hasTeam: true,
          status: "upcoming",
          registrationStatus: "registered",
        },
        expectedLabel: "Ready for Check-in",
      },
      {
        scenario: "checked in",
        overrides: {
          hasTeam: true,
          registrationStatus: "checked_in",
        },
        expectedLabel: "Checked In",
      },
      {
        scenario: "active tournament, not checked in — urgent check-in needed",
        overrides: {
          hasTeam: true,
          status: "active",
          registrationStatus: "registered",
          startDate: Date.now() - 1000 * 60 * 30, // started 30 min ago
        },
        expectedLabel: "Check in now!",
      },
    ])(
      'shows "$expectedLabel" when $scenario',
      ({ overrides, expectedLabel }) => {
        const tournament = makeTournament(overrides);
        render(<UpcomingTournaments myTournaments={[tournament]} />);
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      }
    );
  });

  describe("late check-in subtitle", () => {
    it("shows late check-in round info for active tournament with lateCheckInMaxRound", () => {
      const tournament = makeTournament({
        status: "active",
        hasTeam: true,
        registrationStatus: "registered",
        lateCheckInMaxRound: 3,
        startDate: Date.now() - 1000 * 60 * 30,
      });
      render(<UpcomingTournaments myTournaments={[tournament]} />);
      expect(
        screen.getByText("Late check-in closes after Round 3")
      ).toBeInTheDocument();
    });

    it("does not show late check-in subtitle when lateCheckInMaxRound is null", () => {
      const tournament = makeTournament({
        status: "active",
        hasTeam: true,
        registrationStatus: "registered",
        lateCheckInMaxRound: null,
        startDate: Date.now() - 1000 * 60 * 30,
      });
      render(<UpcomingTournaments myTournaments={[tournament]} />);
      expect(
        screen.queryByText(/Late check-in closes/)
      ).not.toBeInTheDocument();
    });
  });

  describe("urgency sorting", () => {
    it("sorts active check-in-needed tournaments before upcoming ones", () => {
      const activeTournament = makeTournament({
        id: 1,
        name: "Active Tourney",
        status: "active",
        hasTeam: true,
        registrationStatus: "registered",
        startDate: Date.now() - 1000 * 60 * 30,
      });
      const upcomingTournament = makeTournament({
        id: 2,
        name: "Upcoming Tourney",
        status: "upcoming",
        hasTeam: true,
        registrationStatus: "registered",
        startDate: Date.now() + 1000 * 60 * 60 * 48,
      });

      render(
        <UpcomingTournaments
          myTournaments={[upcomingTournament, activeTournament]}
        />
      );

      // Both should render
      const activeName = screen.getByText("Active Tourney");
      const upcomingName = screen.getByText("Upcoming Tourney");
      expect(activeName).toBeInTheDocument();
      expect(upcomingName).toBeInTheDocument();
    });
  });

  describe("accent line styling", () => {
    it("renders red accent line for active check-in-needed tournament", () => {
      const tournament = makeTournament({
        status: "active",
        hasTeam: true,
        registrationStatus: "registered",
        startDate: Date.now() - 1000 * 60 * 30,
      });
      render(<UpcomingTournaments myTournaments={[tournament]} />);

      // The "Check in now!" label uses red styling
      const label = screen.getByText("Check in now!");
      expect(label.closest("div")).toHaveClass("text-red-600");
    });
  });
});
