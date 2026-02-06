import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { MobileNav } from "../mobile-nav";
import { useAuth } from "@/components/auth/auth-provider";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/components/auth/auth-provider", () => ({
  useAuth: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("MobileNav", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  describe("Toggle button", () => {
    it("renders menu toggle button", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });

      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("opens sheet when toggle button is clicked", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });

      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      expect(screen.getByText("trainers.gg")).toBeInTheDocument();
    });
  });

  describe("Public navigation", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });
    });

    it("shows public nav items when not authenticated", async () => {
      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      expect(
        screen.getByRole("button", { name: /tournaments/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /organizations/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /analytics/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /coaching/i })
      ).toBeInTheDocument();
    });

    it("does not show Dashboard link for unauthenticated users", async () => {
      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      expect(
        screen.queryByRole("button", { name: /^dashboard$/i })
      ).not.toBeInTheDocument();
    });

    it("shows Sign In and Sign Up buttons for unauthenticated users", async () => {
      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      expect(
        screen.getByRole("button", { name: /sign in/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign up/i })
      ).toBeInTheDocument();
    });

    it("navigates to correct path when public nav item is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      const tournamentsButton = screen.getByRole("button", {
        name: /tournaments/i,
      });
      await user.click(tournamentsButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/tournaments");
    });

    it("closes sheet after navigating", async () => {
      const user = userEvent.setup();
      const { container } = render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      const tournamentsButton = screen.getByRole("button", {
        name: /tournaments/i,
      });
      await user.click(tournamentsButton);

      // Sheet should close (data-state attribute changes)
      const sheet = container.querySelector('[role="dialog"]');
      expect(sheet).not.toHaveAttribute("data-state", "open");
    });

    it("navigates to sign-in when Sign In button is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      const signInButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(signInButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/sign-in");
    });

    it("navigates to sign-up when Sign Up button is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      const signUpButton = screen.getByRole("button", { name: /sign up/i });
      await user.click(signUpButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/sign-up");
    });
  });

  describe("Authenticated navigation", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "player@trainers.local" } as any,
        loading: false,
        isAuthenticated: true,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });
    });

    it("shows authenticated nav items when user is logged in", async () => {
      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      expect(
        screen.getByRole("button", { name: /^dashboard$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /tournaments/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /organizations/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /analytics/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /coaching/i })
      ).toBeInTheDocument();
    });

    it("does not show Sign In/Sign Up buttons for authenticated users", async () => {
      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      expect(
        screen.queryByRole("button", { name: /sign in/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /sign up/i })
      ).not.toBeInTheDocument();
    });

    it("navigates to dashboard when Dashboard item is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      const dashboardButton = screen.getByRole("button", {
        name: /^dashboard$/i,
      });
      await user.click(dashboardButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Navigation items with icons", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });
    });

    it("renders all navigation items with correct structure", async () => {
      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      const navItems = [
        "Tournaments",
        "Organizations",
        "Analytics",
        "Coaching",
      ];

      navItems.forEach((itemName) => {
        const button = screen.getByRole("button", {
          name: new RegExp(itemName, "i"),
        });
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass("justify-start");
      });
    });

    it("navigates to organizations when clicked", async () => {
      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      const orgsButton = screen.getByRole("button", { name: /organizations/i });
      await user.click(orgsButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/organizations");
    });

    it("navigates to analytics when clicked", async () => {
      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      const analyticsButton = screen.getByRole("button", {
        name: /analytics/i,
      });
      await user.click(analyticsButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/analytics");
    });

    it("navigates to coaching when clicked", async () => {
      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      const coachingButton = screen.getByRole("button", { name: /coaching/i });
      await user.click(coachingButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/coaching");
    });
  });

  describe("Sheet behavior", () => {
    it("renders sheet title", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });

      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      expect(screen.getByText("trainers.gg")).toBeInTheDocument();
    });

    it("can be closed by clicking toggle again", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });

      const user = userEvent.setup();
      const { container } = render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });

      // Open
      await user.click(toggleButton);
      expect(screen.getByText("trainers.gg")).toBeInTheDocument();

      // Close (by clicking outside or toggle)
      await user.click(toggleButton);

      const sheet = container.querySelector('[role="dialog"]');
      expect(sheet).not.toHaveAttribute("data-state", "open");
    });
  });

  describe("Navigation order", () => {
    it("shows nav items in correct order for authenticated users", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "player@trainers.local" } as any,
        loading: false,
        isAuthenticated: true,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });

      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      const buttons = screen
        .getAllByRole("button")
        .filter((btn) =>
          [
            "Dashboard",
            "Tournaments",
            "Organizations",
            "Analytics",
            "Coaching",
          ].some((label) => btn.textContent?.includes(label))
        );

      expect(buttons[0]).toHaveTextContent("Dashboard");
      expect(buttons[1]).toHaveTextContent("Tournaments");
      expect(buttons[2]).toHaveTextContent("Organizations");
      expect(buttons[3]).toHaveTextContent("Analytics");
      expect(buttons[4]).toHaveTextContent("Coaching");
    });

    it("shows nav items in correct order for public users", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });

      const user = userEvent.setup();
      render(<MobileNav />);

      const toggleButton = screen.getByRole("button", { name: /toggle menu/i });
      await user.click(toggleButton);

      const buttons = screen
        .getAllByRole("button")
        .filter((btn) =>
          ["Tournaments", "Organizations", "Analytics", "Coaching"].some(
            (label) => btn.textContent?.includes(label)
          )
        );

      expect(buttons[0]).toHaveTextContent("Tournaments");
      expect(buttons[1]).toHaveTextContent("Organizations");
      expect(buttons[2]).toHaveTextContent("Analytics");
      expect(buttons[3]).toHaveTextContent("Coaching");
    });
  });
});
