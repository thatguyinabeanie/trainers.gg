// --- next/link ---
jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

import { render, screen } from "@testing-library/react";
import React from "react";

import { LiveMatchBar } from "../live-match-bar";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMatch(
  overrides: Partial<React.ComponentProps<typeof LiveMatchBar>["match"]> = {}
): React.ComponentProps<typeof LiveMatchBar>["match"] {
  return {
    tournamentName: "Pallet Town Open",
    tournamentSlug: "pallet-town-open",
    roundNumber: 3,
    opponent: null,
    table: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LiveMatchBar", () => {
  it("renders tournament name and round number", () => {
    render(<LiveMatchBar match={buildMatch()} />);
    expect(screen.getByText(/Pallet Town Open/)).toBeInTheDocument();
    expect(screen.getByText(/Round 3/)).toBeInTheDocument();
  });

  it("renders link to the tournament page", () => {
    render(<LiveMatchBar match={buildMatch()} />);
    const link = screen.getByRole("link", { name: /Go to match/ });
    expect(link).toHaveAttribute("href", "/tournaments/pallet-town-open");
  });

  it("renders opponent username when present", () => {
    render(
      <LiveMatchBar match={buildMatch({ opponent: { username: "cynthia" } })} />
    );
    expect(screen.getByText("cynthia")).toBeInTheDocument();
    expect(screen.getByText(/You vs/)).toBeInTheDocument();
  });

  it("does not render opponent section when opponent is null", () => {
    render(<LiveMatchBar match={buildMatch({ opponent: null })} />);
    expect(screen.queryByText(/You vs/)).not.toBeInTheDocument();
  });

  it("renders table number when present", () => {
    render(<LiveMatchBar match={buildMatch({ table: 5 })} />);
    expect(screen.getByText(/Table 5/)).toBeInTheDocument();
  });

  it("does not render table when table is null", () => {
    render(<LiveMatchBar match={buildMatch({ table: null })} />);
    expect(screen.queryByText(/Table/)).not.toBeInTheDocument();
  });

  it("renders all match details together", () => {
    render(
      <LiveMatchBar
        match={buildMatch({
          tournamentName: "VGC League Finals",
          tournamentSlug: "vgc-finals",
          roundNumber: 1,
          opponent: { username: "red" },
          table: 12,
        })}
      />
    );

    expect(screen.getByText(/VGC League Finals/)).toBeInTheDocument();
    expect(screen.getByText(/Round 1/)).toBeInTheDocument();
    expect(screen.getByText("red")).toBeInTheDocument();
    expect(screen.getByText(/Table 12/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to match/ })).toHaveAttribute(
      "href",
      "/tournaments/vgc-finals"
    );
  });
});
