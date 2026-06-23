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

  function DropdownMenuSub({ children }: { children: React.ReactNode }) {
    return <div data-testid="dropdown-sub">{children}</div>;
  }

  function DropdownMenuSubTrigger({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) {
    return (
      <button
        role="menuitem"
        data-testid="submenu-trigger"
        onClick={onClick}
      >
        {children}
      </button>
    );
  }

  function DropdownMenuSubContent({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <div data-testid="submenu-content">{children}</div>;
  }

  function DropdownMenuSeparator() {
    return <hr data-testid="dropdown-separator" />;
  }

  return {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuSeparator,
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

// Mock the Checkbox component — Base UI uses portals/context that don't work in JSDOM
jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    "aria-label": ariaLabel,
    onClick,
    "data-testid": testId,
  }: {
    checked?: boolean;
    "aria-label"?: string;
    onClick?: (e: React.MouseEvent) => void;
    "data-testid"?: string;
  }) => (
    <button
      role="checkbox"
      aria-checked={checked ?? false}
      aria-label={ariaLabel}
      data-testid={testId}
      onClick={onClick}
    />
  ),
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
      // Peek should come before Delete
      const peekIndex = items.findIndex((el) => /peek/i.test(el.textContent ?? ""));
      const deleteIndex = items.findIndex((el) => /delete/i.test(el.textContent ?? ""));
      expect(peekIndex).toBeLessThan(deleteIndex);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Pin / Unpin menu item (Milestone B)
  // ---------------------------------------------------------------------------

  describe("onTogglePin prop", () => {
    it("renders 'Pin' item when onTogglePin is provided and pinned=false", async () => {
      const user = userEvent.setup();
      render(
        <TeamRow
          summary={buildSummary()}
          onTogglePin={jest.fn()}
          pinned={false}
        />
      );
      await user.click(screen.getByRole("button", { name: "Team options" }));
      expect(screen.getByRole("menuitem", { name: /^pin$/i })).toBeInTheDocument();
    });

    it("renders 'Unpin' item when onTogglePin is provided and pinned=true", async () => {
      const user = userEvent.setup();
      render(
        <TeamRow
          summary={buildSummary()}
          onTogglePin={jest.fn()}
          pinned={true}
        />
      );
      await user.click(screen.getByRole("button", { name: "Team options" }));
      expect(screen.getByRole("menuitem", { name: /unpin/i })).toBeInTheDocument();
    });

    it("calls onTogglePin with summary.id when Pin is clicked", async () => {
      const onTogglePin = jest.fn();
      const user = userEvent.setup();
      const summary = buildSummary({ id: "local-pin01" });
      render(
        <TeamRow summary={summary} onTogglePin={onTogglePin} pinned={false} />
      );

      await user.click(screen.getByRole("button", { name: "Team options" }));
      await user.click(screen.getByRole("menuitem", { name: /^pin$/i }));

      expect(onTogglePin).toHaveBeenCalledTimes(1);
      expect(onTogglePin).toHaveBeenCalledWith("local-pin01");
    });

    it("calls onTogglePin with summary.id when Unpin is clicked", async () => {
      const onTogglePin = jest.fn();
      const user = userEvent.setup();
      const summary = buildSummary({ id: "local-pin02" });
      render(
        <TeamRow summary={summary} onTogglePin={onTogglePin} pinned={true} />
      );

      await user.click(screen.getByRole("button", { name: "Team options" }));
      await user.click(screen.getByRole("menuitem", { name: /unpin/i }));

      expect(onTogglePin).toHaveBeenCalledTimes(1);
      expect(onTogglePin).toHaveBeenCalledWith("local-pin02");
    });

    it("does NOT render Pin/Unpin item when onTogglePin is absent", async () => {
      const user = userEvent.setup();
      render(<TeamRow summary={buildSummary()} onDelete={jest.fn()} />);

      await user.click(screen.getByRole("button", { name: "Team options" }));
      expect(screen.queryByRole("menuitem", { name: /^pin$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /unpin/i })).not.toBeInTheDocument();
    });

    it("Pin item appears above Delete", async () => {
      const user = userEvent.setup();
      render(
        <TeamRow
          summary={buildSummary()}
          onTogglePin={jest.fn()}
          pinned={false}
          onDelete={jest.fn()}
        />
      );
      await user.click(screen.getByRole("button", { name: "Team options" }));

      const items = screen.getAllByRole("menuitem");
      const pinIndex = items.findIndex((el) => /^pin$/i.test(el.textContent ?? ""));
      const deleteIndex = items.findIndex((el) => /delete/i.test(el.textContent ?? ""));
      expect(pinIndex).toBeLessThan(deleteIndex);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Archive / Unarchive menu item (Milestone B)
  // ---------------------------------------------------------------------------

  describe("onToggleArchive prop", () => {
    it("renders 'Archive' item when onToggleArchive is provided and archived=false", async () => {
      const user = userEvent.setup();
      render(
        <TeamRow
          summary={buildSummary()}
          onToggleArchive={jest.fn()}
          archived={false}
        />
      );
      await user.click(screen.getByRole("button", { name: "Team options" }));
      expect(screen.getByRole("menuitem", { name: /^archive$/i })).toBeInTheDocument();
    });

    it("renders 'Unarchive' item when onToggleArchive is provided and archived=true", async () => {
      const user = userEvent.setup();
      render(
        <TeamRow
          summary={buildSummary()}
          onToggleArchive={jest.fn()}
          archived={true}
        />
      );
      await user.click(screen.getByRole("button", { name: "Team options" }));
      expect(screen.getByRole("menuitem", { name: /unarchive/i })).toBeInTheDocument();
    });

    it("calls onToggleArchive with summary.id when Archive is clicked", async () => {
      const onToggleArchive = jest.fn();
      const user = userEvent.setup();
      const summary = buildSummary({ id: "local-arch01" });
      render(
        <TeamRow summary={summary} onToggleArchive={onToggleArchive} archived={false} />
      );

      await user.click(screen.getByRole("button", { name: "Team options" }));
      await user.click(screen.getByRole("menuitem", { name: /^archive$/i }));

      expect(onToggleArchive).toHaveBeenCalledTimes(1);
      expect(onToggleArchive).toHaveBeenCalledWith("local-arch01");
    });

    it("calls onToggleArchive with summary.id when Unarchive is clicked", async () => {
      const onToggleArchive = jest.fn();
      const user = userEvent.setup();
      const summary = buildSummary({ id: "local-arch02" });
      render(
        <TeamRow summary={summary} onToggleArchive={onToggleArchive} archived={true} />
      );

      await user.click(screen.getByRole("button", { name: "Team options" }));
      await user.click(screen.getByRole("menuitem", { name: /unarchive/i }));

      expect(onToggleArchive).toHaveBeenCalledTimes(1);
      expect(onToggleArchive).toHaveBeenCalledWith("local-arch02");
    });

    it("does NOT render Archive/Unarchive item when onToggleArchive is absent", async () => {
      const user = userEvent.setup();
      render(<TeamRow summary={buildSummary()} onDelete={jest.fn()} />);

      await user.click(screen.getByRole("button", { name: "Team options" }));
      expect(
        screen.queryByRole("menuitem", { name: /^archive$/i })
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 11. Move to folder submenu (Milestone B)
  // ---------------------------------------------------------------------------

  describe("onToggleFolder / manualFolders prop", () => {
    const folders = [
      { id: "folder-1", name: "VGC Teams" },
      { id: "folder-2", name: "Drafts" },
    ];

    it("renders 'Move to folder' submenu trigger when onToggleFolder + manualFolders provided", async () => {
      const user = userEvent.setup();
      render(
        <TeamRow
          summary={buildSummary()}
          onToggleFolder={jest.fn()}
          manualFolders={folders}
          memberFolderIds={[]}
        />
      );
      await user.click(screen.getByRole("button", { name: "Team options" }));
      expect(screen.getByTestId("submenu-trigger")).toBeInTheDocument();
      expect(screen.getByTestId("submenu-trigger").textContent).toContain(
        "Move to folder"
      );
    });

    it("lists all folders in the submenu", async () => {
      const user = userEvent.setup();
      render(
        <TeamRow
          summary={buildSummary()}
          onToggleFolder={jest.fn()}
          manualFolders={folders}
          memberFolderIds={[]}
        />
      );
      await user.click(screen.getByRole("button", { name: "Team options" }));
      expect(screen.getByText("VGC Teams")).toBeInTheDocument();
      expect(screen.getByText("Drafts")).toBeInTheDocument();
    });

    it("calls onToggleFolder with (id, folderId) when a folder item is clicked", async () => {
      const onToggleFolder = jest.fn();
      const user = userEvent.setup();
      const summary = buildSummary({ id: "local-mv01" });
      render(
        <TeamRow
          summary={summary}
          onToggleFolder={onToggleFolder}
          manualFolders={folders}
          memberFolderIds={[]}
        />
      );

      await user.click(screen.getByRole("button", { name: "Team options" }));
      await user.click(screen.getByText("VGC Teams"));

      expect(onToggleFolder).toHaveBeenCalledTimes(1);
      expect(onToggleFolder).toHaveBeenCalledWith("local-mv01", "folder-1");
    });

    it("shows a checkmark for folders the draft already belongs to", async () => {
      const user = userEvent.setup();
      render(
        <TeamRow
          summary={buildSummary()}
          onToggleFolder={jest.fn()}
          manualFolders={folders}
          memberFolderIds={["folder-1"]}
        />
      );
      await user.click(screen.getByRole("button", { name: "Team options" }));

      // The "VGC Teams" item should have a Check icon (mocked to svg)
      const submenuContent = screen.getByTestId("submenu-content");
      // "VGC Teams" folder-1 is a member — its menuitem should have the checkmark svg
      // We verify by finding the menuitem for VGC Teams and checking it contains an svg
      const vgcItem = Array.from(
        submenuContent.querySelectorAll("[role=menuitem]")
      ).find((el) => el.textContent?.includes("VGC Teams"));
      expect(vgcItem).toBeTruthy();
      // Member folders have a check icon (svg element from the mocked lucide)
      expect(vgcItem?.querySelector("svg")).toBeTruthy();
    });

    it("does NOT render the submenu when onToggleFolder is absent", async () => {
      const user = userEvent.setup();
      render(
        <TeamRow
          summary={buildSummary()}
          manualFolders={folders}
          memberFolderIds={[]}
          onDelete={jest.fn()}
        />
      );
      await user.click(screen.getByRole("button", { name: "Team options" }));
      expect(screen.queryByTestId("submenu-trigger")).not.toBeInTheDocument();
    });

    it("does NOT render the submenu when manualFolders is empty", async () => {
      const user = userEvent.setup();
      render(
        <TeamRow
          summary={buildSummary()}
          onToggleFolder={jest.fn()}
          manualFolders={[]}
          memberFolderIds={[]}
          onDelete={jest.fn()}
        />
      );
      await user.click(screen.getByRole("button", { name: "Team options" }));
      expect(screen.queryByTestId("submenu-trigger")).not.toBeInTheDocument();
    });

    it("calls onToggleFolder for the second folder correctly", async () => {
      const onToggleFolder = jest.fn();
      const user = userEvent.setup();
      const summary = buildSummary({ id: "local-mv02" });
      render(
        <TeamRow
          summary={summary}
          onToggleFolder={onToggleFolder}
          manualFolders={folders}
          memberFolderIds={["folder-1"]}
        />
      );

      await user.click(screen.getByRole("button", { name: "Team options" }));
      await user.click(screen.getByText("Drafts"));

      expect(onToggleFolder).toHaveBeenCalledWith("local-mv02", "folder-2");
    });
  });

  // ---------------------------------------------------------------------------
  // 12. Row is additive — no Milestone B items when callbacks absent
  // ---------------------------------------------------------------------------

  describe("additive safety — no callbacks provided", () => {
    it("renders exactly one menuitem (Delete) when no optional callbacks are passed", async () => {
      const user = userEvent.setup();
      render(<TeamRow summary={buildSummary()} onDelete={jest.fn()} />);

      await user.click(screen.getByRole("button", { name: "Team options" }));
      const items = screen.getAllByRole("menuitem");
      // Only Delete should be present
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent(/delete/i);
    });

    it("renders no separator when no optional callbacks are provided", async () => {
      const user = userEvent.setup();
      render(<TeamRow summary={buildSummary()} onDelete={jest.fn()} />);

      await user.click(screen.getByRole("button", { name: "Team options" }));
      expect(screen.queryByTestId("dropdown-separator")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 13. Bulk selection checkbox (Milestone C)
  // ---------------------------------------------------------------------------

  describe("selectable / onToggleSelect prop", () => {
    it("does NOT render a checkbox when selectable is absent", () => {
      render(<TeamRow summary={buildSummary()} />);
      expect(
        screen.queryByRole("checkbox")
      ).not.toBeInTheDocument();
    });

    it("does NOT render a checkbox when selectable is false", () => {
      render(<TeamRow summary={buildSummary()} selectable={false} />);
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("renders a checkbox when selectable is true", () => {
      render(
        <TeamRow
          summary={buildSummary()}
          selectable
          selected={false}
          onToggleSelect={jest.fn()}
        />
      );
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("checkbox has aria-checked=false when selected is false", () => {
      render(
        <TeamRow
          summary={buildSummary()}
          selectable
          selected={false}
          onToggleSelect={jest.fn()}
        />
      );
      expect(screen.getByRole("checkbox")).toHaveAttribute(
        "aria-checked",
        "false"
      );
    });

    it("checkbox has aria-checked=true when selected is true", () => {
      render(
        <TeamRow
          summary={buildSummary()}
          selectable
          selected={true}
          onToggleSelect={jest.fn()}
        />
      );
      expect(screen.getByRole("checkbox")).toHaveAttribute(
        "aria-checked",
        "true"
      );
    });

    it("clicking the checkbox calls onToggleSelect(id, { shift: false }) on plain click", async () => {
      const onToggleSelect = jest.fn();
      const user = userEvent.setup();
      const summary = buildSummary({ id: "local-sel01" });

      render(
        <TeamRow
          summary={summary}
          selectable
          selected={false}
          onToggleSelect={onToggleSelect}
        />
      );

      await user.click(screen.getByRole("checkbox"));

      expect(onToggleSelect).toHaveBeenCalledTimes(1);
      expect(onToggleSelect).toHaveBeenCalledWith("local-sel01", {
        shift: false,
      });
    });

    it("checkbox has the correct aria-label", () => {
      const summary = buildSummary({ name: "My Team" });
      render(
        <TeamRow
          summary={summary}
          selectable
          selected={false}
          onToggleSelect={jest.fn()}
        />
      );
      expect(
        screen.getByRole("checkbox", { name: /select my team/i })
      ).toBeInTheDocument();
    });

    it("the main Link still has its href when checkbox is visible", () => {
      const summary = buildSummary({ id: "local-sel02" });
      render(
        <TeamRow
          summary={summary}
          selectable
          selected={false}
          onToggleSelect={jest.fn()}
        />
      );

      // The Link should still navigate to the editor href
      const link = screen.getByText(summary.name).closest("a");
      expect(link).toHaveAttribute("href", draftEditorHref("local-sel02"));
    });
  });
});
