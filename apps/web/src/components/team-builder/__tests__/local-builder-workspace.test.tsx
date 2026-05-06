"use client";

/**
 * Tests for LocalBuilderWorkspace.
 * Verifies: hydration loading state, rendering after hydration,
 * saving overlay, and delegating to TeamWorkspaceV2.
 */

import { render, screen } from "@testing-library/react";
import React from "react";

// =============================================================================
// Mocks
// =============================================================================

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
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
const mockAuthContext = {
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

// Mock BuilderTopbar
jest.mock("../builder-topbar", () => ({
  BuilderTopbar: () => <div data-testid="builder-topbar">Builder Topbar</div>,
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

// Mock useLocalTeamStorage — default to hydrated
const mockSetTeam = jest.fn();
let mockHydrated = true;
jest.mock("../persistence/use-local-team-storage", () => ({
  useLocalTeamStorage: () => ({
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
  }),
  clearLocalTeamStorage: jest.fn(),
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

describe("LocalBuilderWorkspace — loading state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading text when not yet hydrated", () => {
    mockHydrated = false;
    render(<LocalBuilderWorkspace />);
    expect(screen.getByText("Loading builder...")).toBeInTheDocument();
    mockHydrated = true;
  });
});

describe("LocalBuilderWorkspace — hydrated render", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrated = true;
  });

  it("renders TeamWorkspaceV2 after hydration", () => {
    render(<LocalBuilderWorkspace />);
    expect(screen.getByTestId("team-workspace")).toBeInTheDocument();
    expect(screen.getByText("Workspace Content")).toBeInTheDocument();
  });

  it("wraps in PersistenceProvider", () => {
    render(<LocalBuilderWorkspace />);
    expect(screen.getByTestId("persistence-provider")).toBeInTheDocument();
  });

  it("renders BuilderTopbar via renderHeader", () => {
    render(<LocalBuilderWorkspace />);
    expect(screen.getByTestId("builder-topbar")).toBeInTheDocument();
  });

  it("renders BuilderNav in the header", () => {
    render(<LocalBuilderWorkspace />);
    expect(screen.getByTestId("builder-nav")).toBeInTheDocument();
  });
});

describe("LocalBuilderWorkspace — unauthenticated", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrated = true;
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.loading = false;
    mockAuthContext.user = null;
  });

  it("does not show saving overlay when unauthenticated", () => {
    render(<LocalBuilderWorkspace />);
    expect(
      screen.queryByText("Saving your team to your account...")
    ).not.toBeInTheDocument();
  });
});
