import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, ...rest }: { alt: string } & Record<string, unknown>) => (
    <img alt={alt} {...rest} />
  ),
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn((species: string) => ({
    url: `https://sprites.test/${species}.png`,
    w: 1,
    h: 1,
    pixelated: false,
  })),
}));

jest.mock("@trainers/pokemon", () => ({
  getFormatLabel: jest.fn((id: string) => `Format:${id}`),
}));

jest.mock("lucide-react", () => {
  const mock = (name: string) => {
    const Icon = (props: Record<string, unknown>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy({}, { get: (_target, prop: string) => mock(prop) });
});

// Mock the dropdown-menu UI primitives — Base UI's Menu uses portals and
// floating-ui positioning that don't work in JSDOM. Replace with a simple
// open/close toggle so we can test the row's click handlers directly.
jest.mock("@/components/ui/dropdown-menu", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");

  function DropdownMenu({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    return (
      <div data-testid="dropdown-menu">
        {React.Children.map(children, (child: React.ReactNode) =>
          React.isValidElement(child)
            ? React.cloneElement(
                child as React.ReactElement<Record<string, unknown>>,
                {
                  open,
                  onToggle: () => setOpen((v: boolean) => !v),
                }
              )
            : child
        )}
      </div>
    );
  }

  function DropdownMenuTrigger({
    children,
    onToggle,
    className,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    onToggle?: () => void;
    className?: string;
    "aria-label"?: string;
  }) {
    return (
      <button onClick={onToggle} className={className} aria-label={ariaLabel}>
        {children}
      </button>
    );
  }

  function DropdownMenuContent({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) {
    if (!open) return null;
    return <div data-testid="dropdown-content">{children}</div>;
  }

  function DropdownMenuItem({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) {
    return (
      <div role="menuitem" data-variant={variant} onClick={onClick}>
        {children}
      </div>
    );
  }

  return {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
  };
});

// Mock the Badge component to keep tests simple
jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span data-testid="badge" className={className}>{children}</span>,
}));

import { TeamRow } from "../team-row";
import { type LocalDraftSummary, draftEditorHref } from "../team-landing-shared";

// =============================================================================
// Fixtures
// =============================================================================

function buildSummary(
  overrides: Partial<LocalDraftSummary> = {}
): LocalDraftSummary {
  return {
    id: "local-ab12",
    name: "Test Team",
    format: "gen9vgc2026regi",
    filledCount: 2,
    species: [
      { species: "Incineroar", isShiny: false },
      { species: "Rillaboom", isShiny: false },
    ],
    updatedAt: "2026-06-23T10:00:00Z",
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("TeamRow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Name rendering & truncation
  // ---------------------------------------------------------------------------

  describe("name column", () => {
    it("renders the draft name", () => {
      render(<TeamRow summary={buildSummary({ name: "My Test Team" })} />);
      expect(screen.getByText("My Test Team")).toBeInTheDocument();
    });

    it("applies truncate class for long names", () => {
      render(
        <TeamRow
          summary={buildSummary({
            name: "A Very Long Team Name That Should Be Truncated",
          })}
        />
      );
      // The span wrapping the name should carry the truncate class
      const nameEl = screen.getByText(
        "A Very Long Team Name That Should Be Truncated"
      );
      expect(nameEl.className).toContain("truncate");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Sprite strip
  // ---------------------------------------------------------------------------

  describe("sprite strip", () => {
    it("renders exactly summary.species.length sprite imgs with mocked url", () => {
      const summary = buildSummary({
        filledCount: 3,
        species: [
          { species: "Incineroar", isShiny: false },
          { species: "Rillaboom", isShiny: false },
          { species: "Miraidon", isShiny: false },
        ],
      });
      render(<TeamRow summary={summary} />);

      const imgs = screen.getAllByRole("img");
      expect(imgs).toHaveLength(3);
      expect(imgs[0]).toHaveAttribute(
        "src",
        "https://sprites.test/Incineroar.png"
      );
      expect(imgs[1]).toHaveAttribute(
        "src",
        "https://sprites.test/Rillaboom.png"
      );
      expect(imgs[2]).toHaveAttribute(
        "src",
        "https://sprites.test/Miraidon.png"
      );
    });

    it("shows Empty placeholder when filledCount is 0", () => {
      render(
        <TeamRow
          summary={buildSummary({ filledCount: 0, species: [] })}
        />
      );
      expect(screen.getByText("Empty")).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Format badge
  // ---------------------------------------------------------------------------

  describe("format badge", () => {
    it("renders the format label when format is present", () => {
      render(
        <TeamRow summary={buildSummary({ format: "gen9vgc2026regi" })} />
      );
      expect(screen.getByText("Format:gen9vgc2026regi")).toBeInTheDocument();
    });

    it("renders nothing for the format when format is null", () => {
      render(<TeamRow summary={buildSummary({ format: null })} />);
      // No badge should appear
      expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Link href
  // ---------------------------------------------------------------------------

  describe("main link", () => {
    it("points to draftEditorHref(summary.id)", () => {
      const summary = buildSummary({ id: "local-xyz99" });
      render(<TeamRow summary={summary} />);

      // The link wraps the name/sprites/format area
      const link = screen.getByText("Test Team").closest("a");
      expect(link).toHaveAttribute("href", draftEditorHref("local-xyz99"));
      expect(link).toHaveAttribute("href", "/builder/t/local-xyz99");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Overflow menu — Delete calls onDelete
  // ---------------------------------------------------------------------------

  describe("overflow menu", () => {
    it("calls onDelete with summary.id when Delete is clicked", async () => {
      const onDelete = jest.fn();
      const summary = buildSummary({ id: "local-del01" });
      const user = userEvent.setup();

      render(<TeamRow summary={summary} onDelete={onDelete} />);

      // Open the menu
      await user.click(screen.getByRole("button", { name: "Team options" }));

      // Click Delete
      await user.click(screen.getByRole("menuitem", { name: /delete/i }));

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("local-del01");
    });

    it("renders the Delete item with destructive variant", async () => {
      const user = userEvent.setup();
      render(<TeamRow summary={buildSummary()} onDelete={jest.fn()} />);

      await user.click(screen.getByRole("button", { name: "Team options" }));

      const deleteItem = screen.getByRole("menuitem", { name: /delete/i });
      expect(deleteItem).toHaveAttribute("data-variant", "destructive");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. onDelete undefined — row renders without crashing
  // ---------------------------------------------------------------------------

  describe("when onDelete is undefined", () => {
    it("still renders without crashing", () => {
      render(<TeamRow summary={buildSummary()} />);
      // No onDelete prop passed — just verify the row rendered
      expect(screen.getByText("Test Team")).toBeInTheDocument();
    });

    it("does not throw when Delete is clicked with no onDelete handler", async () => {
      const user = userEvent.setup();
      render(<TeamRow summary={buildSummary()} />);

      await user.click(screen.getByRole("button", { name: "Team options" }));
      // Should not throw
      await user.click(screen.getByRole("menuitem", { name: /delete/i }));
      // Row still present
      expect(screen.getByText("Test Team")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. highlightSpecies — teal ring/bg applied to matched sprites
  // ---------------------------------------------------------------------------

  describe("highlightSpecies prop", () => {
    it("adds highlight classes to a matched sprite's wrapper", () => {
      const summary = buildSummary({
        filledCount: 2,
        species: [
          { species: "Incineroar", isShiny: false },
          { species: "Rillaboom", isShiny: false },
        ],
      });
      render(
        <TeamRow
          summary={summary}
          highlightSpecies={["Incineroar"]}
        />
      );

      // The Incineroar image's parent wrapper should carry the highlight class
      const incineroarImg = screen.getByAltText("Incineroar");
      const wrapper = incineroarImg.parentElement;
      expect(wrapper?.className).toContain("ring-2");
    });

    it("does NOT add highlight classes to non-matched sprites", () => {
      const summary = buildSummary({
        filledCount: 2,
        species: [
          { species: "Incineroar", isShiny: false },
          { species: "Rillaboom", isShiny: false },
        ],
      });
      render(
        <TeamRow
          summary={summary}
          highlightSpecies={["Incineroar"]}
        />
      );

      const rillaboomImg = screen.getByAltText("Rillaboom");
      const wrapper = rillaboomImg.parentElement;
      expect(wrapper?.className).not.toContain("ring-2");
    });

    it("adds no highlight when highlightSpecies is an empty array", () => {
      const summary = buildSummary({
        filledCount: 1,
        species: [{ species: "Incineroar", isShiny: false }],
      });
      render(
        <TeamRow summary={summary} highlightSpecies={[]} />
      );

      const img = screen.getByAltText("Incineroar");
      const wrapper = img.parentElement;
      expect(wrapper?.className).not.toContain("ring-2");
    });

    it("adds no highlight when highlightSpecies is omitted", () => {
      const summary = buildSummary({
        filledCount: 1,
        species: [{ species: "Incineroar", isShiny: false }],
      });
      render(<TeamRow summary={summary} />);

      const img = screen.getByAltText("Incineroar");
      const wrapper = img.parentElement;
      expect(wrapper?.className).not.toContain("ring-2");
    });
  });

  // ---------------------------------------------------------------------------
  // 8. onPeek — Peek menu item
  // ---------------------------------------------------------------------------

  describe("onPeek prop", () => {
    it("renders a 'Peek' menu item when onPeek is provided", async () => {
      const user = userEvent.setup();
      render(
        <TeamRow summary={buildSummary()} onPeek={jest.fn()} onDelete={jest.fn()} />
      );
      await user.click(screen.getByRole("button", { name: "Team options" }));
      expect(screen.getByRole("menuitem", { name: /peek/i })).toBeInTheDocument();
    });

    it("calls onPeek with the summary id when Peek is clicked", async () => {
      const onPeek = jest.fn();
      const user = userEvent.setup();
      const summary = buildSummary({ id: "local-peek01" });
      render(<TeamRow summary={summary} onPeek={onPeek} />);

      await user.click(screen.getByRole("button", { name: "Team options" }));
      await user.click(screen.getByRole("menuitem", { name: /peek/i }));

      expect(onPeek).toHaveBeenCalledTimes(1);
      expect(onPeek).toHaveBeenCalledWith("local-peek01");
    });

    it("does NOT render the Peek item when onPeek is undefined", async () => {
      const user = userEvent.setup();
      render(<TeamRow summary={buildSummary()} onDelete={jest.fn()} />);

      await user.click(screen.getByRole("button", { name: "Team options" }));
      expect(screen.queryByRole("menuitem", { name: /peek/i })).not.toBeInTheDocument();
    });

    it("Peek item appears above Delete in the menu", async () => {
      const user = userEvent.setup();
      render(
        <TeamRow summary={buildSummary()} onPeek={jest.fn()} onDelete={jest.fn()} />
      );
      await user.click(screen.getByRole("button", { name: "Team options" }));

      const items = screen.getAllByRole("menuitem");
      // First item should be Peek, second Delete
      expect(items[0]).toHaveTextContent(/peek/i);
      expect(items[1]).toHaveTextContent(/delete/i);
    });
  });
});
