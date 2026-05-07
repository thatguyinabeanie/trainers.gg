import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));
jest.mock("@/actions/tournaments", () => ({
  checkIn: jest.fn(),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// Mock Button to render simply (avoids Base UI render prop complexity)
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    render,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
    onClick?: () => void;
    disabled?: boolean;
    nativeButton?: boolean;
    size?: string;
    variant?: string;
    className?: string;
  }) => {
    if (render && render.props?.href) {
      return <a href={render.props.href}>{children}</a>;
    }
    return (
      <button onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    );
  },
}));

import { checkIn } from "@/actions/tournaments";
import { toast } from "sonner";
import { DashboardActivity } from "../dashboard-activity";

const mockedCheckIn = checkIn as jest.MockedFunction<typeof checkIn>;

describe("DashboardActivity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Fix Date.now to a known value
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-25T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders both panels", () => {
    render(<DashboardActivity myTournaments={[]} recentActivity={[]} />);
    expect(screen.getByText("Upcoming Tournaments")).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });

  describe("UpcomingTournamentsList", () => {
    it("shows empty state with Find Tournaments button", () => {
      render(<DashboardActivity myTournaments={[]} recentActivity={[]} />);
      expect(screen.getByText("No upcoming tournaments")).toBeInTheDocument();
      expect(screen.getByText("Find Tournaments")).toBeInTheDocument();
    });

    it("renders tournament names and dates", () => {
      const tournaments = [
        {
          id: 1,
          name: "VGC Cup",
          slug: "vgc-cup",
          startDate: new Date("2026-03-25T18:00:00.000Z").getTime(),
          status: "upcoming",
          hasTeam: true,
          registrationStatus: "checked_in",
          registrationId: 1,
          lateCheckInMaxRound: null,
        },
      ];
      render(
        <DashboardActivity myTournaments={tournaments} recentActivity={[]} />
      );
      expect(screen.getByText("VGC Cup")).toBeInTheDocument();
      expect(screen.getByText("Today")).toBeInTheDocument();
      expect(screen.getByText("Checked In")).toBeInTheDocument();
    });

    it("shows Tomorrow for 24-48h away", () => {
      const tournaments = [
        {
          id: 1,
          name: "Tomorrow Cup",
          slug: "tomorrow-cup",
          startDate: new Date("2026-03-26T18:00:00.000Z").getTime(),
          status: "upcoming",
          hasTeam: true,
          registrationStatus: "checked_in",
          registrationId: 1,
          lateCheckInMaxRound: null,
        },
      ];
      render(
        <DashboardActivity myTournaments={tournaments} recentActivity={[]} />
      );
      expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    });

    it("shows In X days for 2-7 days away", () => {
      const tournaments = [
        {
          id: 1,
          name: "Future Cup",
          slug: "future-cup",
          startDate: new Date("2026-03-28T12:00:00.000Z").getTime(),
          status: "upcoming",
          hasTeam: true,
          registrationStatus: "checked_in",
          registrationId: 1,
          lateCheckInMaxRound: null,
        },
      ];
      render(
        <DashboardActivity myTournaments={tournaments} recentActivity={[]} />
      );
      expect(screen.getByText("In 3 days")).toBeInTheDocument();
    });

    it("shows formatted date for > 7 days away", () => {
      const tournaments = [
        {
          id: 1,
          name: "Far Cup",
          slug: "far-cup",
          startDate: new Date("2026-04-15T12:00:00.000Z").getTime(),
          status: "upcoming",
          hasTeam: true,
          registrationStatus: "checked_in",
          registrationId: 1,
          lateCheckInMaxRound: null,
        },
      ];
      render(
        <DashboardActivity myTournaments={tournaments} recentActivity={[]} />
      );
      expect(screen.getByText("Apr 15")).toBeInTheDocument();
    });

    it("shows In Progress for past start dates", () => {
      const tournaments = [
        {
          id: 1,
          name: "Active Cup",
          slug: "active-cup",
          startDate: new Date("2026-03-25T10:00:00.000Z").getTime(),
          status: "active",
          hasTeam: true,
          registrationStatus: "checked_in",
          registrationId: 1,
          lateCheckInMaxRound: null,
        },
      ];
      render(
        <DashboardActivity myTournaments={tournaments} recentActivity={[]} />
      );
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("shows Date TBD for null startDate", () => {
      const tournaments = [
        {
          id: 1,
          name: "TBD Cup",
          slug: "tbd-cup",
          startDate: null,
          status: "upcoming",
          hasTeam: true,
          registrationStatus: "checked_in",
          registrationId: 1,
          lateCheckInMaxRound: null,
        },
      ];
      render(
        <DashboardActivity myTournaments={tournaments} recentActivity={[]} />
      );
      expect(screen.getByText("Date TBD")).toBeInTheDocument();
    });

    it("shows Team Required when !hasTeam", () => {
      const tournaments = [
        {
          id: 1,
          name: "No Team",
          slug: "no-team",
          startDate: new Date("2026-03-26T12:00:00.000Z").getTime(),
          status: "upcoming",
          hasTeam: false,
          registrationStatus: "registered",
          registrationId: 1,
          lateCheckInMaxRound: null,
        },
      ];
      render(
        <DashboardActivity myTournaments={tournaments} recentActivity={[]} />
      );
      expect(screen.getByText("Team Required")).toBeInTheDocument();
    });

    it("shows Check in now! when active and not checked in", () => {
      const tournaments = [
        {
          id: 1,
          name: "Urgent",
          slug: "urgent",
          startDate: new Date("2026-03-25T10:00:00.000Z").getTime(),
          status: "active",
          hasTeam: true,
          registrationStatus: "registered",
          registrationId: 1,
          lateCheckInMaxRound: null,
        },
      ];
      render(
        <DashboardActivity myTournaments={tournaments} recentActivity={[]} />
      );
      expect(screen.getByText("Check in now!")).toBeInTheDocument();
    });

    it("shows Ready for Check-in when hasTeam and not checked in", () => {
      const tournaments = [
        {
          id: 1,
          name: "Ready",
          slug: "ready",
          startDate: new Date("2026-03-26T12:00:00.000Z").getTime(),
          status: "upcoming",
          hasTeam: true,
          registrationStatus: "registered",
          registrationId: 1,
          lateCheckInMaxRound: null,
        },
      ];
      render(
        <DashboardActivity myTournaments={tournaments} recentActivity={[]} />
      );
      expect(screen.getByText("Ready for Check-in")).toBeInTheDocument();
    });

    it("check-in button calls action and shows toast on success", async () => {
      mockedCheckIn.mockResolvedValue({ success: true });
      const tournaments = [
        {
          id: 42,
          name: "Check In Test",
          slug: "check-in-test",
          startDate: new Date("2026-03-26T12:00:00.000Z").getTime(),
          status: "upcoming",
          hasTeam: true,
          registrationStatus: "registered",
          registrationId: 1,
          lateCheckInMaxRound: null,
        },
      ];
      render(
        <DashboardActivity myTournaments={tournaments} recentActivity={[]} />
      );
      fireEvent.click(screen.getByText("Check In"));
      await waitFor(() => {
        expect(mockedCheckIn).toHaveBeenCalledWith(42);
      });
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Successfully checked in!");
      });
    });

    it("check-in shows error toast on failure", async () => {
      mockedCheckIn.mockResolvedValue({
        success: false,
        error: "Already checked in",
      });
      const tournaments = [
        {
          id: 42,
          name: "Fail Test",
          slug: "fail-test",
          startDate: new Date("2026-03-26T12:00:00.000Z").getTime(),
          status: "upcoming",
          hasTeam: true,
          registrationStatus: "registered",
          registrationId: 1,
          lateCheckInMaxRound: null,
        },
      ];
      render(
        <DashboardActivity myTournaments={tournaments} recentActivity={[]} />
      );
      fireEvent.click(screen.getByText("Check In"));
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Already checked in");
      });
    });
  });

  describe("RecentActivityList", () => {
    it("shows empty state", () => {
      render(<DashboardActivity myTournaments={[]} recentActivity={[]} />);
      expect(screen.getByText("No recent battles")).toBeInTheDocument();
    });

    it("renders win/loss indicators", () => {
      const activities = [
        {
          id: 1,
          tournamentName: "VGC Cup",
          opponentName: "Ash",
          result: "won",
          date: new Date("2026-03-25T11:00:00.000Z").getTime(),
        },
        {
          id: 2,
          tournamentName: "VGC Cup",
          opponentName: "Gary",
          result: "lost",
          date: new Date("2026-03-25T10:00:00.000Z").getTime(),
        },
      ];
      render(
        <DashboardActivity myTournaments={[]} recentActivity={activities} />
      );
      expect(screen.getByText("W")).toBeInTheDocument();
      expect(screen.getByText("L")).toBeInTheDocument();
      expect(screen.getByText("Ash")).toBeInTheDocument();
      expect(screen.getByText("Gary")).toBeInTheDocument();
    });

    it("shows relative time for recent activities", () => {
      const activities = [
        {
          id: 1,
          tournamentName: "VGC Cup",
          opponentName: "Ash",
          result: "won",
          date: new Date("2026-03-25T11:30:00.000Z").getTime(),
        },
      ];
      render(
        <DashboardActivity myTournaments={[]} recentActivity={activities} />
      );
      expect(screen.getByText("30m ago")).toBeInTheDocument();
    });
  });
});
