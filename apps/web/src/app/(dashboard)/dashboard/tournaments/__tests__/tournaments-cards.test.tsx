// --- @trainers/pokemon/sprites ---
jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn(() => ({ url: "/sprite.png", pixelated: true })),
}));

// --- next/image ---
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

// --- next/link ---
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  ChevronDown: () => <svg data-testid="icon-chevron-down" />,
  ChevronRight: () => <svg data-testid="icon-chevron-right" />,
}));

// --- @/components/ui/badge ---
jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

// --- @/lib/utils ---
jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) =>
    args
      .filter((a) => typeof a === "string")
      .join(" ")
      .trim(),
}));

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import {
  TournamentsCards,
  type TournamentsCardsProps,
} from "../tournaments-cards";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Entry = TournamentsCardsProps["entries"][number];

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 1,
    tournamentName: "Kanto Regional",
    tournamentSlug: "kanto-regional",
    altUsername: "ash_alt",
    format: "vgc-2024",
    startDate: "2026-03-15",
    wins: 5,
    losses: 2,
    placement: 3,
    teamPokemon: ["pikachu", "charizard"],
    endDate: "2026-03-16",
    ...overrides,
  } as Entry;
}

function getDefaultProps(
  overrides: Partial<TournamentsCardsProps> = {}
): TournamentsCardsProps {
  return {
    entries: [makeEntry()],
    expandedId: null,
    onToggle: jest.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TournamentsCards", () => {
  it("renders one card per entry", () => {
    render(
      <TournamentsCards
        {...getDefaultProps({
          entries: [
            makeEntry({ id: 1, tournamentName: "Kanto Regional" }),
            makeEntry({ id: 2, tournamentName: "Johto League" }),
          ],
        })}
      />
    );
    expect(screen.getByText("Kanto Regional")).toBeInTheDocument();
    expect(screen.getByText("Johto League")).toBeInTheDocument();
  });

  it("renders tournament link with correct href", () => {
    render(<TournamentsCards {...getDefaultProps()} />);
    const link = screen.getByRole("link", { name: "Kanto Regional" });
    expect(link).toHaveAttribute("href", "/tournaments/kanto-regional");
  });

  it("renders alt link with dashboard tournaments href", () => {
    render(<TournamentsCards {...getDefaultProps()} />);
    const link = screen.getByRole("link", { name: "ash_alt" });
    expect(link).toHaveAttribute(
      "href",
      "/dashboard/alts/ash_alt/tournaments"
    );
  });

  it.each<{
    name: string;
    overrides: Partial<Entry>;
    expected: string | RegExp;
    matcher: "single" | "multi-dash";
  }>([
    {
      name: "renders format string when present",
      overrides: { format: "vgc-2024" },
      expected: "vgc-2024",
      matcher: "single",
    },
    {
      name: "renders em-dash when format is null",
      overrides: { format: null },
      expected: "—",
      matcher: "multi-dash",
    },
    {
      name: "renders placement with trophy for 1st place",
      overrides: { placement: 1 },
      expected: /1st 🏆/,
      matcher: "single",
    },
    {
      name: "renders ordinal placement for non-first finishes",
      overrides: { placement: 3 },
      expected: "3rd",
      matcher: "single",
    },
    {
      name: "renders em-dash when placement is null",
      overrides: { placement: null },
      expected: "—",
      matcher: "multi-dash",
    },
  ])("$name", ({ overrides, expected, matcher }) => {
    render(
      <TournamentsCards
        {...getDefaultProps({ entries: [makeEntry(overrides)] })}
      />
    );
    if (matcher === "multi-dash") {
      expect(screen.getAllByText(expected).length).toBeGreaterThanOrEqual(1);
    } else {
      expect(screen.getByText(expected)).toBeInTheDocument();
    }
  });

  it("renders W-L record formatted correctly", () => {
    render(
      <TournamentsCards
        {...getDefaultProps({ entries: [makeEntry({ wins: 7, losses: 1 })] })}
      />
    );
    expect(screen.getByText("7-1")).toBeInTheDocument();
  });

  it("renders Completed status badge", () => {
    render(<TournamentsCards {...getDefaultProps()} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("calls onToggle when card header is clicked", () => {
    const props = getDefaultProps();
    render(<TournamentsCards {...props} />);
    const header = screen
      .getByText("Kanto Regional")
      .closest('[role="button"]')!;
    fireEvent.click(header);
    expect(props.onToggle).toHaveBeenCalledWith(1);
  });

  it("calls onToggle on Enter keypress on card header", () => {
    const props = getDefaultProps();
    render(<TournamentsCards {...props} />);
    const header = screen
      .getByText("Kanto Regional")
      .closest('[role="button"]')!;
    fireEvent.keyDown(header, { key: "Enter" });
    expect(props.onToggle).toHaveBeenCalledWith(1);
  });

  it("calls onToggle on Space keypress on card header", () => {
    const props = getDefaultProps();
    render(<TournamentsCards {...props} />);
    const header = screen
      .getByText("Kanto Regional")
      .closest('[role="button"]')!;
    fireEvent.keyDown(header, { key: " " });
    expect(props.onToggle).toHaveBeenCalledWith(1);
  });

  it("renders OpponentSchedule when expandedId matches entry id", () => {
    render(
      <TournamentsCards {...getDefaultProps({ expandedId: 1 })} />
    );
    expect(
      screen.getByText("Round-by-round data not yet available")
    ).toBeInTheDocument();
  });

  it("does not render OpponentSchedule when expandedId is null", () => {
    render(<TournamentsCards {...getDefaultProps()} />);
    expect(
      screen.queryByText("Round-by-round data not yet available")
    ).not.toBeInTheDocument();
  });

  it("handles empty teamPokemon array", () => {
    render(
      <TournamentsCards
        {...getDefaultProps({ entries: [makeEntry({ teamPokemon: [] })] })}
      />
    );
    // The SpriteRow renders an em-dash when species is empty.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("does not propagate Link clicks to header onToggle", () => {
    const props = getDefaultProps();
    render(<TournamentsCards {...props} />);
    const link = screen.getByRole("link", { name: "Kanto Regional" });
    fireEvent.click(link);
    // The Link's onClick does e.stopPropagation, so onToggle is not called.
    expect(props.onToggle).not.toHaveBeenCalled();
  });
});
