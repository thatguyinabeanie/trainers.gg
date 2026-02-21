/**
 * Tests for TournamentSettings component
 * Covers active tournament locking, lockedPhaseIds computation, draft vs active states
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TournamentSettings } from "../tournament-settings";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
}));

const mockUpdateTournamentMutateAsync = jest.fn();
const mockDeleteTournamentMutateAsync = jest.fn();

jest.mock("@/lib/supabase", () => ({
  useSupabaseMutation: jest.fn((fn: unknown) => {
    // Distinguish between updateTournament and deleteTournament based on call order
    // The component creates two mutations — the first is update, the second is delete
    const fnStr = String(fn);
    if (fnStr.includes("delete") || fnStr.includes("Delete")) {
      return { mutateAsync: mockDeleteTournamentMutateAsync };
    }
    return { mutateAsync: mockUpdateTournamentMutateAsync };
  }),
}));

jest.mock("@/actions/tournaments", () => ({
  saveTournamentPhasesAction: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock child shared components to avoid testing their internals
jest.mock("../../shared", () => ({
  TournamentPhasesEditor: ({
    disabled,
    lockedPhaseIds,
    canAddRemove,
    phases,
  }: {
    disabled: boolean;
    lockedPhaseIds?: Set<string>;
    canAddRemove: boolean;
    phases: Array<{ id: string; name: string }>;
  }) => (
    <div data-testid="phases-editor">
      <span data-testid="phases-editor-disabled">{String(disabled)}</span>
      <span data-testid="phases-editor-can-add-remove">
        {String(canAddRemove)}
      </span>
      <span data-testid="phases-editor-locked-ids">
        {lockedPhaseIds ? Array.from(lockedPhaseIds).join(",") : "none"}
      </span>
      <span data-testid="phases-editor-count">{phases.length}</span>
    </div>
  ),
  TournamentGameSettings: ({ disabled }: { disabled: boolean }) => (
    <div data-testid="game-settings">
      <span data-testid="game-settings-disabled">{String(disabled)}</span>
    </div>
  ),
  TournamentPresetSelector: ({ disabled }: { disabled: boolean }) => (
    <div data-testid="preset-selector">
      <span data-testid="preset-selector-disabled">{String(disabled)}</span>
    </div>
  ),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

interface Phase {
  id: number;
  tournament_id: number;
  name: string;
  phase_order: number;
  phase_type: string;
  best_of: number | null;
  round_time_minutes: number | null;
  check_in_time_minutes: number | null;
  cut_rule: string | null;
  planned_rounds: number | null;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  current_round: number | null;
}

function buildTournament(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Test Tournament",
    slug: "test-tournament",
    description: "A test tournament",
    status: "draft",
    game: "sv",
    game_format: "reg-i",
    platform: "cartridge",
    battle_format: "doubles",
    max_participants: 32,
    start_date: null,
    end_date: null,
    round_time_minutes: 50,
    registration_type: "open",
    check_in_required: false,
    allow_late_registration: false,
    late_check_in_max_round: null,
    ...overrides,
  };
}

function buildPhase(overrides: Partial<Phase> = {}): Phase {
  return {
    id: 1,
    tournament_id: 1,
    name: "Swiss Rounds",
    phase_order: 1,
    phase_type: "swiss",
    best_of: 3,
    round_time_minutes: 50,
    check_in_time_minutes: 5,
    cut_rule: null,
    planned_rounds: null,
    status: "pending",
    started_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    current_round: null,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("TournamentSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window.confirm for delete tests
    window.confirm = jest.fn(() => true);
  });

  describe("status-dependent UI", () => {
    it.each([
      { status: "draft", canEdit: true, label: "draft" },
      { status: "upcoming", canEdit: true, label: "upcoming" },
      { status: "active", canEdit: true, label: "active" },
      { status: "completed", canEdit: false, label: "completed" },
      { status: "cancelled", canEdit: false, label: "cancelled" },
    ])(
      'Edit Settings button is ${ canEdit ? "enabled" : "disabled" } for $label tournaments',
      ({ status, canEdit }) => {
        render(<TournamentSettings tournament={buildTournament({ status })} />);

        const editButton = screen.getByRole("button", {
          name: /edit settings/i,
        });

        if (canEdit) {
          expect(editButton).not.toBeDisabled();
        } else {
          expect(editButton).toBeDisabled();
        }
      }
    );

    it("shows active tournament alert when status is active", () => {
      render(
        <TournamentSettings
          tournament={buildTournament({ status: "active" })}
        />
      );

      expect(
        screen.getByText(/this tournament is active/i)
      ).toBeInTheDocument();
    });

    it("does not show active alert for draft tournaments", () => {
      render(
        <TournamentSettings tournament={buildTournament({ status: "draft" })} />
      );

      expect(
        screen.queryByText(/this tournament is active/i)
      ).not.toBeInTheDocument();
    });

    it("shows finished tournament alert when completed", () => {
      render(
        <TournamentSettings
          tournament={buildTournament({ status: "completed" })}
        />
      );

      expect(
        screen.getByText(/cannot be edited after the tournament has finished/i)
      ).toBeInTheDocument();
    });
  });

  describe("danger zone / delete button", () => {
    it("shows delete button for draft tournaments", () => {
      render(
        <TournamentSettings tournament={buildTournament({ status: "draft" })} />
      );

      expect(
        screen.getByRole("button", { name: /delete tournament/i })
      ).toBeInTheDocument();
    });

    it.each(["upcoming", "active", "completed", "cancelled"])(
      "hides delete button for %s tournaments",
      (status) => {
        render(<TournamentSettings tournament={buildTournament({ status })} />);

        expect(
          screen.queryByRole("button", { name: /delete tournament/i })
        ).not.toBeInTheDocument();
      }
    );
  });

  describe("edit mode", () => {
    it("shows Cancel and Save buttons when editing", async () => {
      const user = userEvent.setup();
      render(
        <TournamentSettings tournament={buildTournament({ status: "draft" })} />
      );

      await user.click(screen.getByRole("button", { name: /edit settings/i }));

      expect(
        screen.getByRole("button", { name: /cancel/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /save changes/i })
      ).toBeInTheDocument();
    });

    it("resets form data when cancel is clicked", async () => {
      const user = userEvent.setup();
      render(
        <TournamentSettings
          tournament={buildTournament({
            status: "draft",
            name: "Original Name",
          })}
        />
      );

      // Enter edit mode
      await user.click(screen.getByRole("button", { name: /edit settings/i }));

      // Change the name
      const nameInput = screen.getByLabelText("Tournament Name");
      await user.clear(nameInput);
      await user.type(nameInput, "New Name");
      expect(nameInput).toHaveValue("New Name");

      // Click cancel
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Should be back to read mode with original name visible
      expect(
        screen.getByRole("button", { name: /edit settings/i })
      ).toBeInTheDocument();
    });
  });

  describe("locked sections for active tournaments", () => {
    it("disables name and description inputs for active tournaments in edit mode", async () => {
      const user = userEvent.setup();
      render(
        <TournamentSettings
          tournament={buildTournament({ status: "active" })}
        />
      );

      await user.click(screen.getByRole("button", { name: /edit settings/i }));

      // Basic info should be locked
      expect(screen.getByLabelText("Tournament Name")).toBeDisabled();
      expect(screen.getByLabelText("Description")).toBeDisabled();
    });

    it("disables game settings for active tournaments", async () => {
      const user = userEvent.setup();
      render(
        <TournamentSettings
          tournament={buildTournament({ status: "active" })}
        />
      );

      await user.click(screen.getByRole("button", { name: /edit settings/i }));

      expect(screen.getByTestId("game-settings-disabled")).toHaveTextContent(
        "true"
      );
    });

    it("enables name and description inputs for draft tournaments in edit mode", async () => {
      const user = userEvent.setup();
      render(
        <TournamentSettings tournament={buildTournament({ status: "draft" })} />
      );

      await user.click(screen.getByRole("button", { name: /edit settings/i }));

      expect(screen.getByLabelText("Tournament Name")).not.toBeDisabled();
      expect(screen.getByLabelText("Description")).not.toBeDisabled();
    });

    it("enables game settings for draft tournaments", async () => {
      const user = userEvent.setup();
      render(
        <TournamentSettings tournament={buildTournament({ status: "draft" })} />
      );

      await user.click(screen.getByRole("button", { name: /edit settings/i }));

      expect(screen.getByTestId("game-settings-disabled")).toHaveTextContent(
        "false"
      );
    });
  });

  describe("lockedPhaseIds computation", () => {
    it("passes locked phase IDs for active/completed phases when editing", async () => {
      const user = userEvent.setup();
      const phases = [
        buildPhase({
          id: 1,
          name: "Swiss Rounds",
          status: "active",
          started_at: new Date().toISOString(),
        }),
        buildPhase({
          id: 2,
          name: "Top Cut",
          phase_order: 2,
          phase_type: "single_elimination",
          status: "pending",
        }),
      ];

      render(
        <TournamentSettings
          tournament={buildTournament({ status: "active" })}
          phases={phases}
        />
      );

      await user.click(screen.getByRole("button", { name: /edit settings/i }));

      // The active phase (db-1) should be in lockedPhaseIds
      const lockedIds = screen.getByTestId("phases-editor-locked-ids");
      expect(lockedIds.textContent).toContain("db-1");
      // Pending phase should NOT be locked
      expect(lockedIds.textContent).not.toContain("db-2");
    });

    it("passes no locked phase IDs when not editing", () => {
      const phases = [
        buildPhase({ id: 1, status: "active" }),
        buildPhase({ id: 2, status: "pending" }),
      ];

      render(
        <TournamentSettings
          tournament={buildTournament({ status: "active" })}
          phases={phases}
        />
      );

      // When not editing, lockedPhaseIds is undefined → "none"
      expect(screen.getByTestId("phases-editor-locked-ids")).toHaveTextContent(
        "none"
      );
    });

    it("locks completed phases too", async () => {
      const user = userEvent.setup();
      const phases = [
        buildPhase({
          id: 1,
          name: "Swiss",
          status: "completed",
          completed_at: new Date().toISOString(),
        }),
        buildPhase({
          id: 2,
          name: "Top Cut",
          phase_order: 2,
          phase_type: "single_elimination",
          status: "active",
          started_at: new Date().toISOString(),
        }),
      ];

      render(
        <TournamentSettings
          tournament={buildTournament({ status: "active" })}
          phases={phases}
        />
      );

      await user.click(screen.getByRole("button", { name: /edit settings/i }));

      const lockedIds = screen.getByTestId("phases-editor-locked-ids");
      // Both should be locked
      expect(lockedIds.textContent).toContain("db-1");
      expect(lockedIds.textContent).toContain("db-2");
    });
  });

  describe("phases editor integration", () => {
    it("disables phases editor when not in edit mode", () => {
      render(
        <TournamentSettings tournament={buildTournament({ status: "draft" })} />
      );

      expect(screen.getByTestId("phases-editor-disabled")).toHaveTextContent(
        "true"
      );
    });

    it("enables phases editor when in edit mode", async () => {
      const user = userEvent.setup();
      render(
        <TournamentSettings tournament={buildTournament({ status: "draft" })} />
      );

      await user.click(screen.getByRole("button", { name: /edit settings/i }));

      expect(screen.getByTestId("phases-editor-disabled")).toHaveTextContent(
        "false"
      );
    });

    it("allows add/remove phases in edit mode for active tournaments", async () => {
      const user = userEvent.setup();
      render(
        <TournamentSettings
          tournament={buildTournament({ status: "active" })}
        />
      );

      await user.click(screen.getByRole("button", { name: /edit settings/i }));

      expect(
        screen.getByTestId("phases-editor-can-add-remove")
      ).toHaveTextContent("true");
    });

    it("disallows add/remove phases when not editing", () => {
      render(
        <TournamentSettings tournament={buildTournament({ status: "draft" })} />
      );

      expect(
        screen.getByTestId("phases-editor-can-add-remove")
      ).toHaveTextContent("false");
    });
  });

  describe("registration settings", () => {
    it("renders registration section", () => {
      render(
        <TournamentSettings tournament={buildTournament({ status: "draft" })} />
      );

      expect(screen.getByText("Registration")).toBeInTheDocument();
      expect(screen.getByText("Open Registration")).toBeInTheDocument();
    });

    it("shows player cap switch", () => {
      render(
        <TournamentSettings
          tournament={buildTournament({ max_participants: 32 })}
        />
      );

      expect(screen.getByText("Player Cap")).toBeInTheDocument();
    });

    it("renders check-in toggle", () => {
      render(
        <TournamentSettings tournament={buildTournament({ status: "draft" })} />
      );

      expect(screen.getByText("Check-in Required")).toBeInTheDocument();
    });

    it("renders late registration toggle", () => {
      render(
        <TournamentSettings tournament={buildTournament({ status: "draft" })} />
      );

      expect(screen.getByText("Late Registration")).toBeInTheDocument();
    });
  });
});
