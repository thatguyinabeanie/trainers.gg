import { render, screen } from "@testing-library/react";

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

import { CommunityAccess } from "../community-access";

describe("CommunityAccess", () => {
  describe("empty state", () => {
    it("shows call-to-action when no communities", () => {
      render(<CommunityAccess communities={[]} />);
      expect(
        screen.getByText("Need tournament hosting permissions?")
      ).toBeInTheDocument();
    });

    it("links to the community request page when empty", () => {
      render(<CommunityAccess communities={[]} />);
      const link = screen
        .getByRole("link", { name: "Request Community Leader Role" })
        .closest("a");
      expect(link).toHaveAttribute("href", "/communities/create");
    });
  });

  describe("with communities", () => {
    const communities = [
      { id: 1, name: "Pallet Town VGC", role: "Community Leader" },
      { id: 2, name: "Cerulean Cup", role: "Admin" },
    ];

    it("renders each community name", () => {
      render(<CommunityAccess communities={communities} />);
      expect(screen.getByText("Pallet Town VGC")).toBeInTheDocument();
      expect(screen.getByText("Cerulean Cup")).toBeInTheDocument();
    });

    it("renders each community role", () => {
      render(<CommunityAccess communities={communities} />);
      expect(screen.getByText("Community Leader")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("shows Active badge for each community", () => {
      render(<CommunityAccess communities={communities} />);
      const activeBadges = screen.getAllByText("Active");
      expect(activeBadges).toHaveLength(2);
    });

    it("does not show the empty-state CTA", () => {
      render(<CommunityAccess communities={communities} />);
      expect(
        screen.queryByText("Need tournament hosting permissions?")
      ).not.toBeInTheDocument();
    });
  });
});
