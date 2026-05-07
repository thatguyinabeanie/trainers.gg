import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...props} />,
}));
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    render,
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
    nativeButton?: boolean;
    size?: string;
    variant?: string;
    className?: string;
  }) => {
    if (render && render.props?.href) {
      return <a href={render.props.href}>{children}</a>;
    }
    return <button>{children}</button>;
  },
}));

import { CommunityHighlights } from "../community-highlights";

describe("CommunityHighlights", () => {
  it("shows empty state when no communities", () => {
    render(<CommunityHighlights communities={[]} />);
    expect(
      screen.getByText("Not part of any communities yet")
    ).toBeInTheDocument();
    expect(screen.getByText("Browse Communities")).toBeInTheDocument();
  });

  it("renders community names as links", () => {
    const communities = [
      {
        id: 1,
        name: "VGC League",
        slug: "vgc-league",
        logoUrl: null,
        hasLiveTournament: false,
      },
    ];
    render(<CommunityHighlights communities={communities} />);
    const link = screen.getByText("VGC League").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/community/vgc-league");
  });

  it("shows Live tournament indicator when hasLiveTournament is true", () => {
    const communities = [
      {
        id: 1,
        name: "Active League",
        slug: "active-league",
        logoUrl: null,
        hasLiveTournament: true,
      },
    ];
    render(<CommunityHighlights communities={communities} />);
    expect(screen.getByText("Live tournament")).toBeInTheDocument();
  });

  it("does not show Live tournament when hasLiveTournament is false", () => {
    const communities = [
      {
        id: 1,
        name: "Quiet League",
        slug: "quiet-league",
        logoUrl: null,
        hasLiveTournament: false,
      },
    ];
    render(<CommunityHighlights communities={communities} />);
    expect(screen.queryByText("Live tournament")).not.toBeInTheDocument();
  });

  it("shows community logo when logoUrl is present", () => {
    const communities = [
      {
        id: 1,
        name: "Logo League",
        slug: "logo-league",
        logoUrl: "https://example.com/logo.png",
        hasLiveTournament: false,
      },
    ];
    render(<CommunityHighlights communities={communities} />);
    const img = screen.getByAltText("Logo League");
    expect(img).toHaveAttribute("src", "https://example.com/logo.png");
  });
});
