/**
 * Tests for FolderRail
 *
 * Covers:
 *   - Renders All teams, smart folders, manual folders, Archived with their counts
 *   - Clicking an item calls onSelect with the correct id (null / folder id / ARCHIVED_VIEW_ID)
 *   - "+ New folder" flow calls onCreateManualFolder with the typed name
 *   - Manual folder ⋯ → Delete calls onDeleteManualFolder
 *   - Collapse button calls onToggleCollapsed
 *   - ⌘\ keyboard shortcut calls onToggleCollapsed
 *   - Active folder has the highlight class (aria-pressed)
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks — before imports so Jest hoisting works
// =============================================================================

// Mock DropdownMenu — Base UI Menu uses portals/floating-ui that JSDOM can't handle.
jest.mock("@/components/ui/dropdown-menu", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");

  function DropdownMenu({ children }: { children: React.ReactNode }) {
    return <div data-testid="dropdown-menu">{children}</div>;
  }

  function DropdownMenuTrigger({
    children,
    className,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    className?: string;
    "aria-label"?: string;
  }) {
    return (
      <button
        data-testid="dropdown-trigger"
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    );
  }

  function DropdownMenuContent({
    children,
  }: {
    children: React.ReactNode;
    align?: string;
    sideOffset?: number;
  }) {
    return <div data-testid="dropdown-content">{children}</div>;
  }

  function DropdownMenuItem({
    children,
    onClick,
    variant: _variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) {
    return (
      <button data-testid="dropdown-item" onClick={onClick}>
        {children}
      </button>
    );
  }

  return { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger };
});

// Mock Badge — render a simple span with the text
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

// Mock Button — render a real <button>
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    "aria-label": ariaLabel,
    title,
    size: _size,
    variant: _variant,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: string;
    variant?: string;
  }) => (
    <button
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
      title={title}
      {...rest}
    >
      {children}
    </button>
  ),
}));

// Mock Input — render a real <input> with forwarded ref
jest.mock("@/components/ui/input", () => ({
  Input: React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
  >(function Input({ className, ...props }, ref) {
    return <input ref={ref} className={className} data-testid="new-folder-input" {...props} />;
  }),
}));

// Stub lucide-react icons
jest.mock("lucide-react", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  const mock = (name: string) => {
    const Icon = (props: Record<string, unknown>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy({}, { get: (_target, prop: string) => mock(prop as string) });
});

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { FolderRail, type FolderRailProps } from "../folder-rail";
import { ARCHIVED_VIEW_ID } from "../group-drafts";
import { type ManualFolder, type SmartFolder } from "../../persistence/local-folders-types";

// =============================================================================
// Test fixtures
// =============================================================================

const smartFolderA: SmartFolder = {
  id: "smart-seed-incomplete",
  name: "Incomplete",
  criteria: [],
  isSeeded: true,
};

const smartFolderB: SmartFolder = {
  id: "smart-user-01",
  name: "My Smart Folder",
  criteria: [],
  isSeeded: false,
};

const manualFolderA: ManualFolder = {
  id: "folder-aa01",
  name: "Team Alpha",
  createdAt: "2024-01-01T00:00:00Z",
};

const manualFolderB: ManualFolder = {
  id: "folder-bb02",
  name: "Team Beta",
  createdAt: "2024-02-01T00:00:00Z",
};

const defaultCounts: FolderRailProps["counts"] = {
  all: 7,
  archived: 2,
  manual: {
    "folder-aa01": 3,
    "folder-bb02": 1,
  },
  smart: {
    "smart-seed-incomplete": 4,
    "smart-user-01": 2,
  },
};

// =============================================================================
// Render helper
// =============================================================================

function renderRail(overrides: Partial<FolderRailProps> = {}) {
  const props: FolderRailProps = {
    selectedFolderId: null,
    onSelect: jest.fn<(id: string | null) => void>(),
    manualFolders: [manualFolderA, manualFolderB],
    smartFolders: [smartFolderA, smartFolderB],
    counts: defaultCounts,
    collapsed: false,
    onToggleCollapsed: jest.fn<() => void>(),
    onCreateManualFolder: jest.fn<(name: string) => void>(),
    onDeleteManualFolder: jest.fn<(id: string) => void>(),
    onCreateSmartFolder: jest.fn<() => void>(),
    ...overrides,
  };
  return { ...render(<FolderRail {...props} />), props };
}

// =============================================================================
// Tests
// =============================================================================

describe("FolderRail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Rendering — sections and counts
  // ---------------------------------------------------------------------------

  describe("renders all sections with counts", () => {
    it("renders 'All teams' item with correct count badge", () => {
      renderRail();
      expect(screen.getByRole("button", { name: "All teams" })).toBeInTheDocument();
      // badge value 7 should be present
      const badges = screen.getAllByTestId("badge");
      const allTeamsBadge = badges.find((b) => b.textContent === "7");
      expect(allTeamsBadge).toBeTruthy();
    });

    it("renders both seeded and user smart folders", () => {
      renderRail();
      expect(screen.getByRole("button", { name: "Incomplete" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "My Smart Folder" })).toBeInTheDocument();
    });

    it("renders smart folder counts in badges", () => {
      renderRail();
      const badges = screen.getAllByTestId("badge");
      const incompleteCount = badges.find((b) => b.textContent === "4");
      const smartUserCount = badges.find((b) => b.textContent === "2");
      expect(incompleteCount).toBeTruthy();
      expect(smartUserCount).toBeTruthy();
    });

    it("renders manual folders with their names", () => {
      renderRail();
      expect(screen.getByRole("button", { name: "Team Alpha" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Team Beta" })).toBeInTheDocument();
    });

    it("renders manual folder counts in badges", () => {
      renderRail();
      const badges = screen.getAllByTestId("badge");
      const alphaCount = badges.find((b) => b.textContent === "3");
      const betaCount = badges.find((b) => b.textContent === "1");
      expect(alphaCount).toBeTruthy();
      expect(betaCount).toBeTruthy();
    });

    it("renders Archived item with correct count badge", () => {
      renderRail();
      expect(screen.getByRole("button", { name: "Archived" })).toBeInTheDocument();
      const badges = screen.getAllByTestId("badge");
      const archivedBadge = badges.find((b) => b.textContent === "2");
      expect(archivedBadge).toBeTruthy();
    });

    it("renders section headings for Smart and Folders", () => {
      renderRail();
      expect(screen.getByText("Smart")).toBeInTheDocument();
      expect(screen.getByText("Folders")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. onSelect — clicking items
  // ---------------------------------------------------------------------------

  describe("onSelect callbacks", () => {
    it("calls onSelect(null) when All teams is clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderRail({ selectedFolderId: "folder-aa01" });
      await user.click(screen.getByRole("button", { name: "All teams" }));
      expect(props.onSelect).toHaveBeenCalledTimes(1);
      expect(props.onSelect).toHaveBeenCalledWith(null);
    });

    it("calls onSelect with the smart folder id when a smart folder is clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderRail();
      await user.click(screen.getByRole("button", { name: "Incomplete" }));
      expect(props.onSelect).toHaveBeenCalledWith("smart-seed-incomplete");
    });

    it("calls onSelect with the manual folder id when a manual folder is clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderRail();
      await user.click(screen.getByRole("button", { name: "Team Alpha" }));
      expect(props.onSelect).toHaveBeenCalledWith("folder-aa01");
    });

    it("calls onSelect(ARCHIVED_VIEW_ID) when Archived is clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderRail();
      await user.click(screen.getByRole("button", { name: "Archived" }));
      expect(props.onSelect).toHaveBeenCalledWith(ARCHIVED_VIEW_ID);
    });

    it("calls onSelect(null) for All teams even when another folder is selected", async () => {
      const user = userEvent.setup();
      const { props } = renderRail({ selectedFolderId: ARCHIVED_VIEW_ID });
      await user.click(screen.getByRole("button", { name: "All teams" }));
      expect(props.onSelect).toHaveBeenCalledWith(null);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Active folder has aria-pressed=true
  // ---------------------------------------------------------------------------

  describe("active state", () => {
    it("All teams button is aria-pressed=true when selectedFolderId is null", () => {
      renderRail({ selectedFolderId: null });
      expect(
        screen.getByRole("button", { name: "All teams" })
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("manual folder button is aria-pressed=true when it is the selected folder", () => {
      renderRail({ selectedFolderId: "folder-aa01" });
      expect(
        screen.getByRole("button", { name: "Team Alpha" })
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByRole("button", { name: "Team Beta" })
      ).toHaveAttribute("aria-pressed", "false");
    });

    it("smart folder button is aria-pressed=true when it is selected", () => {
      renderRail({ selectedFolderId: "smart-seed-incomplete" });
      expect(
        screen.getByRole("button", { name: "Incomplete" })
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("Archived button is aria-pressed=true when ARCHIVED_VIEW_ID is selected", () => {
      renderRail({ selectedFolderId: ARCHIVED_VIEW_ID });
      expect(
        screen.getByRole("button", { name: "Archived" })
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("All teams is NOT aria-pressed when another folder is active", () => {
      renderRail({ selectedFolderId: "folder-bb02" });
      expect(
        screen.getByRole("button", { name: "All teams" })
      ).toHaveAttribute("aria-pressed", "false");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. "+ New folder" flow
  // ---------------------------------------------------------------------------

  describe("new folder creation", () => {
    it("shows an input when '+ New folder' button is clicked", async () => {
      const user = userEvent.setup();
      renderRail();
      const newFolderBtn = screen.getByRole("button", { name: "New folder" });
      await user.click(newFolderBtn);
      expect(screen.getByTestId("new-folder-input")).toBeInTheDocument();
    });

    it("calls onCreateManualFolder with the typed name on Enter", async () => {
      const user = userEvent.setup();
      const { props } = renderRail();
      await user.click(screen.getByRole("button", { name: "New folder" }));
      const input = screen.getByTestId("new-folder-input");
      await user.type(input, "My New Folder");
      await user.keyboard("{Enter}");
      expect(props.onCreateManualFolder).toHaveBeenCalledTimes(1);
      expect(props.onCreateManualFolder).toHaveBeenCalledWith("My New Folder");
    });

    it("dismisses the input after folder is created", async () => {
      const user = userEvent.setup();
      renderRail();
      await user.click(screen.getByRole("button", { name: "New folder" }));
      const input = screen.getByTestId("new-folder-input");
      await user.type(input, "Test Folder");
      await user.keyboard("{Enter}");
      expect(screen.queryByTestId("new-folder-input")).not.toBeInTheDocument();
    });

    it("cancels the input on Escape without calling onCreateManualFolder", async () => {
      const user = userEvent.setup();
      const { props } = renderRail();
      await user.click(screen.getByRole("button", { name: "New folder" }));
      const input = screen.getByTestId("new-folder-input");
      await user.type(input, "Abandoned Name");
      await user.keyboard("{Escape}");
      expect(props.onCreateManualFolder).not.toHaveBeenCalled();
      expect(screen.queryByTestId("new-folder-input")).not.toBeInTheDocument();
    });

    it("does NOT call onCreateManualFolder with an empty name", async () => {
      const user = userEvent.setup();
      const { props } = renderRail();
      await user.click(screen.getByRole("button", { name: "New folder" }));
      const input = screen.getByTestId("new-folder-input");
      // Type nothing, just press Enter
      await user.click(input);
      await user.keyboard("{Enter}");
      expect(props.onCreateManualFolder).not.toHaveBeenCalled();
    });

    it("trims whitespace from folder name before calling onCreateManualFolder", async () => {
      const user = userEvent.setup();
      const { props } = renderRail();
      await user.click(screen.getByRole("button", { name: "New folder" }));
      const input = screen.getByTestId("new-folder-input");
      await user.type(input, "  Trimmed Name  ");
      await user.keyboard("{Enter}");
      expect(props.onCreateManualFolder).toHaveBeenCalledWith("Trimmed Name");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Manual folder ⋯ → Delete
  // ---------------------------------------------------------------------------

  describe("manual folder delete", () => {
    it("renders a dropdown trigger (⋯) for each manual folder", () => {
      renderRail();
      // Each manual folder has an options trigger
      const triggers = screen.getAllByRole("button", { name: /options for/i });
      expect(triggers).toHaveLength(2);
    });

    it("calls onDeleteManualFolder with the correct id when Delete is clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderRail();
      // The dropdown content is always visible in our mock
      const deleteItems = screen.getAllByTestId("dropdown-item");
      // Find the one in the context of Team Alpha — first manual folder
      const teamAlphaDelete = deleteItems[0];
      await user.click(teamAlphaDelete);
      expect(props.onDeleteManualFolder).toHaveBeenCalledTimes(1);
      expect(props.onDeleteManualFolder).toHaveBeenCalledWith("folder-aa01");
    });

    it("calls onDeleteManualFolder with the second folder id for the second row", async () => {
      const user = userEvent.setup();
      const { props } = renderRail();
      const deleteItems = screen.getAllByTestId("dropdown-item");
      await user.click(deleteItems[1]);
      expect(props.onDeleteManualFolder).toHaveBeenCalledWith("folder-bb02");
    });

    it("does NOT render dropdown triggers when onDeleteManualFolder is omitted", () => {
      renderRail({ onDeleteManualFolder: undefined });
      expect(screen.queryAllByRole("button", { name: /options for/i })).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. New smart folder button
  // ---------------------------------------------------------------------------

  describe("new smart folder", () => {
    it("renders '+ New smart folder' button when onCreateSmartFolder is provided", () => {
      renderRail();
      expect(screen.getByRole("button", { name: "New smart folder" })).toBeInTheDocument();
    });

    it("calls onCreateSmartFolder when '+ New smart folder' is clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderRail();
      await user.click(screen.getByRole("button", { name: "New smart folder" }));
      expect(props.onCreateSmartFolder).toHaveBeenCalledTimes(1);
    });

    it("does NOT render the '+ New smart folder' button when prop is omitted", () => {
      renderRail({ onCreateSmartFolder: undefined });
      expect(screen.queryByRole("button", { name: "New smart folder" })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Collapse toggle
  // ---------------------------------------------------------------------------

  describe("collapse toggle", () => {
    it("renders the collapse button", () => {
      renderRail();
      expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    });

    it("collapse button calls onToggleCollapsed when clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderRail();
      await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
      expect(props.onToggleCollapsed).toHaveBeenCalledTimes(1);
    });

    it("shows 'Expand sidebar' label when collapsed=true", () => {
      renderRail({ collapsed: true });
      expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    });

    it("⌘\\ keydown calls onToggleCollapsed (Mac Cmd)", () => {
      const { props } = renderRail();
      fireEvent.keyDown(window, { key: "\\", metaKey: true });
      expect(props.onToggleCollapsed).toHaveBeenCalledTimes(1);
    });

    it("Ctrl+\\ keydown calls onToggleCollapsed (Windows/Linux)", () => {
      const { props } = renderRail();
      fireEvent.keyDown(window, { key: "\\", ctrlKey: true });
      expect(props.onToggleCollapsed).toHaveBeenCalledTimes(1);
    });

    it("plain \\ keydown does NOT call onToggleCollapsed", () => {
      const { props } = renderRail();
      fireEvent.keyDown(window, { key: "\\" });
      expect(props.onToggleCollapsed).not.toHaveBeenCalled();
    });

    it("cleans up the keydown listener on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
      const { unmount, props } = renderRail();
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function)
      );
      // After unmount, the shortcut should not fire the handler
      jest.clearAllMocks();
      fireEvent.keyDown(window, { key: "\\", metaKey: true });
      expect(props.onToggleCollapsed).not.toHaveBeenCalled();
      removeEventListenerSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Collapsed mode — icons only
  // ---------------------------------------------------------------------------

  describe("collapsed mode", () => {
    it("hides text labels when collapsed", () => {
      renderRail({ collapsed: true });
      // Folder names should not appear as text nodes
      expect(screen.queryByText("All teams")).not.toBeInTheDocument();
      expect(screen.queryByText("Team Alpha")).not.toBeInTheDocument();
      expect(screen.queryByText("Archived")).not.toBeInTheDocument();
    });

    it("hides count badges when collapsed", () => {
      renderRail({ collapsed: true });
      expect(screen.queryAllByTestId("badge")).toHaveLength(0);
    });

    it("hides the '+ New folder' button when collapsed", () => {
      renderRail({ collapsed: true });
      expect(screen.queryByRole("button", { name: "New folder" })).not.toBeInTheDocument();
    });

    it("hides the '+ New smart folder' button when collapsed", () => {
      renderRail({ collapsed: true });
      expect(screen.queryByRole("button", { name: "New smart folder" })).not.toBeInTheDocument();
    });

    it("hides section headings when collapsed", () => {
      renderRail({ collapsed: true });
      expect(screen.queryByText("Smart")).not.toBeInTheDocument();
      expect(screen.queryByText("Folders")).not.toBeInTheDocument();
    });

    it("still renders selectable item buttons in collapsed mode", () => {
      renderRail({ collapsed: true });
      // Buttons with aria-label are still present even without visible text
      expect(screen.getByRole("button", { name: "All teams" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Archived" })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("renders correctly with no manual folders", () => {
      renderRail({ manualFolders: [] });
      expect(screen.queryByRole("button", { name: "Team Alpha" })).not.toBeInTheDocument();
      // New folder trigger still present
      expect(screen.getByRole("button", { name: "New folder" })).toBeInTheDocument();
    });

    it("renders correctly with no smart folders", () => {
      renderRail({ smartFolders: [] });
      expect(screen.queryByRole("button", { name: "Incomplete" })).not.toBeInTheDocument();
    });

    it("shows count 0 for a manual folder not in the counts map", () => {
      renderRail({
        counts: { ...defaultCounts, manual: {} },
      });
      // Badges should show 0 for manual folders when not in the map
      const badges = screen.getAllByTestId("badge");
      const zeroBadge = badges.find((b) => b.textContent === "0");
      expect(zeroBadge).toBeTruthy();
    });

    it("renders the nav with aria-label Folders", () => {
      renderRail();
      expect(screen.getByRole("navigation", { name: "Folders" })).toBeInTheDocument();
    });
  });
});
