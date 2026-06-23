/**
 * Tests for LocalBuilderWorkspace.
 * Verifies: hydration loading state, rendering after hydration,
 * saving overlay, delegating to TeamWorkspaceV2, handleSaveToAccount,
 * and missing-draft redirect.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";

// =============================================================================
// Mocks
// =============================================================================

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, refresh: mockRefresh }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@trainers/pokemon", () => ({
  getFormatById: jest.fn((id: string) =>
    id ? { id, label: "VGC 2026 Reg I" } : undefined
  ),
}));

// Mock Supabase queries
jest.mock("@trainers/supabase", () => ({
  getAltsByUserId: jest.fn().mockResolvedValue([]),
  getTeamsForUser: jest.fn().mockResolvedValue([]),
  getTeamWithPokemon: jest.fn().mockResolvedValue(null),
}));

// Mock auth context
const mockAuthContext: {
  isAuthenticated: boolean;
  loading: boolean;
  user: { id: string } | null;
} = {
  isAuthenticated: false,
  loading: false,
  user: null,
};
jest.mock("@/components/auth/auth-provider", () => ({
  useAuthContext: () => mockAuthContext,
}));

// Mock Supabase client
jest.mock("@/lib/supabase", () => ({
  useSupabase: () => ({}),
}));

// Mock teams API
jest.mock("@/lib/api/teams-client", () => ({
  teamsApi: {
    saveLocal: jest.fn().mockResolvedValue({
      success: true,
      data: { redirectUrl: "/dashboard/teams/1" },
    }),
  },
}));

// Mock BuilderNav
jest.mock("@/components/builder-nav", () => ({
  BuilderNav: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="builder-nav">{children}</div>
  ),
}));

// Mock BuilderTopbar — capture onSaveToAccount for testing
let capturedOnSaveToAccount: (() => Promise<void>) | undefined;
jest.mock("../builder-topbar", () => ({
  BuilderTopbar: (props: { onSaveToAccount?: () => Promise<void> }) => {
    capturedOnSaveToAccount = props.onSaveToAccount;
    return <div data-testid="builder-topbar">Builder Topbar</div>;
  },
}));

// Mock PersistenceProvider
jest.mock("../persistence/context", () => ({
  PersistenceProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="persistence-provider">{children}</div>
  ),
}));

// Mock createLocalPersistence
jest.mock("../persistence/local-persistence", () => ({
  createLocalPersistence: jest.fn(() => ({
    mode: "local",
    addPokemon: jest.fn(),
    updatePokemon: jest.fn(),
    removePokemon: jest.fn(),
    reorderPokemon: jest.fn(),
    updateTeam: jest.fn(),
    onMutationSuccess: jest.fn(),
  })),
}));

// Mock useLocalDraft — default to hydrated + existing draft
const mockSetTeam = jest.fn();
let mockHydrated = true;
let mockExists = true;
jest.mock("../persistence/use-local-drafts", () => ({
  useLocalDraft: () => ({
    team: {
      id: -1,
      name: "Untitled Team",
      format: "gen9vgc2026regi",
      format_legal: null,
      description: null,
      notes: null,
      tags: null,
      is_public: null,
      parent_team_id: null,
      created_by: -1,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      team_pokemon: [],
    },
    setTeam: mockSetTeam,
    hydrated: mockHydrated,
    exists: mockExists,
  }),
}));

// Mock deleteLocalDraft
jest.mock("../persistence/local-drafts-store", () => ({
  deleteLocalDraft: jest.fn().mockReturnValue(true),
}));

// Mock TeamWorkspaceV2
jest.mock("../team-workspace", () => ({
  TeamWorkspaceV2: ({
    renderHeader,
  }: {
    renderHeader?: (actions: unknown) => React.ReactNode;
  }) => (
    <div data-testid="team-workspace">
      {renderHeader?.({
        onOpenImport: jest.fn(),
        validationErrors: [],
        onJumpToPokemon: jest.fn(),
        onValidate: jest.fn(),
        onNameChange: jest.fn(),
      })}
      Workspace Content
    </div>
  ),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { LocalBuilderWorkspace } from "../local-builder-workspace";

// =============================================================================
// Tests
// =============================================================================

const TEST_DRAFT_ID = "local-test";

describe("LocalBuilderWorkspace — loading state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading text when not yet hydrated", () => {
    mockHydrated = false;
    mockExists = true;
    render(<LocalBuilderWorkspace draftId={TEST_DRAFT_ID} />);
    expect(screen.getByText("Loading builder...")).toBeInTheDocument();
    mockHydrated = true;
  });
});

describe("LocalBuilderWorkspace — hydrated render", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrated = true;
    mockExists = true;
  });

  it("renders TeamWorkspaceV2 after hydration", () => {
    render(<LocalBuilderWorkspace draftId={TEST_DRAFT_ID} />);
    expect(screen.getByTestId("team-workspace")).toBeInTheDocument();
    expect(screen.getByText("Workspace Content")).toBeInTheDocument();
  });

  it("wraps in PersistenceProvider", () => {
    render(<LocalBuilderWorkspace draftId={TEST_DRAFT_ID} />);
    expect(screen.getByTestId("persistence-provider")).toBeInTheDocument();
  });

  it("renders BuilderTopbar via renderHeader", () => {
    render(<LocalBuilderWorkspace draftId={TEST_DRAFT_ID} />);
    expect(screen.getByTestId("builder-topbar")).toBeInTheDocument();
  });

  it("renders BuilderNav in the header", () => {
    render(<LocalBuilderWorkspace draftId={TEST_DRAFT_ID} />);
    expect(screen.getByTestId("builder-nav")).toBeInTheDocument();
  });
});

describe("LocalBuilderWorkspace — unauthenticated", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrated = true;
    mockExists = true;
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.loading = false;
    mockAuthContext.user = null;
  });

  it("does not show saving overlay when unauthenticated", () => {
    render(<LocalBuilderWorkspace draftId={TEST_DRAFT_ID} />);
    expect(
      screen.queryByText("Saving your team to your account...")
    ).not.toBeInTheDocument();
  });
});

// =============================================================================
// Missing-draft redirect
// =============================================================================

describe("LocalBuilderWorkspace — missing draft redirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockHydrated = true;
    mockExists = true;
  });

  it("shows loading skeleton and calls router.replace when draft does not exist after hydration", async () => {
    mockHydrated = true;
    mockExists = false;

    render(<LocalBuilderWorkspace draftId={TEST_DRAFT_ID} />);

    // Should not render the workspace
    expect(screen.queryByTestId("team-workspace")).not.toBeInTheDocument();
    // Should show the loading skeleton while redirecting
    expect(screen.getByText("Loading builder...")).toBeInTheDocument();

    // router.replace should be called with /builder
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/builder");
    });
  });

  it("does not call router.replace when draft exists", async () => {
    mockHydrated = true;
    mockExists = true;

    render(<LocalBuilderWorkspace draftId={TEST_DRAFT_ID} />);

    await act(async () => {});

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not call router.replace before hydration completes", async () => {
    mockHydrated = false;
    mockExists = false;

    render(<LocalBuilderWorkspace draftId={TEST_DRAFT_ID} />);

    await act(async () => {});

    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// =============================================================================
// handleSaveToAccount tests
// =============================================================================

describe("LocalBuilderWorkspace — handleSaveToAccount", () => {
  const { toast } = jest.requireMock("sonner") as {
    toast: { success: jest.Mock; error: jest.Mock };
  };
  const { teamsApi } = jest.requireMock("@/lib/api/teams-client") as {
    teamsApi: { saveLocal: jest.Mock };
  };
  const { getAltsByUserId, getTeamsForUser } = jest.requireMock(
    "@trainers/supabase"
  ) as {
    getAltsByUserId: jest.Mock;
    getTeamsForUser: jest.Mock;
  };
  const { deleteLocalDraft } = jest.requireMock(
    "../persistence/local-drafts-store"
  ) as { deleteLocalDraft: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrated = true;
    mockExists = true;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.loading = false;
    mockAuthContext.user = { id: "user-123" };
    capturedOnSaveToAccount = undefined;

    // Default mocks for the useEffect fetch
    getAltsByUserId.mockResolvedValue([]);
    getTeamsForUser.mockResolvedValue([]);
  });

  afterEach(() => {
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.user = null;
  });

  it("happy path: saves team, deletes local draft, shows toast, and redirects", async () => {
    getAltsByUserId.mockResolvedValue([{ id: 42, name: "TestAlt" }]);
    teamsApi.saveLocal.mockResolvedValue({
      success: true,
      data: { redirectUrl: "/dashboard/teams/99" },
    });

    render(<LocalBuilderWorkspace draftId={TEST_DRAFT_ID} />);

    // Wait for the full useEffect to settle (both API calls + re-render)
    await waitFor(() => {
      expect(getTeamsForUser).toHaveBeenCalled();
    });

    // Flush pending state updates so capturedOnSaveToAccount has current closure
    await act(async () => {});

    expect(capturedOnSaveToAccount).toBeDefined();

    act(() => {
      capturedOnSaveToAccount!();
    });

    // Wait for the save to complete and success toast to appear
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Team saved to your account!");
    });

    expect(teamsApi.saveLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        altId: 42,
        name: "Untitled Team",
        format: "gen9vgc2026regi",
      })
    );
    // Should delete THIS draft (by draftId), not clear a global storage key
    expect(deleteLocalDraft).toHaveBeenCalledWith(TEST_DRAFT_ID);
    expect(mockPush).toHaveBeenCalledWith("/dashboard/teams/99");
  });

  it("shows error toast on API failure without redirecting or deleting draft", async () => {
    getAltsByUserId.mockResolvedValue([{ id: 42, name: "TestAlt" }]);
    teamsApi.saveLocal.mockResolvedValue({
      success: false,
      error: "Server error",
    });

    render(<LocalBuilderWorkspace draftId={TEST_DRAFT_ID} />);

    // Wait for the full useEffect to settle
    await waitFor(() => {
      expect(getTeamsForUser).toHaveBeenCalled();
    });

    await act(async () => {});

    expect(capturedOnSaveToAccount).toBeDefined();

    act(() => {
      capturedOnSaveToAccount!();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Server error");
    });

    expect(deleteLocalDraft).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows error toast when no alts are found", async () => {
    // getAltsByUserId returns [] (default from beforeEach)
    render(<LocalBuilderWorkspace draftId={TEST_DRAFT_ID} />);

    // Wait for the full useEffect to settle
    await waitFor(() => {
      expect(getTeamsForUser).toHaveBeenCalled();
    });

    await act(async () => {});

    expect(capturedOnSaveToAccount).toBeDefined();

    act(() => {
      capturedOnSaveToAccount!();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "No profile found. Please complete your profile setup first."
      );
    });

    expect(teamsApi.saveLocal).not.toHaveBeenCalled();
    expect(deleteLocalDraft).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
