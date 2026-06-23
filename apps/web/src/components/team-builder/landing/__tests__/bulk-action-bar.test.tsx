/**
 * Tests for BulkActionBar
 *
 * Covers:
 *   - Returns null when selectedCount === 0
 *   - Renders the bar and "{n} selected" count when selectedCount > 0
 *   - Each action button fires the appropriate callback
 *   - Move-to-folder dropdown lists all manualFolders and calls onMoveToFolder(id)
 *   - Empty folder list shows "No folders yet" placeholder
 *   - Clear button calls onClear
 *   - Accessible names present on all controls
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks — declared before component import so Jest hoisting works
// =============================================================================

// Mock lucide-react icons so we don't need SVG rendering in JSDOM.
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

// Mock DropdownMenu — Base UI's Menu uses portals and floating-ui positioning
// that don't work in JSDOM.  Provide a minimal open/close toggle so we can
// verify that the folder list renders and calls onMoveToFolder.
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
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    onToggle?: () => void;
    "aria-label"?: string;
    // Accept (and ignore) render prop so the real component prop passes through
    render?: unknown;
    className?: string;
  }) {
    return (
      <button onClick={onToggle} aria-label={ariaLabel ?? "Move to folder"}>
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
    side?: string;
    align?: string;
  }) {
    if (!open) return null;
    return <div data-testid="dropdown-content">{children}</div>;
  }

  function DropdownMenuItem({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) {
    return (
      <div
        role="menuitem"
        aria-disabled={disabled}
        onClick={disabled ? undefined : onClick}
      >
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

// Mock Button — render a plain <button> so RTL interaction works without
// needing Base UI's ButtonPrimitive setup in JSDOM.
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    "aria-label": ariaLabel,
    disabled,
    className,
    render: _render,
    variant: _variant,
    size: _size,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    "aria-label"?: string;
    disabled?: boolean;
    className?: string;
    render?: unknown;
    variant?: string;
    size?: string;
  } & Record<string, unknown>) => (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={className}
      {...rest}
    >
      {children}
    </button>
  ),
  buttonVariants: jest.fn(),
}));

// Import component under test AFTER mocks are set up.
import {
  BulkActionBar,
  type BulkActionBarProps,
} from "../bulk-action-bar";
import { type ManualFolder } from "../../persistence/local-folders-types";

// =============================================================================
// Test fixtures
// =============================================================================

const FOLDERS: ManualFolder[] = [
  { id: "folder-aaa", name: "Tournament Teams", createdAt: "2026-01-01T00:00:00Z" },
  { id: "folder-bbb", name: "Practice Squads", createdAt: "2026-01-02T00:00:00Z" },
];

function buildProps(overrides: Partial<BulkActionBarProps> = {}): BulkActionBarProps {
  return {
    selectedCount: 1,
    manualFolders: FOLDERS,
    onMoveToFolder: jest.fn(),
    onExport: jest.fn(),
    onArchive: jest.fn(),
    onDelete: jest.fn(),
    onClear: jest.fn(),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("BulkActionBar", () => {
  describe("visibility", () => {
    it("returns null when selectedCount is 0", () => {
      const { container } = render(<BulkActionBar {...buildProps({ selectedCount: 0 })} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders the bar when selectedCount is 1", () => {
      render(<BulkActionBar {...buildProps({ selectedCount: 1 })} />);
      expect(screen.getByRole("toolbar", { name: "Bulk actions" })).toBeInTheDocument();
    });

    it("renders the bar when selectedCount is greater than 1", () => {
      render(<BulkActionBar {...buildProps({ selectedCount: 5 })} />);
      expect(screen.getByRole("toolbar", { name: "Bulk actions" })).toBeInTheDocument();
    });
  });

  describe("selected count label", () => {
    it("displays '1 selected' for a single item", () => {
      render(<BulkActionBar {...buildProps({ selectedCount: 1 })} />);
      expect(screen.getByText("1 selected")).toBeInTheDocument();
    });

    it("displays the correct count for multiple items", () => {
      render(<BulkActionBar {...buildProps({ selectedCount: 42 })} />);
      expect(screen.getByText("42 selected")).toBeInTheDocument();
    });
  });

  describe("action buttons — accessible names", () => {
    it("has accessible name for Move to folder trigger", () => {
      render(<BulkActionBar {...buildProps()} />);
      expect(
        screen.getByRole("button", { name: /move to folder/i })
      ).toBeInTheDocument();
    });

    it("has accessible name for Export button", () => {
      render(<BulkActionBar {...buildProps()} />);
      expect(
        screen.getByRole("button", { name: /export selected/i })
      ).toBeInTheDocument();
    });

    it("has accessible name for Archive button", () => {
      render(<BulkActionBar {...buildProps()} />);
      expect(
        screen.getByRole("button", { name: /archive selected/i })
      ).toBeInTheDocument();
    });

    it("has accessible name for Delete button", () => {
      render(<BulkActionBar {...buildProps()} />);
      expect(
        screen.getByRole("button", { name: /delete selected/i })
      ).toBeInTheDocument();
    });

    it("has accessible name for Clear button", () => {
      render(<BulkActionBar {...buildProps()} />);
      expect(
        screen.getByRole("button", { name: /clear selection/i })
      ).toBeInTheDocument();
    });
  });

  describe("action callbacks", () => {
    it("calls onExport when Export is clicked", async () => {
      const user = userEvent.setup();
      const props = buildProps();
      render(<BulkActionBar {...props} />);

      await user.click(screen.getByRole("button", { name: /export selected/i }));

      expect(props.onExport).toHaveBeenCalledTimes(1);
    });

    it("calls onArchive when Archive is clicked", async () => {
      const user = userEvent.setup();
      const props = buildProps();
      render(<BulkActionBar {...props} />);

      await user.click(screen.getByRole("button", { name: /archive selected/i }));

      expect(props.onArchive).toHaveBeenCalledTimes(1);
    });

    it("calls onDelete when Delete is clicked", async () => {
      const user = userEvent.setup();
      const props = buildProps();
      render(<BulkActionBar {...props} />);

      await user.click(screen.getByRole("button", { name: /delete selected/i }));

      expect(props.onDelete).toHaveBeenCalledTimes(1);
    });

    it("calls onClear when Clear is clicked", async () => {
      const user = userEvent.setup();
      const props = buildProps();
      render(<BulkActionBar {...props} />);

      await user.click(screen.getByRole("button", { name: /clear selection/i }));

      expect(props.onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe("Move to folder dropdown", () => {
    it("opens the folder list when the trigger is clicked", async () => {
      const user = userEvent.setup();
      render(<BulkActionBar {...buildProps()} />);

      await user.click(screen.getByRole("button", { name: /move to folder/i }));

      expect(screen.getByTestId("dropdown-content")).toBeInTheDocument();
    });

    it("lists all manualFolders in the dropdown", async () => {
      const user = userEvent.setup();
      render(<BulkActionBar {...buildProps()} />);

      await user.click(screen.getByRole("button", { name: /move to folder/i }));

      expect(screen.getByText("Tournament Teams")).toBeInTheDocument();
      expect(screen.getByText("Practice Squads")).toBeInTheDocument();
    });

    it("calls onMoveToFolder with the correct folder id when an item is clicked", async () => {
      const user = userEvent.setup();
      const props = buildProps();
      render(<BulkActionBar {...props} />);

      await user.click(screen.getByRole("button", { name: /move to folder/i }));
      await user.click(screen.getByText("Tournament Teams"));

      expect(props.onMoveToFolder).toHaveBeenCalledWith("folder-aaa");
    });

    it("calls onMoveToFolder with the second folder id when the second item is clicked", async () => {
      const user = userEvent.setup();
      const props = buildProps();
      render(<BulkActionBar {...props} />);

      await user.click(screen.getByRole("button", { name: /move to folder/i }));
      await user.click(screen.getByText("Practice Squads"));

      expect(props.onMoveToFolder).toHaveBeenCalledWith("folder-bbb");
    });

    it("shows 'No folders yet' when manualFolders is empty", async () => {
      const user = userEvent.setup();
      render(<BulkActionBar {...buildProps({ manualFolders: [] })} />);

      await user.click(screen.getByRole("button", { name: /move to folder/i }));

      expect(screen.getByText("No folders yet")).toBeInTheDocument();
    });

    it("does not call onMoveToFolder when 'No folders yet' placeholder is clicked", async () => {
      const user = userEvent.setup();
      const props = buildProps({ manualFolders: [] });
      render(<BulkActionBar {...props} />);

      await user.click(screen.getByRole("button", { name: /move to folder/i }));
      await user.click(screen.getByText("No folders yet"));

      expect(props.onMoveToFolder).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("does not fire callbacks when the count is 0 (bar absent)", () => {
      const props = buildProps({ selectedCount: 0 });
      render(<BulkActionBar {...props} />);

      // Bar should not be in the DOM — no buttons to click
      expect(screen.queryByRole("toolbar")).toBeNull();
    });

    it("handles a very large selectedCount gracefully", () => {
      render(<BulkActionBar {...buildProps({ selectedCount: 9999 })} />);
      expect(screen.getByText("9999 selected")).toBeInTheDocument();
    });

    it("renders correctly with readonly empty array for manualFolders", () => {
      render(
        <BulkActionBar
          {...buildProps({ manualFolders: [] as readonly ManualFolder[] })}
        />
      );
      expect(screen.getByRole("toolbar", { name: "Bulk actions" })).toBeInTheDocument();
    });
  });
});
