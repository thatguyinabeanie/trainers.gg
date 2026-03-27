import { render, screen } from "@testing-library/react";
import { OrganizationsDataTable } from "../organizations-data-table";
import { type OrganizationWithCounts } from "@trainers/supabase";
import type React from "react";

// Mock Next.js Link component
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = "MockLink";
  return MockLink;
});

describe("OrganizationsDataTable", () => {
  const mockOrganizations: OrganizationWithCounts[] = [
    {
      id: 1,
      name: "VGC League",
      slug: "vgc-league",
      description: "Premier VGC tournament organizer",
      tier: "partner",
      status: "active",
      logo_url: "https://example.com/vgc-logo.png",
      icon: "🏆",
      owner_user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      social_links: [],
      platform_fee_percentage: null,
      subscription_tier: null,
      subscription_started_at: null,
      subscription_expires_at: null,
      activeTournamentsCount: 5,
      totalTournamentsCount: 20,
    },
    {
      id: 2,
      name: "TCG Masters",
      slug: "tcg-masters",
      description: "Pokemon TCG competitive events",
      tier: "verified",
      status: "active",
      logo_url: null,
      icon: null,
      owner_user_id: "user-2",
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      social_links: [],
      platform_fee_percentage: null,
      subscription_tier: null,
      subscription_started_at: null,
      subscription_expires_at: null,
      activeTournamentsCount: 2,
      totalTournamentsCount: 10,
    },
    {
      id: 3,
      name: "Battle Stadium",
      slug: "battle-stadium",
      description: null,
      tier: "standard",
      status: "active",
      logo_url: null,
      icon: null,
      owner_user_id: "user-3",
      created_at: "2024-01-03T00:00:00Z",
      updated_at: "2024-01-03T00:00:00Z",
      social_links: [],
      platform_fee_percentage: null,
      subscription_tier: null,
      subscription_started_at: null,
      subscription_expires_at: null,
      activeTournamentsCount: 0,
      totalTournamentsCount: 5,
    },
  ];

  describe("Desktop View", () => {
    it("renders all organizations in desktop table", () => {
      render(<OrganizationsDataTable data={mockOrganizations} />);

      // Check if all organization names are rendered (will appear in both desktop and mobile views)
      expect(screen.getAllByText("VGC League").length).toBeGreaterThan(0);
      expect(screen.getAllByText("TCG Masters").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Battle Stadium").length).toBeGreaterThan(0);
    });

    it("displays organization logos and icons correctly", () => {
      render(<OrganizationsDataTable data={mockOrganizations} />);

      // VGC League should show icon in fallback (testing fallback rendering)
      expect(screen.getAllByText("🏆").length).toBeGreaterThan(0);

      // TCG Masters should have initials as fallback (no logo or icon)
      expect(screen.getAllByText("TM").length).toBeGreaterThan(0);
    });

    it("displays tier badges correctly", () => {
      render(<OrganizationsDataTable data={mockOrganizations} />);

      // Partner badge (appears in both desktop and mobile views)
      expect(screen.getAllByText("Partner").length).toBeGreaterThan(0);

      // Verified badge (appears in both desktop and mobile views)
      expect(screen.getAllByText("Verified").length).toBeGreaterThan(0);

      // Standard tier should not have any badge
      const standardText = screen.queryByText("Standard");
      expect(standardText).not.toBeInTheDocument();
    });

    it("displays tournament counts correctly", () => {
      render(<OrganizationsDataTable data={mockOrganizations} />);

      // Check active tournament counts
      const cells = screen.getAllByRole("cell");
      const activeCounts = cells.filter(
        (cell) =>
          cell.textContent === "5" ||
          cell.textContent === "2" ||
          cell.textContent === "0"
      );
      expect(activeCounts.length).toBeGreaterThan(0);

      // Check total tournament counts
      const totalCounts = cells.filter(
        (cell) =>
          cell.textContent === "20" ||
          cell.textContent === "10" ||
          cell.textContent === "5"
      );
      expect(totalCounts.length).toBeGreaterThan(0);
    });

    it("renders clickable links to organization pages", () => {
      render(<OrganizationsDataTable data={mockOrganizations} />);

      const vgcLink = screen.getByRole("link", { name: "VGC League" });
      expect(vgcLink).toHaveAttribute("href", "/organizations/vgc-league");

      const tcgLink = screen.getByRole("link", { name: "TCG Masters" });
      expect(tcgLink).toHaveAttribute("href", "/organizations/tcg-masters");

      const battleLink = screen.getByRole("link", { name: "Battle Stadium" });
      expect(battleLink).toHaveAttribute(
        "href",
        "/organizations/battle-stadium"
      );
    });

    it("displays description or slug fallback", () => {
      render(<OrganizationsDataTable data={mockOrganizations} />);

      // VGC League has description (will appear in both views)
      expect(
        screen.getAllByText("Premier VGC tournament organizer").length
      ).toBeGreaterThan(0);

      // TCG Masters has description
      expect(
        screen.getAllByText("Pokemon TCG competitive events").length
      ).toBeGreaterThan(0);

      // Battle Stadium has no description, should show slug
      expect(screen.getAllByText("@battle-stadium").length).toBeGreaterThan(0);
    });

    it("renders column headers with sort buttons", () => {
      render(<OrganizationsDataTable data={mockOrganizations} />);

      // Check for column headers
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Active Tournaments")).toBeInTheDocument();
      expect(screen.getByText("Total Tournaments")).toBeInTheDocument();
    });
  });

  describe("Mobile View", () => {
    it("renders organizations as cards on mobile", () => {
      render(<OrganizationsDataTable data={mockOrganizations} />);

      // All organization names should be present in both desktop and mobile views
      expect(screen.getAllByText("VGC League").length).toBeGreaterThan(0);
      expect(screen.getAllByText("TCG Masters").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Battle Stadium").length).toBeGreaterThan(0);
    });

    it("displays tournament counts inline on mobile", () => {
      render(<OrganizationsDataTable data={mockOrganizations} />);

      // Check for inline tournament count text in mobile view
      expect(screen.getAllByText(/5 active.*20 total/).length).toBeGreaterThan(
        0
      );
      expect(screen.getAllByText(/2 active.*10 total/).length).toBeGreaterThan(
        0
      );
      expect(screen.getAllByText(/0 active.*5 total/).length).toBeGreaterThan(
        0
      );
    });

    it("renders mobile cards as clickable links", () => {
      render(<OrganizationsDataTable data={mockOrganizations} />);

      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThanOrEqual(3);

      const vgcLink = links.find(
        (link) => link.getAttribute("href") === "/organizations/vgc-league"
      );
      expect(vgcLink).toBeDefined();
    });
  });

  describe("Empty State", () => {
    it("displays empty state when no organizations", () => {
      render(<OrganizationsDataTable data={[]} />);

      expect(screen.getByText("No organizations found")).toBeInTheDocument();
    });
  });

  describe("Data Integrity", () => {
    it("handles organizations with zero tournament counts", () => {
      const orgWithZeroCounts: OrganizationWithCounts = {
        id: 4,
        name: "New Organization",
        slug: "new-org",
        description: "Just starting out",
        tier: "standard",
        status: "active",
        logo_url: null,
        icon: null,
        owner_user_id: "user-4",
        created_at: "2024-01-04T00:00:00Z",
        updated_at: "2024-01-04T00:00:00Z",
        social_links: [],
        platform_fee_percentage: null,
        subscription_tier: null,
        subscription_started_at: null,
        subscription_expires_at: null,
        activeTournamentsCount: 0,
        totalTournamentsCount: 0,
      };

      render(<OrganizationsDataTable data={[orgWithZeroCounts]} />);

      expect(screen.getAllByText("New Organization").length).toBeGreaterThan(0);
      // Should display 0 for both counts
      const cells = screen.getAllByText("0");
      expect(cells.length).toBeGreaterThanOrEqual(2);
    });

    it("handles organizations with null counts", () => {
      const orgWithNullCounts: OrganizationWithCounts = {
        id: 5,
        name: "Org With Null Counts",
        slug: "null-counts",
        description: "Testing null values",
        tier: "standard",
        status: "active",
        logo_url: null,
        icon: null,
        owner_user_id: "user-5",
        created_at: "2024-01-05T00:00:00Z",
        updated_at: "2024-01-05T00:00:00Z",
        social_links: [],
        platform_fee_percentage: null,
        subscription_tier: null,
        subscription_started_at: null,
        subscription_expires_at: null,
        // @ts-expect-error Testing null values
        activeTournamentsCount: null,
        // @ts-expect-error Testing null values
        totalTournamentsCount: null,
      };

      render(<OrganizationsDataTable data={[orgWithNullCounts]} />);

      expect(
        screen.getAllByText("Org With Null Counts").length
      ).toBeGreaterThan(0);
      // Should fallback to 0 for null counts
      const cells = screen.getAllByText("0");
      expect(cells.length).toBeGreaterThanOrEqual(2);
    });

    it("generates correct initials for multi-word names", () => {
      const orgWithLongName: OrganizationWithCounts = {
        id: 6,
        name: "Very Long Organization Name",
        slug: "vlon",
        description: "Testing initials",
        tier: "standard",
        status: "active",
        logo_url: null,
        icon: null,
        owner_user_id: "user-6",
        created_at: "2024-01-06T00:00:00Z",
        updated_at: "2024-01-06T00:00:00Z",
        social_links: [],
        platform_fee_percentage: null,
        subscription_tier: null,
        subscription_started_at: null,
        subscription_expires_at: null,
        activeTournamentsCount: 1,
        totalTournamentsCount: 1,
      };

      render(<OrganizationsDataTable data={[orgWithLongName]} />);

      // Should only show first 2 initials: VL (appears in both desktop and mobile views)
      expect(screen.getAllByText("VL").length).toBeGreaterThan(0);
    });
  });
});
