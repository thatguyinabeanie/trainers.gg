import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

// Mock useLocalDrafts so we can control state
jest.mock("../../persistence/use-local-drafts", () => ({
  useLocalDrafts: jest.fn(),
}));

// Mock next/navigation — capture router.push calls
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock sonner toast
const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("sonner", () => ({ toast: mockToast }));

// Stub TeamRow to a simple accessible element — keeps tests focused on
// TeamsLandingClient logic rather than re-testing TeamRow internals.
jest.mock("../team-row", () => ({
  TeamRow: ({
    summary,
    onDelete,
  }: {
    summary: { id: string; name: string };
    onDelete?: (id: string) => void;
  }) => (
    <div data-testid={`team-row-${summary.id}`}>
      <span>{summary.name}</span>
      {onDelete && (
        <button
          onClick={() => onDelete(summary.id)}
          aria-label={`Delete ${summary.name}`}
        >
          Delete
        </button>
      )}
    </div>
  ),
}));

// Mock toDraftSummary to be a passthrough — our LocalDraftRecord fixtures
// already carry enough shape for the stub TeamRow (id + name).
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

// Mock Button — render a real <button> so userEvent.click works
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    "aria-label": ariaLabel,
    size: _size,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: string;
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
import { useLocalDrafts } from "../../persistence/use-local-drafts";

// =============================================================================
// Helpers
// =============================================================================

type MockUseLocalDrafts = jest.MockedFunction<typeof useLocalDrafts>;

function makeRecord(id: string, name = "Test Team") {
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
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("TeamsLandingClient", () => {
  const mockCreateDraft = jest.fn();
  const mockDeleteDraft = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Renders a TeamRow per draft
  // ---------------------------------------------------------------------------

  describe("draft list", () => {
    it("renders one TeamRow for each draft, showing draft names", () => {
      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [makeRecord("local-aa01", "Rain Team"), makeRecord("local-aa02", "Trick Room")],
        hydrated: true,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });

      render(<TeamsLandingClient />);

      expect(screen.getByTestId("team-row-local-aa01")).toBeInTheDocument();
      expect(screen.getByTestId("team-row-local-aa02")).toBeInTheDocument();
      expect(screen.getByText("Rain Team")).toBeInTheDocument();
      expect(screen.getByText("Trick Room")).toBeInTheDocument();
    });

    it("renders exactly as many rows as there are drafts", () => {
      const drafts = [
        makeRecord("local-bb01", "A"),
        makeRecord("local-bb02", "B"),
        makeRecord("local-bb03", "C"),
      ];
      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts,
        hydrated: true,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });

      render(<TeamsLandingClient />);

      expect(screen.getAllByTestId(/^team-row-/)).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. New Team button calls createDraft and navigates
  // ---------------------------------------------------------------------------

  describe("New Team button", () => {
    it("calls createDraft and router.push(draftEditorHref(id)) when clicked (header button)", async () => {
      const returnedRecord = makeRecord("local-new01", "New Draft");
      mockCreateDraft.mockReturnValue(returnedRecord);

      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [],
        hydrated: true,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });

      const user = userEvent.setup();
      render(<TeamsLandingClient />);

      // The header New Team button is always present (separate from empty state)
      const newTeamBtn = screen.getByRole("button", { name: /create a new team/i });
      await user.click(newTeamBtn);

      expect(mockCreateDraft).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/builder/t/local-new01");
    });

    it("is also available from empty state and works the same way", async () => {
      const returnedRecord = makeRecord("local-new02", "Empty State Draft");
      mockCreateDraft.mockReturnValue(returnedRecord);

      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [],
        hydrated: true,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });

      const user = userEvent.setup();
      render(<TeamsLandingClient />);

      const emptyStateBtn = screen.getByRole("button", {
        name: /create your first team/i,
      });
      await user.click(emptyStateBtn);

      expect(mockCreateDraft).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/builder/t/local-new02");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Empty state
  // ---------------------------------------------------------------------------

  describe("empty state", () => {
    it("shows empty state message when drafts is empty and hydrated is true", () => {
      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [],
        hydrated: true,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });

      render(<TeamsLandingClient />);

      expect(
        screen.getByText(/no teams yet.*start building/i)
      ).toBeInTheDocument();
    });

    it("does NOT show the empty state when there are drafts", () => {
      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [makeRecord("local-cc01", "Existing Team")],
        hydrated: true,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });

      render(<TeamsLandingClient />);

      expect(screen.queryByText(/no teams yet/i)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Loading skeleton
  // ---------------------------------------------------------------------------

  describe("loading skeleton", () => {
    it("shows skeleton (aria-hidden) when hydrated is false", () => {
      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [],
        hydrated: false,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });

      render(<TeamsLandingClient />);

      // Skeleton wrapper should be aria-hidden
      const skeleton = document.querySelector("[aria-hidden]");
      expect(skeleton).toBeInTheDocument();
    });

    it("does not show skeleton or empty state when hydrated is false", () => {
      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [],
        hydrated: false,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });

      render(<TeamsLandingClient />);

      expect(screen.queryByText(/no teams yet/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId(/^team-row-/)).not.toBeInTheDocument();
    });

    it("removes skeleton and shows list once hydrated", () => {
      // First render with hydrated: false
      const { rerender } = render(<div />);

      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [],
        hydrated: false,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });
      rerender(<TeamsLandingClient />);
      expect(screen.queryByText(/no teams yet/i)).not.toBeInTheDocument();

      // Re-render with hydrated: true
      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [],
        hydrated: true,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });
      rerender(<TeamsLandingClient />);
      expect(screen.getByText(/no teams yet/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Delete calls deleteDraft with id and fires toast
  // ---------------------------------------------------------------------------

  describe("delete interaction", () => {
    it("calls deleteDraft with the draft id when Delete is triggered from a row", async () => {
      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [makeRecord("local-del01", "Delete Me")],
        hydrated: true,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });

      const user = userEvent.setup();
      render(<TeamsLandingClient />);

      await user.click(screen.getByRole("button", { name: "Delete Delete Me" }));

      expect(mockDeleteDraft).toHaveBeenCalledTimes(1);
      expect(mockDeleteDraft).toHaveBeenCalledWith("local-del01");
    });

    it("fires toast.success('Team deleted') when a draft is deleted", async () => {
      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [makeRecord("local-del02", "Bye Team")],
        hydrated: true,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });

      const user = userEvent.setup();
      render(<TeamsLandingClient />);

      await user.click(screen.getByRole("button", { name: "Delete Bye Team" }));

      expect(mockToast.success).toHaveBeenCalledWith("Team deleted");
    });

    it("handles multiple rows — deletes only the targeted draft", async () => {
      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [
          makeRecord("local-multi01", "First Team"),
          makeRecord("local-multi02", "Second Team"),
        ],
        hydrated: true,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });

      const user = userEvent.setup();
      render(<TeamsLandingClient />);

      await user.click(
        screen.getByRole("button", { name: "Delete Second Team" })
      );

      expect(mockDeleteDraft).toHaveBeenCalledWith("local-multi02");
      expect(mockDeleteDraft).not.toHaveBeenCalledWith("local-multi01");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Page header always renders
  // ---------------------------------------------------------------------------

  describe("page header", () => {
    it("always shows the 'Your Teams' heading", () => {
      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [],
        hydrated: true,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });

      render(<TeamsLandingClient />);
      expect(screen.getByRole("heading", { name: /your teams/i })).toBeInTheDocument();
    });

    it("always shows the header New Team button regardless of draft count", () => {
      (useLocalDrafts as MockUseLocalDrafts).mockReturnValue({
        drafts: [makeRecord("local-hdr01", "Some Team")],
        hydrated: true,
        createDraft: mockCreateDraft,
        deleteDraft: mockDeleteDraft,
      });

      render(<TeamsLandingClient />);
      expect(
        screen.getByRole("button", { name: /create a new team/i })
      ).toBeInTheDocument();
    });
  });
});
