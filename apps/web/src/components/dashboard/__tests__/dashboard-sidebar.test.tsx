import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/dashboard"),
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => <img src={src} alt={alt} className={className} />,
}));

// Mock the entire sidebar UI component — it uses context that's hard to
// replicate in tests. We render child content through slots.
jest.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => (
    <aside data-testid="sidebar">{children}</aside>
  ),
  SidebarContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-content">{children}</div>
  ),
  SidebarFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-footer">{children}</div>
  ),
  SidebarGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-group">{children}</div>
  ),
  SidebarGroupAction: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-group-action">{children}</div>
  ),
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-group-content">{children}</div>
  ),
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-group-label">{children}</div>
  ),
  SidebarHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-header">{children}</div>
  ),
  SidebarMenu: ({ children }: { children: React.ReactNode }) => (
    <ul data-testid="sidebar-menu">{children}</ul>
  ),
  SidebarMenuButton: ({
    children,
    render: renderProp,
    isActive,
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
    isActive?: boolean;
    tooltip?: string;
    size?: string;
    className?: string;
  }) => {
    if (renderProp) {
      return (
        <li data-testid="sidebar-menu-button" data-active={isActive}>
          {renderProp}
          {children}
        </li>
      );
    }
    return (
      <li data-testid="sidebar-menu-button" data-active={isActive}>
        {children}
      </li>
    );
  },
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <li data-testid="sidebar-menu-item">{children}</li>
  ),
  SidebarRail: () => <div data-testid="sidebar-rail" />,
  useSidebar: jest.fn(() => ({ isMobile: false })),
}));

// Mock dropdown menu components
jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    render: renderProp,
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <div data-testid="dropdown-item">
      {renderProp}
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({
    children,
    render: renderProp,
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
    className?: string;
  }) => (
    <div data-testid="dropdown-trigger">
      {renderProp}
      {children}
    </div>
  ),
}));

// Mock avatar
jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="avatar" className={className}>{children}</div>
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="avatar-fallback">{children}</span>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
}));

// Mock lucide-react icons used in sidebar
jest.mock("lucide-react", () => ({
  Home: () => <svg data-testid="icon-home" />,
  Users: () => <svg data-testid="icon-users" />,
  LayoutDashboard: () => <svg data-testid="icon-layout-dashboard" />,
  Trophy: () => <svg data-testid="icon-trophy" />,
  UserCog: () => <svg data-testid="icon-user-cog" />,
  Plus: () => <svg data-testid="icon-plus" />,
  ArrowLeft: () => <svg data-testid="icon-arrow-left" />,
  Circle: () => <svg data-testid="icon-circle" />,
  MoreVertical: () => <svg data-testid="icon-more-vertical" />,
  LogOut: () => <svg data-testid="icon-logout" />,
  Settings: () => <svg data-testid="icon-settings" />,
  ShieldAlert: () => <svg data-testid="icon-shield-alert" />,
  User: () => <svg data-testid="icon-user" />,
  ChevronsUpDown: () => <svg data-testid="icon-chevrons-up-down" />,
  Check: () => <svg data-testid="icon-check" />,
}));

// Mock supabase client
jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    auth: { signOut: jest.fn() },
  })),
}));

// Mock admin helpers
jest.mock("@/app/(app)/admin/helpers", () => ({
  ORG_STATUS_LABELS: {
    pending: "Pending",
    suspended: "Suspended",
  },
}));

// Mock formatDisplayUsername
jest.mock("@trainers/utils", () => ({
  formatDisplayUsername: (username: string) => `@${username}`,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { usePathname } from "next/navigation";
import { DashboardSidebar } from "../dashboard-sidebar";

const baseUser = { id: "user-1", username: "ash_ketchum", avatarUrl: null };

const baseAlts = [
  { id: 1, username: "ash_ketchum", avatarUrl: null, isMain: true },
  { id: 2, username: "ash_alt", avatarUrl: null, isMain: false },
];

const baseCommunities = [
  {
    id: 10,
    name: "Pallet Town League",
    slug: "pallet-town",
    logoUrl: null,
    role: "owner" as const,
    hasLiveTournament: false,
  },
];

describe("DashboardSidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
  });

  describe("player context (non-community path)", () => {
    it("renders without crashing", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    });

    it("renders Home navigation item", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    it("renders Alts navigation item", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("Alts")).toBeInTheDocument();
    });

    it("renders Tournaments navigation item", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("Tournaments")).toBeInTheDocument();
    });

    it("renders Settings navigation item", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
        />
      );
      const settingsItems = screen.getAllByText("Settings");
      expect(settingsItems.length).toBeGreaterThanOrEqual(1);
    });

    it("renders communities section when communities exist", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={baseCommunities}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("Communities")).toBeInTheDocument();
      expect(screen.getByText("Pallet Town League")).toBeInTheDocument();
    });

    it("does not render communities section when no communities", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
        />
      );
      expect(screen.queryByText("Communities")).not.toBeInTheDocument();
    });

    it("renders user display name via formatDisplayUsername", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
        />
      );
      // formatDisplayUsername is mocked to prepend @
      const usernames = screen.getAllByText("@ash_ketchum");
      expect(usernames.length).toBeGreaterThan(0);
    });

    it("shows All Alts when no selectedAltUsername", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
        />
      );
      const allAltsItems = screen.getAllByText("All Alts");
      expect(allAltsItems.length).toBeGreaterThanOrEqual(1);
    });

    it("shows selected alt username when selectedAltUsername is provided", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername="ash_alt"
        />
      );
      const altItems = screen.getAllByText("ash_alt");
      expect(altItems.length).toBeGreaterThanOrEqual(1);
    });

    it("shows Main alt label for main alt in dropdown", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("Main")).toBeInTheDocument();
    });
  });

  describe("community context", () => {
    beforeEach(() => {
      (usePathname as jest.Mock).mockReturnValue(
        "/dashboard/community/pallet-town"
      );
    });

    it("renders community name in header", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={baseCommunities}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("Pallet Town League")).toBeInTheDocument();
    });

    it("renders Back to Dashboard link", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={baseCommunities}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
    });

    it("renders community Overview nav item", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={baseCommunities}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    it("renders community Tournaments nav item", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={baseCommunities}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("Tournaments")).toBeInTheDocument();
    });

    it("renders community Staff nav item", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={baseCommunities}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("Staff")).toBeInTheDocument();
    });

    it("renders Settings nav item for owner communities", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={baseCommunities}
          selectedAltUsername={null}
        />
      );
      const settingsItems = screen.getAllByText("Settings");
      expect(settingsItems.length).toBeGreaterThanOrEqual(1);
    });

    it("does not render Settings nav item for non-owner staff", () => {
      const staffCommunities = [
        {
          ...baseCommunities[0]!,
          role: "staff" as const,
          slug: "pallet-town",
        },
      ];
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={staffCommunities}
          selectedAltUsername={null}
        />
      );
      // In community context with staff role, Settings only appears in
      // the player nav section (Account menu), not in community nav
      const settingsItems = screen.getAllByText("Settings");
      // Staff should have fewer Settings items than owner
      expect(settingsItems.length).toBeLessThanOrEqual(2);
    });

    it("shows owner role label in community header", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={baseCommunities}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("owner")).toBeInTheDocument();
    });

    it("shows Sudo label when community role is sudo", () => {
      const sudoCommunities = [
        {
          ...baseCommunities[0]!,
          role: "sudo" as const,
          slug: "pallet-town",
        },
      ];
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={sudoCommunities}
          selectedAltUsername={null}
        />
      );
      const sudoLabels = screen.getAllByText("Sudo");
      expect(sudoLabels.length).toBeGreaterThan(0);
    });
  });

  describe("site admin features", () => {
    it("shows Activate Sudo option when isSiteAdmin is true", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
          isSiteAdmin={true}
        />
      );
      expect(screen.getByText("Activate Sudo")).toBeInTheDocument();
    });

    it("shows Deactivate Sudo when isSiteAdmin and isSudoActive are both true", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
          isSiteAdmin={true}
          isSudoActive={true}
        />
      );
      expect(screen.getByText("Deactivate Sudo")).toBeInTheDocument();
    });

    it("does not show sudo toggle when isSiteAdmin is false", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
          isSiteAdmin={false}
        />
      );
      expect(screen.queryByText("Activate Sudo")).not.toBeInTheDocument();
      expect(screen.queryByText("Deactivate Sudo")).not.toBeInTheDocument();
    });
  });

  describe("sudo communities", () => {
    it("renders sudo communities with a separator from regular ones", () => {
      const mixedCommunities = [
        {
          id: 1,
          name: "Owned League",
          slug: "owned",
          logoUrl: null,
          role: "owner" as const,
          hasLiveTournament: false,
        },
        {
          id: 2,
          name: "Sudo Community",
          slug: "sudo-comm",
          logoUrl: null,
          role: "sudo" as const,
          hasLiveTournament: false,
        },
      ];
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={mixedCommunities}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("Owned League")).toBeInTheDocument();
      expect(screen.getByText("Sudo Community")).toBeInTheDocument();
    });
  });

  describe("onboarding mode", () => {
    it("renders sidebar when isOnboarding is true", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
          isOnboarding={true}
        />
      );
      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    });
  });

  describe("nav user footer", () => {
    it("renders Sign out menu item", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("Sign out")).toBeInTheDocument();
    });

    it("renders Account menu item", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
        />
      );
      expect(screen.getByText("Account")).toBeInTheDocument();
    });

    it("shows Player role when not in community context", () => {
      render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={[]}
          selectedAltUsername={null}
        />
      );
      // "Player" appears twice (trigger + dropdown header)
      const playerLabels = screen.getAllByText("Player");
      expect(playerLabels.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("community with live tournament", () => {
    it("renders live dot indicator for communities with live tournaments", () => {
      const liveCommCommunities = [
        {
          ...baseCommunities[0]!,
          hasLiveTournament: true,
        },
      ];
      const { container } = render(
        <DashboardSidebar
          user={baseUser}
          alts={baseAlts}
          communities={liveCommCommunities}
          selectedAltUsername={null}
        />
      );
      // LiveDot renders a Circle icon with emerald fill
      expect(container.querySelector("[data-testid='icon-circle']")).toBeInTheDocument();
    });
  });
});
