import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

// Controlled mobile/client state
const mockUseIsMobile = jest.fn();
const mockUseIsClient = jest.fn();

jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

jest.mock("@/hooks/use-is-client", () => ({
  useIsClient: () => mockUseIsClient(),
}));

// Mock useAuthContext — controls the empty-state variant
const mockUseAuthContext = jest.fn();
jest.mock("@/components/auth/auth-provider", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

// Mock useUnifiedTeams so we can control state without a QueryClientProvider
const mockCreateDraft = jest.fn();
const mockDeleteDraft = jest.fn();
const mockPinDraft = jest.fn();
const mockArchiveDraft = jest.fn();
const mockToggleDraftFolder = jest.fn();
const mockRefetchAccount = jest.fn();
jest.mock("../../persistence/use-unified-teams", () => ({
  useUnifiedTeams: jest.fn(),
}));

// Mock useFolders
const mockCreateManualFolder = jest.fn();
const mockDeleteManualFolder = jest.fn();
const mockCreateSmartFolder = jest.fn();
jest.mock("../../persistence/use-folders", () => ({
  useFolders: jest.fn(),
}));

// Mock useLandingPrefs
const mockSetPrefs = jest.fn();
jest.mock("../../persistence/use-landing-prefs", () => ({
  useLandingPrefs: jest.fn(),
}));

// Mock next/navigation — capture router.push calls
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock sonner toast — must be callable as a function AND expose .success / .error
const mockToastFn = jest.fn();
const mockToast = Object.assign(mockToastFn, {
  success: jest.fn(),
  error: jest.fn(),
});
jest.mock("sonner", () => ({ toast: mockToast }));

// ---------------------------------------------------------------------------
// Heavy children — mock as light stubs that expose the props we assert on
// ---------------------------------------------------------------------------

// FolderRail stub — exposes onSelect, counts, collapsed, and folder creation callbacks
jest.mock("../folder-rail", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ARCHIVED_VIEW_ID } = require("../group-drafts");
  return {
  FolderRail: ({
    selectedFolderId,
    onSelect,
    counts,
    collapsed,
    onCreateManualFolder,
    onDeleteManualFolder,
    onCreateSmartFolder,
  }: {
    selectedFolderId: string | null;
    onSelect: (id: string | null) => void;
    counts: { all: number; archived: number; manual: Record<string, number>; smart: Record<string, number> };
    collapsed: boolean;
    onCreateManualFolder: (name: string) => void;
    onDeleteManualFolder?: (id: string) => void;
    onCreateSmartFolder?: () => void;
  }) => (
    <div
      data-testid="folder-rail"
      data-selected={selectedFolderId ?? "null"}
      data-collapsed={collapsed ? "true" : "false"}
      data-all-count={counts.all}
    >
      <button
        onClick={() => onSelect(null)}
        aria-label="Select All Teams folder"
      >
        All Teams
      </button>
      <button
        onClick={() => onSelect("folder-1")}
        aria-label="Select folder-1"
      >
        Folder 1
      </button>
      <button
        onClick={() => onSelect(ARCHIVED_VIEW_ID)}
        aria-label="Select Archived"
      >
        Archived
      </button>
      {onCreateManualFolder && (
        <button
          onClick={() => onCreateManualFolder("New Folder")}
          aria-label="Create manual folder"
        >
          + New Folder
        </button>
      )}
      {onDeleteManualFolder && (
        <button
          onClick={() => onDeleteManualFolder("folder-1")}
          aria-label="Delete folder-1"
        >
          Delete Folder
        </button>
      )}
      {onCreateSmartFolder && (
        <button onClick={onCreateSmartFolder} aria-label="New smart folder">
          + Smart Folder
        </button>
      )}
    </div>
  ),
  };
});

// TeamSections stub — exposes sections count and calls renderRow for each draft
jest.mock("../team-sections", () => ({
  TeamSections: ({
    sections,
    density,
    renderRow,
    emptyState,
  }: {
    sections: Array<{ id: string; drafts: Array<{ id: string }> }>;
    density: string;
    renderRow: (record: { id: string }, rowProps: { tabIndex: number; ref: () => void }) => React.ReactNode;
    emptyState?: React.ReactNode;
  }) => {
    const allDrafts = sections.flatMap((s) => s.drafts);
    if (allDrafts.length === 0) {
      return emptyState ? <>{emptyState}</> : null;
    }
    return (
      <div data-testid="team-sections" data-density={density} data-section-count={sections.length}>
        {allDrafts.map((record) =>
          renderRow(record, { tabIndex: 0, ref: () => {} })
        )}
      </div>
    );
  },
}));

// LandingToolbar stub — exposes sort, density, resultCount, change callbacks
jest.mock("../landing-toolbar", () => ({
  LandingToolbar: ({
    sort,
    density,
    resultCount,
    onSortChange,
    onDensityChange,
  }: {
    sort: string;
    density: string;
    resultCount?: number;
    onSortChange: (s: string) => void;
    onDensityChange: (d: string) => void;
  }) => (
    <div
      data-testid="landing-toolbar"
      data-sort={sort}
      data-density={density}
      data-result-count={resultCount}
    >
      <button onClick={() => onSortChange("name")} aria-label="Sort by name">
        Sort: Name
      </button>
      <button
        onClick={() => onDensityChange("compact")}
        aria-label="Density compact"
      >
        Compact
      </button>
    </div>
  ),
}));

// SmartSearch stub — renders a plain input so tests can type queries
jest.mock("../smart-search", () => ({
  SmartSearch: ({
    value,
    onValueChange,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    suggestions: unknown[];
  }) => (
    <input
      data-testid="smart-search"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder="Search teams…"
      aria-label="Search teams"
    />
  ),
}));

// CriteriaBuilder stub — exposes onSave + onCancel
jest.mock("../criteria-builder", () => ({
  CriteriaBuilder: ({
    initialName,
    initialCriteria,
    onSave,
    onCancel,
  }: {
    initialName?: string;
    initialCriteria?: unknown[];
    onSave: (name: string, criteria: unknown[]) => void;
    onCancel?: () => void;
  }) => (
    <div data-testid="criteria-builder" data-initial-name={initialName}>
      <button
        onClick={() => onSave("My Smart Folder", initialCriteria ?? [])}
        aria-label="Save smart folder"
      >
        Save folder
      </button>
      {onCancel && (
        <button onClick={onCancel} aria-label="Cancel criteria builder">
          Cancel
        </button>
      )}
    </div>
  ),
}));

// QuickLook stub — render children + a marker
jest.mock("../quick-look", () => ({
  QuickLook: ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: { name: string };
  }) => (
    <div data-testid="quick-look" data-name={data.name}>
      {children}
    </div>
  ),
}));

// QuickLookSheet stub
jest.mock("../quick-look-sheet", () => ({
  QuickLookSheet: ({
    open,
    data,
    onOpenChange,
  }: {
    open: boolean;
    data: { name: string };
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="quick-look-sheet" data-name={data.name}>
        <button onClick={() => onOpenChange(false)}>Close sheet</button>
      </div>
    ) : null,
}));

// Stub toQuickLookData
jest.mock("../quick-look-shared", () => ({
  toQuickLookData: jest.fn((record: { id: string; team: { name: string } }) => ({
    id: record.id,
    name: record.team.name || "Untitled Team",
    format: null,
    slots: [],
  })),
}));

// Stub toDraftSummary + draftEditorHref
jest.mock("../team-landing-shared", () => ({
  toDraftSummary: jest.fn((record: { id: string; team: { name: string } }) => ({
    id: record.id,
    name: record.team.name || "Untitled Team",
    format: null,
    filledCount: 0,
    species: [],
    updatedAt: "2026-06-23T00:00:00Z",
  })),
  draftEditorHref: jest.fn((id: string) => `/builder/t/${id}`),
  UNTITLED_DRAFT_NAME: "Untitled Team",
}));

// TeamRow stub — accepts all props including Milestone B + C additions
jest.mock("../team-row", () => ({
  TeamRow: ({
    summary,
    onDelete,
    onTogglePin,
    onToggleArchive,
    onToggleFolder,
    onPeek,
    pinned,
    archived,
    selectable,
    selected,
    onToggleSelect,
  }: {
    summary: { id: string; name: string };
    onDelete?: (id: string) => void;
    onTogglePin?: (id: string) => void;
    onToggleArchive?: (id: string) => void;
    onToggleFolder?: (id: string, folderId: string) => void;
    onPeek?: (id: string) => void;
    pinned?: boolean;
    archived?: boolean;
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: (id: string, opts: { shift: boolean }) => void;
  }) => (
    <div
      data-testid={`team-row-${summary.id}`}
      data-pinned={pinned ? "true" : "false"}
      data-archived={archived ? "true" : "false"}
      data-selectable={selectable ? "true" : "false"}
      data-selected={selected ? "true" : "false"}
    >
      <span>{summary.name}</span>
      {onDelete && (
        <button
          onClick={() => onDelete(summary.id)}
          aria-label={`Delete ${summary.name}`}
        >
          Delete
        </button>
      )}
      {onTogglePin && (
        <button
          onClick={() => onTogglePin(summary.id)}
          aria-label={`Toggle pin ${summary.name}`}
        >
          Pin
        </button>
      )}
      {onToggleArchive && (
        <button
          onClick={() => onToggleArchive(summary.id)}
          aria-label={`Toggle archive ${summary.name}`}
        >
          Archive
        </button>
      )}
      {onToggleFolder && (
        <button
          onClick={() => onToggleFolder(summary.id, "folder-1")}
          aria-label={`Move ${summary.name} to folder`}
        >
          Move to folder
        </button>
      )}
      {onPeek && (
        <button
          onClick={() => onPeek(summary.id)}
          aria-label={`Peek ${summary.name}`}
        >
          Peek
        </button>
      )}
      {selectable && onToggleSelect && (
        <button
          role="checkbox"
          aria-checked={selected ?? false}
          onClick={() => onToggleSelect(summary.id, { shift: false })}
          aria-label={`Select ${summary.name}`}
          data-testid={`row-checkbox-${summary.id}`}
        >
          Select
        </button>
      )}
    </div>
  ),
}));

// BulkActionBar stub — exposes selectedCount + action callbacks
jest.mock("../bulk-action-bar", () => ({
  BulkActionBar: ({
    selectedCount,
    onMoveToFolder,
    onExport,
    onArchive,
    onDelete,
    onClear,
  }: {
    selectedCount: number;
    manualFolders: unknown[];
    onMoveToFolder: (folderId: string) => void;
    onExport: () => void;
    onArchive: () => void;
    onDelete: () => void;
    onClear: () => void;
  }) => {
    if (selectedCount === 0) return null;
    return (
      <div
        data-testid="bulk-action-bar"
        aria-label="Bulk actions"
        data-count={selectedCount}
      >
        <span>{selectedCount} selected</span>
        <button onClick={() => onMoveToFolder("folder-1")} aria-label="Move to folder">
          Move to folder
        </button>
        <button onClick={onExport} aria-label="Export selected">
          Export
        </button>
        <button onClick={onArchive} aria-label="Archive selected">
          Archive
        </button>
        <button onClick={onDelete} aria-label="Delete selected">
          Delete
        </button>
        <button onClick={onClear} aria-label="Clear selection">
          Clear
        </button>
      </div>
    );
  },
}));

// ReconcileBanner stub — only rendered on authenticated paths (userId != null);
// kept minimal since guest tests never trigger it.
jest.mock("../reconcile-banner", () => ({
  ReconcileBanner: () => null,
}));

// LandingEmptyState stub — exposes variant + onNewTeam
jest.mock("../empty-state", () => ({
  LandingEmptyState: ({
    variant,
    onNewTeam,
  }: {
    variant: "guest" | "authed";
    onNewTeam: () => void;
    onImport?: () => void;
  }) => (
    <div data-testid="landing-empty-state" data-variant={variant}>
      <button
        onClick={onNewTeam}
        aria-label="Create your first team"
      >
        Start from scratch
      </button>
    </div>
  ),
}));

// Mock Button — render a real <button> so userEvent.click works
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    "aria-label": ariaLabel,
    size: _size,
    variant: _variant,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: string;
    variant?: string;
    "aria-label"?: string;
  }) => (
    <button
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </button>
  ),
}));

// Mock Dialog / DialogContent / DialogHeader / DialogTitle
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="dialog" role="dialog">
        {children}
        <button onClick={() => onOpenChange?.(false)} aria-label="Close dialog">
          Close
        </button>
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

// Mock Sheet / SheetContent / SheetHeader / SheetTitle / SheetTrigger
jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="sheet" data-open={open ? "true" : "false"}>
      {children}
      {open && (
        <button onClick={() => onOpenChange?.(false)} aria-label="Close sheet">
          Close sheet
        </button>
      )}
    </div>
  ),
  SheetTrigger: ({
    children,
    className,
    "aria-label": ariaLabel,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    "aria-label"?: string;
    onClick?: () => void;
  }) => (
    <button
      data-testid="sheet-trigger"
      className={className}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  SheetContent: ({
    children,
  }: {
    children: React.ReactNode;
    side?: string;
    className?: string;
  }) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sheet-header" className={className}>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="sheet-title">{children}</h2>
  ),
}));

// Stub lucide-react icons
jest.mock("lucide-react", () => {
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

import { TeamsLandingClient } from "../teams-landing-client";
import { useUnifiedTeams } from "../../persistence/use-unified-teams";
import { useFolders } from "../../persistence/use-folders";
import { useLandingPrefs } from "../../persistence/use-landing-prefs";

// =============================================================================
// Helpers
// =============================================================================

type MockUseUnifiedTeams = jest.MockedFunction<typeof useUnifiedTeams>;
type MockUseFolders = jest.MockedFunction<typeof useFolders>;
type MockUseLandingPrefs = jest.MockedFunction<typeof useLandingPrefs>;

/** Build a minimal LocalDraftRecord for testing. */
function makeDraftRecord(
  id: string,
  name = "Test Team",
  opts: { pinned?: boolean; archived?: boolean; folderIds?: string[] } = {}
) {
  return {
    id,
    team: {
      id: -1,
      name,
      format: null,
      format_legal: null,
      description: null,
      notes: null,
      tags: null,
      is_public: null,
      parent_team_id: null,
      created_by: -1,
      created_at: "2026-06-23T00:00:00Z",
      updated_at: "2026-06-23T00:00:00Z",
      team_pokemon: [],
    },
    createdAt: "2026-06-23T00:00:00Z",
    updatedAt: "2026-06-23T00:00:00Z",
    pinned: opts.pinned ?? false,
    archived: opts.archived ?? false,
    sortOrder: null,
    folderIds: opts.folderIds ?? [],
  };
}

/** Default hook return values for a fresh, hydrated state (useUnifiedTeams shape). */
function makeDefaultDraftsHook(drafts = [makeRecord("local-aa01", "Test Team")]) {
  return {
    drafts,
    hydrated: true,
    createDraft: mockCreateDraft,
    deleteDraft: mockDeleteDraft,
    pinDraft: mockPinDraft,
    archiveDraft: mockArchiveDraft,
    setDraftSortOrder: jest.fn(),
    toggleDraftFolder: mockToggleDraftFolder,
    accountLoading: false,
    accountError: null,
    refetchAccount: mockRefetchAccount,
  };
}

function makeRecord(id: string, name = "Test Team", opts = {}) {
  return makeDraftRecord(id, name, opts);
}

function setupDefaultMocks(drafts = [makeRecord("local-aa01")]) {
  (useUnifiedTeams as MockUseUnifiedTeams).mockReturnValue(
    makeDefaultDraftsHook(drafts)
  );
  (useFolders as MockUseFolders).mockReturnValue({
    manualFolders: [],
    smartFolders: [],
    hydrated: true,
    createManualFolder: mockCreateManualFolder,
    renameManualFolder: jest.fn(),
    deleteManualFolder: mockDeleteManualFolder,
    createSmartFolder: mockCreateSmartFolder,
    deleteSmartFolder: jest.fn(),
  });
  (useLandingPrefs as MockUseLandingPrefs).mockReturnValue({
    prefs: {
      sort: "recent",
      density: "comfortable",
      railCollapsed: false,
      selectedFolderId: null,
    },
    hydrated: true,
    setPrefs: mockSetPrefs,
  });
}

// =============================================================================
// Tests
// =============================================================================

describe("TeamsLandingClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to desktop + hydrated
    mockUseIsClient.mockReturnValue(true);
    mockUseIsMobile.mockReturnValue(false);
    // Auth context mock is kept for module resolution (the component no longer calls it;
    // authentication is controlled via the userId prop passed to TeamsLandingClient).
    mockUseAuthContext.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      signOut: jest.fn(),
      refetchUser: jest.fn(),
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Draft list rendering
  // ---------------------------------------------------------------------------

  describe("draft list", () => {
    it("renders a TeamRow for each draft", () => {
      setupDefaultMocks([
        makeRecord("local-aa01", "Rain Team"),
        makeRecord("local-aa02", "Trick Room"),
      ]);
      render(<TeamsLandingClient />);
      expect(screen.getByTestId("team-row-local-aa01")).toBeInTheDocument();
      expect(screen.getByTestId("team-row-local-aa02")).toBeInTheDocument();
    });

    it("renders exactly as many rows as there are drafts", () => {
      setupDefaultMocks([
        makeRecord("local-bb01"),
        makeRecord("local-bb02"),
        makeRecord("local-bb03"),
      ]);
      render(<TeamsLandingClient />);
      expect(screen.getAllByTestId(/^team-row-/)).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. New Team button
  // ---------------------------------------------------------------------------

  describe("New Team button", () => {
    it("calls createDraft and navigates when header button is clicked", async () => {
      const returnedRecord = makeRecord("local-new01", "New Draft");
      mockCreateDraft.mockReturnValue(returnedRecord);
      // Seed one existing draft so the populated branch (with the header "Create a
      // new team" button) renders — the empty branch only shows "Create your first team".
      setupDefaultMocks([makeRecord("local-existing01", "Existing Team")]);

      const user = userEvent.setup();
      render(<TeamsLandingClient />);

      await user.click(screen.getByRole("button", { name: /create a new team/i }));
      expect(mockCreateDraft).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/builder/t/local-new01");
    });

    it("empty-state New Team button also creates and navigates", async () => {
      const returnedRecord = makeRecord("local-new02");
      mockCreateDraft.mockReturnValue(returnedRecord);
      setupDefaultMocks([]);

      const user = userEvent.setup();
      render(<TeamsLandingClient />);

      await user.click(
        screen.getByRole("button", { name: /create your first team/i })
      );
      expect(mockCreateDraft).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/builder/t/local-new02");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Empty state — LandingEmptyState (Milestone C)
  // ---------------------------------------------------------------------------

  describe("empty state", () => {
    it("renders LandingEmptyState with guest variant when drafts is empty and userId is null", () => {
      setupDefaultMocks([]);
      render(<TeamsLandingClient userId={null} />);
      const emptyState = screen.getByTestId("landing-empty-state");
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveAttribute("data-variant", "guest");
    });

    it("renders LandingEmptyState with authed variant when userId is provided and no drafts", () => {
      setupDefaultMocks([]);
      render(<TeamsLandingClient userId="user-1" />);
      const emptyState = screen.getByTestId("landing-empty-state");
      expect(emptyState).toHaveAttribute("data-variant", "authed");
    });

    it("does NOT show LandingEmptyState when there are drafts", () => {
      setupDefaultMocks([makeRecord("local-cc01", "Existing Team")]);
      render(<TeamsLandingClient />);
      expect(screen.queryByTestId("landing-empty-state")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Loading skeleton
  // ---------------------------------------------------------------------------

  describe("loading skeleton", () => {
    it("shows skeleton when hydrated is false", () => {
      (useUnifiedTeams as MockUseUnifiedTeams).mockReturnValue({
        ...makeDefaultDraftsHook([]),
        hydrated: false,
      });
      (useFolders as MockUseFolders).mockReturnValue({
        manualFolders: [],
        smartFolders: [],
        hydrated: false,
        createManualFolder: mockCreateManualFolder,
        renameManualFolder: jest.fn(),
        deleteManualFolder: mockDeleteManualFolder,
        createSmartFolder: mockCreateSmartFolder,
        deleteSmartFolder: jest.fn(),
      });
      (useLandingPrefs as MockUseLandingPrefs).mockReturnValue({
        prefs: { sort: "recent", density: "comfortable", railCollapsed: false, selectedFolderId: null },
        hydrated: false,
        setPrefs: mockSetPrefs,
      });

      render(<TeamsLandingClient />);
      const skeleton = document.querySelector("[aria-hidden]");
      expect(skeleton).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Single-row delete routes through undoable delete
  //    (immediate UI removal via pendingIds; actual deleteDraft is deferred)
  // ---------------------------------------------------------------------------

  describe("delete interaction", () => {
    beforeEach(() => {
      // Use real timers to control the undoable-delete window
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("row disappears immediately when Delete is triggered (pendingIds filtering)", async () => {
      setupDefaultMocks([makeRecord("local-del01", "Delete Me")]);
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TeamsLandingClient />);

      expect(screen.getByTestId("team-row-local-del01")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Delete Delete Me" }));

      // The row should be gone from the rendered list immediately
      expect(screen.queryByTestId("team-row-local-del01")).not.toBeInTheDocument();
    });

    it("calls deleteDraft after the undo window expires", async () => {
      setupDefaultMocks([makeRecord("local-del02", "Bye Team")]);
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TeamsLandingClient />);

      await user.click(screen.getByRole("button", { name: "Delete Bye Team" }));

      // Not yet called — still within the 5s undo window
      expect(mockDeleteDraft).not.toHaveBeenCalled();

      // Fast-forward past the undo window
      jest.runAllTimers();
      expect(mockDeleteDraft).toHaveBeenCalledWith("local-del02");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Page header
  // ---------------------------------------------------------------------------

  describe("page header", () => {
    it("always shows the 'Your Teams' heading", () => {
      // Seed one draft so the populated branch renders — the empty-state branch
      // does not include the "Your Teams" heading.
      setupDefaultMocks([makeRecord("local-hdr00")]);
      render(<TeamsLandingClient />);
      expect(screen.getByRole("heading", { name: /your teams/i })).toBeInTheDocument();
    });

    it("always shows the header New Team button", () => {
      setupDefaultMocks([makeRecord("local-hdr01")]);
      render(<TeamsLandingClient />);
      expect(
        screen.getByRole("button", { name: /create a new team/i })
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Search filtering
  // ---------------------------------------------------------------------------

  describe("search filtering", () => {
    it("shows SmartSearch when there are drafts", () => {
      setupDefaultMocks([makeRecord("local-s01", "Rain Team")]);
      render(<TeamsLandingClient />);
      expect(screen.getByTestId("smart-search")).toBeInTheDocument();
    });

    it("does not show SmartSearch when there are no drafts", () => {
      setupDefaultMocks([]);
      render(<TeamsLandingClient />);
      expect(screen.queryByTestId("smart-search")).not.toBeInTheDocument();
    });

    it("typing a query that matches only one draft filters to one row", async () => {
      const user = userEvent.setup();
      setupDefaultMocks([
        makeRecord("local-s01", "Rain Team"),
        makeRecord("local-s02", "Trick Room"),
      ]);
      render(<TeamsLandingClient />);

      await user.type(screen.getByTestId("smart-search"), "Rain");

      // Rain Team matches "Rain" by name; Trick Room does not
      expect(screen.getByTestId("team-row-local-s01")).toBeInTheDocument();
      expect(screen.queryByTestId("team-row-local-s02")).not.toBeInTheDocument();
    });

    it("shows 'no matches' state when search yields no results", async () => {
      const user = userEvent.setup();
      setupDefaultMocks([makeRecord("local-s03", "Rain Team")]);
      render(<TeamsLandingClient />);

      await user.type(screen.getByTestId("smart-search"), "xyzzy");
      expect(screen.getByText(/no teams matched/i)).toBeInTheDocument();
    });

    it("clear-search button resets filter and shows all drafts again", async () => {
      const user = userEvent.setup();
      setupDefaultMocks([makeRecord("local-s04", "Rain Team")]);
      render(<TeamsLandingClient />);

      await user.type(screen.getByTestId("smart-search"), "xyzzy");
      expect(screen.getByText(/no teams matched/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /clear search/i }));
      expect(screen.getByTestId("team-row-local-s04")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Quick-look — desktop vs mobile conditional mount
  // ---------------------------------------------------------------------------

  describe("quick-look conditional mount", () => {
    describe("desktop (isClient=true, isMobile=false)", () => {
      beforeEach(() => {
        mockUseIsClient.mockReturnValue(true);
        mockUseIsMobile.mockReturnValue(false);
      });

      it("wraps each row in a QuickLook hovercard on desktop", () => {
        setupDefaultMocks([makeRecord("local-ql01", "Rain Team")]);
        render(<TeamsLandingClient />);
        expect(screen.getByTestId("quick-look")).toBeInTheDocument();
      });

      it("does NOT render a QuickLookSheet on desktop", () => {
        setupDefaultMocks([makeRecord("local-ql02")]);
        render(<TeamsLandingClient />);
        expect(screen.queryByTestId("quick-look-sheet")).not.toBeInTheDocument();
      });

      it("rows do NOT receive onPeek on desktop", () => {
        setupDefaultMocks([makeRecord("local-ql03", "Rain Team")]);
        render(<TeamsLandingClient />);
        expect(
          screen.queryByRole("button", { name: /peek/i })
        ).not.toBeInTheDocument();
      });
    });

    describe("mobile (isClient=true, isMobile=true)", () => {
      beforeEach(() => {
        mockUseIsClient.mockReturnValue(true);
        mockUseIsMobile.mockReturnValue(true);
      });

      it("does NOT wrap rows in QuickLook on mobile", () => {
        setupDefaultMocks([makeRecord("local-mob01")]);
        render(<TeamsLandingClient />);
        expect(screen.queryByTestId("quick-look")).not.toBeInTheDocument();
      });

      it("rows receive onPeek on mobile; clicking it opens the sheet", async () => {
        const user = userEvent.setup();
        setupDefaultMocks([makeRecord("local-mob03", "Rain Team")]);
        render(<TeamsLandingClient />);

        const peekBtn = screen.getByRole("button", { name: /peek rain team/i });
        await user.click(peekBtn);

        expect(screen.getByTestId("quick-look-sheet")).toBeInTheDocument();
      });

      it("closing the sheet clears peekId", async () => {
        const user = userEvent.setup();
        setupDefaultMocks([makeRecord("local-mob04", "Rain Team")]);
        render(<TeamsLandingClient />);

        await user.click(screen.getByRole("button", { name: /peek rain team/i }));
        expect(screen.getByTestId("quick-look-sheet")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /close sheet/i }));
        expect(screen.queryByTestId("quick-look-sheet")).not.toBeInTheDocument();
      });
    });

    describe("SSR / pre-hydration (isClient=false)", () => {
      beforeEach(() => {
        mockUseIsClient.mockReturnValue(false);
        mockUseIsMobile.mockReturnValue(false);
      });

      it("does not render QuickLook or QuickLookSheet when not client", () => {
        setupDefaultMocks([makeRecord("local-ssr01")]);
        render(<TeamsLandingClient />);
        expect(screen.queryByTestId("quick-look")).not.toBeInTheDocument();
        expect(screen.queryByTestId("quick-look-sheet")).not.toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Folder rail — inline on desktop, Sheet on mobile
  // ---------------------------------------------------------------------------

  describe("folder rail mount", () => {
    it("renders FolderRail inline on desktop", () => {
      setupDefaultMocks([makeRecord("local-r01")]);
      render(<TeamsLandingClient />);
      expect(screen.getByTestId("folder-rail")).toBeInTheDocument();
    });

    it("does NOT render a mobile sheet trigger on desktop", () => {
      setupDefaultMocks([makeRecord("local-r02")]);
      render(<TeamsLandingClient />);
      expect(screen.queryByTestId("sheet-trigger")).not.toBeInTheDocument();
    });

    it("renders a sheet trigger (Folders button) on mobile instead of inline rail", () => {
      mockUseIsMobile.mockReturnValue(true);
      setupDefaultMocks([makeRecord("local-r03")]);
      render(<TeamsLandingClient />);
      expect(screen.getByTestId("sheet-trigger")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Folder selection calls setPrefs
  // ---------------------------------------------------------------------------

  describe("folder selection", () => {
    it("selecting a folder calls setPrefs({ selectedFolderId })", async () => {
      const user = userEvent.setup();
      setupDefaultMocks([makeRecord("local-f01")]);
      render(<TeamsLandingClient />);

      await user.click(screen.getByRole("button", { name: /select folder-1/i }));
      expect(mockSetPrefs).toHaveBeenCalledWith({ selectedFolderId: "folder-1" });
    });

    it("selecting All Teams calls setPrefs({ selectedFolderId: null })", async () => {
      const user = userEvent.setup();
      // Start with a folder selected
      (useLandingPrefs as MockUseLandingPrefs).mockReturnValue({
        prefs: { sort: "recent", density: "comfortable", railCollapsed: false, selectedFolderId: "folder-1" },
        hydrated: true,
        setPrefs: mockSetPrefs,
      });
      (useUnifiedTeams as MockUseUnifiedTeams).mockReturnValue(makeDefaultDraftsHook([makeRecord("local-f02")]));
      (useFolders as MockUseFolders).mockReturnValue({
        manualFolders: [],
        smartFolders: [],
        hydrated: true,
        createManualFolder: mockCreateManualFolder,
        renameManualFolder: jest.fn(),
        deleteManualFolder: mockDeleteManualFolder,
        createSmartFolder: mockCreateSmartFolder,
        deleteSmartFolder: jest.fn(),
      });
      render(<TeamsLandingClient />);

      await user.click(screen.getByRole("button", { name: /select all teams/i }));
      expect(mockSetPrefs).toHaveBeenCalledWith({ selectedFolderId: null });
    });
  });

  // ---------------------------------------------------------------------------
  // 11. Sort / density changes call setPrefs
  // ---------------------------------------------------------------------------

  describe("sort and density controls", () => {
    it("sort change calls setPrefs({ sort })", async () => {
      const user = userEvent.setup();
      setupDefaultMocks([makeRecord("local-t01")]);
      render(<TeamsLandingClient />);

      await user.click(screen.getByRole("button", { name: /sort by name/i }));
      expect(mockSetPrefs).toHaveBeenCalledWith({ sort: "name" });
    });

    it("density change calls setPrefs({ density })", async () => {
      const user = userEvent.setup();
      setupDefaultMocks([makeRecord("local-t02")]);
      render(<TeamsLandingClient />);

      await user.click(screen.getByRole("button", { name: /density compact/i }));
      expect(mockSetPrefs).toHaveBeenCalledWith({ density: "compact" });
    });
  });

  // ---------------------------------------------------------------------------
  // 12. Rail counts are passed over ALL drafts
  // ---------------------------------------------------------------------------

  describe("rail counts", () => {
    it("FolderRail receives the count of all non-archived drafts", () => {
      setupDefaultMocks([
        makeRecord("local-cnt01"),
        makeRecord("local-cnt02"),
        makeRecord("local-cnt03", "Archived", { archived: true }),
      ]);
      render(<TeamsLandingClient />);

      // countDrafts(3 drafts, [], []) → all=2, archived=1
      const rail = screen.getByTestId("folder-rail");
      expect(rail.getAttribute("data-all-count")).toBe("2");
    });
  });

  // ---------------------------------------------------------------------------
  // 13. Pin action reaches the store mutator
  // ---------------------------------------------------------------------------

  describe("pin/unpin interaction", () => {
    it("clicking Toggle pin calls pinDraft with correct args (unpin→pin)", async () => {
      const user = userEvent.setup();
      const draft = makeRecord("local-p01", "Pinned Team", { pinned: false });
      setupDefaultMocks([draft]);
      render(<TeamsLandingClient />);

      await user.click(
        screen.getByRole("button", { name: /toggle pin pinned team/i })
      );
      // draft.pinned=false → handleTogglePin calls pinDraft(id, true)
      expect(mockPinDraft).toHaveBeenCalledWith("local-p01", true);
    });

    it("clicking Toggle pin on a pinned draft calls pinDraft with pinned=false", async () => {
      const user = userEvent.setup();
      const draft = makeRecord("local-p02", "Pinned Draft", { pinned: true });
      setupDefaultMocks([draft]);
      render(<TeamsLandingClient />);

      await user.click(
        screen.getByRole("button", { name: /toggle pin pinned draft/i })
      );
      expect(mockPinDraft).toHaveBeenCalledWith("local-p02", false);
    });
  });

  // ---------------------------------------------------------------------------
  // 14. Archive action reaches the store mutator + toast
  // ---------------------------------------------------------------------------

  describe("archive/unarchive interaction", () => {
    it("clicking Toggle archive calls archiveDraft(id, true) and shows toast", async () => {
      const user = userEvent.setup();
      const draft = makeRecord("local-a01", "Archivable Team", { archived: false });
      setupDefaultMocks([draft]);
      render(<TeamsLandingClient />);

      await user.click(
        screen.getByRole("button", { name: /toggle archive archivable team/i })
      );
      expect(mockArchiveDraft).toHaveBeenCalledWith("local-a01", true);
      expect(mockToast.success).toHaveBeenCalledWith("Team archived");
    });

    it("clicking Toggle archive on an archived draft unarchives it (archived view)", async () => {
      const user = userEvent.setup();
      // Use the archived view so the archived draft is visible
      const draft = makeRecord("local-a02", "Archived Team", { archived: true });
      (useLandingPrefs as MockUseLandingPrefs).mockReturnValue({
        prefs: {
          sort: "recent",
          density: "comfortable",
          railCollapsed: false,
          selectedFolderId: "__archived__",
        },
        hydrated: true,
        setPrefs: mockSetPrefs,
      });
      (useUnifiedTeams as MockUseUnifiedTeams).mockReturnValue(makeDefaultDraftsHook([draft]));
      (useFolders as MockUseFolders).mockReturnValue({
        manualFolders: [],
        smartFolders: [],
        hydrated: true,
        createManualFolder: mockCreateManualFolder,
        renameManualFolder: jest.fn(),
        deleteManualFolder: mockDeleteManualFolder,
        createSmartFolder: mockCreateSmartFolder,
        deleteSmartFolder: jest.fn(),
      });
      render(<TeamsLandingClient />);

      await user.click(
        screen.getByRole("button", { name: /toggle archive archived team/i })
      );
      expect(mockArchiveDraft).toHaveBeenCalledWith("local-a02", false);
      expect(mockToast.success).toHaveBeenCalledWith("Team unarchived");
    });
  });

  // ---------------------------------------------------------------------------
  // 15. Move to folder wired to toggleDraftFolder
  // ---------------------------------------------------------------------------

  describe("move to folder interaction", () => {
    it("clicking 'Move to folder' calls toggleDraftFolder with (id, folderId)", async () => {
      const user = userEvent.setup();
      const draft = makeRecord("local-m01", "Movable Team", { folderIds: [] });
      setupDefaultMocks([draft]);
      render(<TeamsLandingClient />);

      await user.click(
        screen.getByRole("button", { name: /move movable team to folder/i })
      );
      expect(mockToggleDraftFolder).toHaveBeenCalledWith("local-m01", "folder-1");
    });
  });

  // ---------------------------------------------------------------------------
  // 16. "Save as smart folder" — opens dialog pre-filled with query predicates
  // ---------------------------------------------------------------------------

  describe("save as smart folder", () => {
    it("shows 'Save as folder' button only when there is an active search query", async () => {
      const user = userEvent.setup();
      setupDefaultMocks([makeRecord("local-sf01", "Rain Team")]);
      render(<TeamsLandingClient />);

      // No query yet — button should not appear
      expect(
        screen.queryByRole("button", { name: /save as (smart )?folder/i })
      ).not.toBeInTheDocument();

      // Type a query
      await user.type(screen.getByTestId("smart-search"), "Rain");
      expect(
        screen.getByRole("button", { name: /save as (smart )?folder/i })
      ).toBeInTheDocument();
    });

    it("clicking 'Save as smart folder' opens a Dialog", async () => {
      const user = userEvent.setup();
      setupDefaultMocks([makeRecord("local-sf02", "Rain Team")]);
      render(<TeamsLandingClient />);

      await user.type(screen.getByTestId("smart-search"), "Rain");
      await user.click(
        screen.getByRole("button", { name: /save as (smart )?folder/i })
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("criteria-builder")).toBeInTheDocument();
    });

    it("submitting the criteria builder calls createSmartFolder and fires toast", async () => {
      const user = userEvent.setup();
      setupDefaultMocks([makeRecord("local-sf03", "Rain Team")]);
      render(<TeamsLandingClient />);

      await user.type(screen.getByTestId("smart-search"), "Rain");
      await user.click(
        screen.getByRole("button", { name: /save as (smart )?folder/i })
      );
      await user.click(screen.getByRole("button", { name: /save smart folder/i }));

      expect(mockCreateSmartFolder).toHaveBeenCalledTimes(1);
      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining("folder")
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 17. "New smart folder" via rail callback opens dialog
  // ---------------------------------------------------------------------------

  describe("new smart folder via rail", () => {
    it("clicking 'New smart folder' from the rail opens the criteria dialog", async () => {
      const user = userEvent.setup();
      setupDefaultMocks([makeRecord("local-nsf01")]);
      render(<TeamsLandingClient />);

      await user.click(screen.getByRole("button", { name: /new smart folder/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("criteria-builder")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 18. Archived view note
  // ---------------------------------------------------------------------------

  describe("archived view", () => {
    it("shows archived-view note when selectedFolderId === ARCHIVED_VIEW_ID", () => {
      (useLandingPrefs as MockUseLandingPrefs).mockReturnValue({
        prefs: {
          sort: "recent",
          density: "comfortable",
          railCollapsed: false,
          selectedFolderId: "__archived__",
        },
        hydrated: true,
        setPrefs: mockSetPrefs,
      });
      (useUnifiedTeams as MockUseUnifiedTeams).mockReturnValue(
        makeDefaultDraftsHook([makeRecord("local-arc01")])
      );
      (useFolders as MockUseFolders).mockReturnValue({
        manualFolders: [],
        smartFolders: [],
        hydrated: true,
        createManualFolder: mockCreateManualFolder,
        renameManualFolder: jest.fn(),
        deleteManualFolder: mockDeleteManualFolder,
        createSmartFolder: mockCreateSmartFolder,
        deleteSmartFolder: jest.fn(),
      });
      render(<TeamsLandingClient />);

      expect(screen.getByText(/viewing archived teams/i)).toBeInTheDocument();
    });

    it("does NOT show archived-view note in the default 'All teams' view", () => {
      setupDefaultMocks([makeRecord("local-arc02")]);
      render(<TeamsLandingClient />);
      expect(screen.queryByText(/viewing archived teams/i)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 19. LandingToolbar receives prefs and result count
  // ---------------------------------------------------------------------------

  describe("toolbar", () => {
    it("passes sort and density from prefs to LandingToolbar", () => {
      (useLandingPrefs as MockUseLandingPrefs).mockReturnValue({
        prefs: { sort: "name", density: "compact", railCollapsed: false, selectedFolderId: null },
        hydrated: true,
        setPrefs: mockSetPrefs,
      });
      (useUnifiedTeams as MockUseUnifiedTeams).mockReturnValue(
        makeDefaultDraftsHook([makeRecord("local-tb01")])
      );
      (useFolders as MockUseFolders).mockReturnValue({
        manualFolders: [],
        smartFolders: [],
        hydrated: true,
        createManualFolder: mockCreateManualFolder,
        renameManualFolder: jest.fn(),
        deleteManualFolder: mockDeleteManualFolder,
        createSmartFolder: mockCreateSmartFolder,
        deleteSmartFolder: jest.fn(),
      });
      render(<TeamsLandingClient />);

      const toolbar = screen.getByTestId("landing-toolbar");
      expect(toolbar.getAttribute("data-sort")).toBe("name");
      expect(toolbar.getAttribute("data-density")).toBe("compact");
    });
  });

  // ---------------------------------------------------------------------------
  // 20. Bulk selection — BulkActionBar appears / hides (Milestone C)
  // ---------------------------------------------------------------------------

  describe("bulk selection and BulkActionBar", () => {
    it("BulkActionBar is NOT rendered when no rows are selected", () => {
      setupDefaultMocks([makeRecord("local-bs01", "Team A")]);
      render(<TeamsLandingClient />);
      expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
    });

    it("BulkActionBar appears with correct count after selecting a row", async () => {
      setupDefaultMocks([makeRecord("local-bs02", "Team A")]);
      const user = userEvent.setup();
      render(<TeamsLandingClient />);

      // Click the row's checkbox (rendered by the stub when selectable)
      await user.click(screen.getByRole("checkbox", { name: /select team a/i }));

      const bar = screen.getByTestId("bulk-action-bar");
      expect(bar).toBeInTheDocument();
      expect(bar).toHaveAttribute("data-count", "1");
    });

    it("Clear button empties the selection and hides the BulkActionBar", async () => {
      setupDefaultMocks([makeRecord("local-bs03", "Team B")]);
      const user = userEvent.setup();
      render(<TeamsLandingClient />);

      // Select a row
      await user.click(screen.getByRole("checkbox", { name: /select team b/i }));
      expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();

      // Clear selection
      await user.click(screen.getByRole("button", { name: /clear selection/i }));
      expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 21. Bulk Archive — calls archiveDraft for each selected id (Milestone C)
  // ---------------------------------------------------------------------------

  describe("bulk archive", () => {
    it("Archive button calls archiveDraft for each selected draft and clears selection", async () => {
      setupDefaultMocks([
        makeRecord("local-ba01", "Team A"),
        makeRecord("local-ba02", "Team B"),
      ]);
      const user = userEvent.setup();
      render(<TeamsLandingClient />);

      await user.click(screen.getByRole("checkbox", { name: /select team a/i }));
      await user.click(screen.getByRole("checkbox", { name: /select team b/i }));

      expect(screen.getByTestId("bulk-action-bar")).toHaveAttribute("data-count", "2");

      await user.click(screen.getByRole("button", { name: /archive selected/i }));

      expect(mockArchiveDraft).toHaveBeenCalledWith("local-ba01", true);
      expect(mockArchiveDraft).toHaveBeenCalledWith("local-ba02", true);
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringMatching(/archived/i));

      // Selection cleared after archive
      expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 22. Bulk Move-to-folder — calls toggleDraftFolder for each selected (Milestone C)
  // ---------------------------------------------------------------------------

  describe("bulk move to folder", () => {
    it("Move to folder calls toggleDraftFolder for each selected draft", async () => {
      setupDefaultMocks([
        makeRecord("local-bm01", "Team C"),
        makeRecord("local-bm02", "Team D"),
      ]);
      const user = userEvent.setup();
      render(<TeamsLandingClient />);

      await user.click(screen.getByRole("checkbox", { name: /select team c/i }));
      await user.click(screen.getByRole("checkbox", { name: /select team d/i }));

      await user.click(screen.getByRole("button", { name: /move to folder/i }));

      expect(mockToggleDraftFolder).toHaveBeenCalledWith("local-bm01", "folder-1");
      expect(mockToggleDraftFolder).toHaveBeenCalledWith("local-bm02", "folder-1");

      // Selection cleared after move
      expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 23. Bulk Delete routes through undoable delete (Milestone C)
  // ---------------------------------------------------------------------------

  describe("bulk delete", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("Delete button removes rows immediately (pendingIds) and defers deleteDraft", async () => {
      setupDefaultMocks([
        makeRecord("local-bd01", "Team E"),
        makeRecord("local-bd02", "Team F"),
      ]);
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TeamsLandingClient />);

      await user.click(screen.getByRole("checkbox", { name: /select team e/i }));
      await user.click(screen.getByRole("checkbox", { name: /select team f/i }));

      await user.click(screen.getByRole("button", { name: /delete selected/i }));

      // Rows are gone immediately
      expect(screen.queryByTestId("team-row-local-bd01")).not.toBeInTheDocument();
      expect(screen.queryByTestId("team-row-local-bd02")).not.toBeInTheDocument();

      // deleteDraft not yet called (still in undo window)
      expect(mockDeleteDraft).not.toHaveBeenCalled();

      // After the undo window
      jest.runAllTimers();
      expect(mockDeleteDraft).toHaveBeenCalledWith("local-bd01");
      expect(mockDeleteDraft).toHaveBeenCalledWith("local-bd02");
    });
  });

  // ---------------------------------------------------------------------------
  // 24. Mobile FAB — only shown on mobile (Milestone C)
  // ---------------------------------------------------------------------------

  describe("mobile FAB", () => {
    it("renders a '+New' FAB on mobile", () => {
      mockUseIsClient.mockReturnValue(true);
      mockUseIsMobile.mockReturnValue(true);
      setupDefaultMocks([makeRecord("local-fab01")]);
      render(<TeamsLandingClient />);

      // The FAB has aria-label "New team" (lowercase t); the header button is "Create a new team"
      expect(screen.getByRole("button", { name: "New team" })).toBeInTheDocument();
    });

    it("does NOT render the FAB on desktop", () => {
      mockUseIsClient.mockReturnValue(true);
      mockUseIsMobile.mockReturnValue(false);
      setupDefaultMocks([makeRecord("local-fab02")]);
      render(<TeamsLandingClient />);

      // No button with exact label "New team" (the FAB) — only "Create a new team" (header)
      expect(screen.queryByRole("button", { name: "New team" })).not.toBeInTheDocument();
    });

    it("FAB creates a draft and navigates on click", async () => {
      mockUseIsClient.mockReturnValue(true);
      mockUseIsMobile.mockReturnValue(true);
      const returnedRecord = makeRecord("local-fab03");
      mockCreateDraft.mockReturnValue(returnedRecord);
      setupDefaultMocks([]);

      const user = userEvent.setup();
      render(<TeamsLandingClient />);

      // Use the FAB (aria-label "New team") — the empty-state also has a button but different label
      await user.click(screen.getByRole("button", { name: "New team" }));
      expect(mockCreateDraft).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/builder/t/local-fab03");
    });
  });
});
