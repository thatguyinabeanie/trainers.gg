import { render, screen } from "@testing-library/react";

// Mock next/navigation before importing the component
const mockUsePathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock next/link — render as a plain anchor
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

import { AdminNav } from "../admin-nav";

describe("AdminNav", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all nav items", () => {
    mockUsePathname.mockReturnValue("/admin");
    render(<AdminNav />);

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Communities")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders correct hrefs for each nav item", () => {
    mockUsePathname.mockReturnValue("/admin");
    render(<AdminNav />);

    expect(screen.getByText("Overview").closest("a")).toHaveAttribute(
      "href",
      "/admin"
    );
    expect(screen.getByText("Users").closest("a")).toHaveAttribute(
      "href",
      "/admin/users"
    );
    expect(screen.getByText("Communities").closest("a")).toHaveAttribute(
      "href",
      "/admin/communities"
    );
    expect(screen.getByText("Settings").closest("a")).toHaveAttribute(
      "href",
      "/admin/config"
    );
  });

  describe("active link detection — exact match for /admin", () => {
    it("marks Overview active when pathname is exactly /admin", () => {
      mockUsePathname.mockReturnValue("/admin");
      render(<AdminNav />);

      const overviewLink = screen.getByText("Overview").closest("a");
      expect(overviewLink?.className).toContain("border-primary");
    });

    it("does not mark Overview active when pathname is /admin/users", () => {
      mockUsePathname.mockReturnValue("/admin/users");
      render(<AdminNav />);

      const overviewLink = screen.getByText("Overview").closest("a");
      expect(overviewLink?.className).not.toContain("border-primary");
      expect(overviewLink?.className).toContain("border-transparent");
    });
  });

  describe("active link detection — prefix match for sub-routes", () => {
    it.each([
      ["/admin/users", "Users"],
      ["/admin/users/some-id", "Users"],
      ["/admin/communities", "Communities"],
      ["/admin/communities/123", "Communities"],
      ["/admin/config", "Settings"],
      ["/admin/config/flags", "Settings"],
    ])("marks %s item active when pathname is %s", (pathname, label) => {
      mockUsePathname.mockReturnValue(pathname);
      render(<AdminNav />);

      const activeLink = screen.getByText(label).closest("a");
      expect(activeLink?.className).toContain("border-primary");
    });

    it("marks only the matching item active", () => {
      mockUsePathname.mockReturnValue("/admin/users");
      render(<AdminNav />);

      const usersLink = screen.getByText("Users").closest("a");
      const communitiesLink = screen.getByText("Communities").closest("a");

      expect(usersLink?.className).toContain("border-primary");
      expect(communitiesLink?.className).not.toContain("border-primary");
    });
  });

  it("renders as a nav element", () => {
    mockUsePathname.mockReturnValue("/admin");
    render(<AdminNav />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
