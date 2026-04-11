import { describe, it, expect } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

const mockInvalidateQueries = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(() => ({
    invalidateQueries: mockInvalidateQueries,
  })),
}));

jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(() => ({})),
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
}));

jest.mock("@trainers/pokemon", () => ({
  exportTeamToShowdown: jest.fn(() => "Pikachu @ Life Orb\n..."),
}));

jest.mock("@trainers/validators", () => ({
  parseShowdownText: jest.fn(() => []),
}));

const mockForkTeamAction = jest.fn();
const mockAddPokemonToTeamAction = jest.fn();
jest.mock("@/actions/teams", () => ({
  forkTeamAction: (...args: unknown[]) => mockForkTeamAction(...args),
  addPokemonToTeamAction: (...args: unknown[]) =>
    mockAddPokemonToTeamAction(...args),
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

// Mock sonner toast to prevent DOM errors
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

import { WorkspaceActions } from "../workspace-actions";
import { type TeamWithPokemon } from "@trainers/supabase";

// =============================================================================
// Factories
// =============================================================================

function makeTeam(
  teamPokemon: TeamWithPokemon["team_pokemon"] = []
): TeamWithPokemon {
  return {
    id: 1,
    alt_id: 10,
    name: "Test Team",
    format: "gen9vgc2026regi",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    is_public: false,
    description: null,
    fork_source_id: null,
    team_pokemon: teamPokemon,
  } as TeamWithPokemon;
}

const defaultProps = {
  team: makeTeam(),
  altId: 10,
  handle: "ash_ketchum",
};

// =============================================================================
// Tests
// =============================================================================

describe("WorkspaceActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvalidateQueries.mockClear();
  });

  describe("button rendering", () => {
    it("renders the Import button", () => {
      render(<WorkspaceActions {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /import/i })
      ).toBeInTheDocument();
    });

    it("renders the Export button", () => {
      render(<WorkspaceActions {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /export/i })
      ).toBeInTheDocument();
    });

    it("renders the Fork button", () => {
      render(<WorkspaceActions {...defaultProps} />);
      expect(screen.getByRole("button", { name: /fork/i })).toBeInTheDocument();
    });

    it("does not render a Validate button", () => {
      render(<WorkspaceActions {...defaultProps} />);
      expect(
        screen.queryByRole("button", { name: /validate/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("import sheet", () => {
    it("opens the import sheet when Import is clicked", async () => {
      const user = userEvent.setup();
      render(<WorkspaceActions {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /import/i }));
      expect(
        screen.getByRole("heading", { name: "Import Pokémon" })
      ).toBeInTheDocument();
    });

    it("shows available slots count in the sheet description", async () => {
      const user = userEvent.setup();
      render(<WorkspaceActions {...defaultProps} team={makeTeam([])} />);
      await user.click(screen.getByRole("button", { name: /import/i }));
      expect(screen.getByText(/6 slots available/i)).toBeInTheDocument();
    });

    it("shows singular 'slot' when only 1 slot is available", async () => {
      const user = userEvent.setup();
      // Build a team with 5 pokemon entries (no real pokemon data needed)
      const fivePokemon = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        team_id: 1,
        pokemon_id: i + 1,
        team_position: i + 1,
        pokemon: null,
      })) as TeamWithPokemon["team_pokemon"];
      render(
        <WorkspaceActions {...defaultProps} team={makeTeam(fivePokemon)} />
      );
      await user.click(screen.getByRole("button", { name: /import/i }));
      expect(screen.getByText(/1 slot available/i)).toBeInTheDocument();
    });

    it("renders the Showdown paste textarea in the sheet", async () => {
      const user = userEvent.setup();
      render(<WorkspaceActions {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /import/i }));
      expect(screen.getByLabelText("Showdown Paste")).toBeInTheDocument();
    });

    it("shows Cancel button in the import sheet", async () => {
      const user = userEvent.setup();
      render(<WorkspaceActions {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /import/i }));
      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
    });
  });

  describe("fork", () => {
    it("calls forkTeamAction with teamId and altId when Fork is clicked", async () => {
      const user = userEvent.setup();
      mockForkTeamAction.mockResolvedValue({
        success: true,
        data: { id: 99 },
      });
      render(<WorkspaceActions {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /fork/i }));
      await waitFor(() => {
        expect(mockForkTeamAction).toHaveBeenCalledWith(1, 10);
      });
    });

    it("navigates to the forked team on success", async () => {
      const user = userEvent.setup();
      mockForkTeamAction.mockResolvedValue({
        success: true,
        data: { id: 99 },
      });
      render(<WorkspaceActions {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /fork/i }));
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          "/dashboard/alts/ash_ketchum/teams/99"
        );
      });
    });

    it("shows error toast when fork fails", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");
      mockForkTeamAction.mockResolvedValue({
        success: false,
        error: "Fork failed",
      });
      render(<WorkspaceActions {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /fork/i }));
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Fork failed");
      });
    });
  });
});
