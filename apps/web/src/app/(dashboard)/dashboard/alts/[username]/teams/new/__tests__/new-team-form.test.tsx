import { describe, it, expect } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { type ParsedPokemon } from "@trainers/validators";

// =============================================================================
// Module-level mocks
// =============================================================================

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    back: mockBack,
  })),
}));

const mockCreateTeamAction = jest.fn();
const mockAddPokemonToTeamAction = jest.fn();
jest.mock("@/actions/teams", () => ({
  createTeamAction: (...args: unknown[]) => mockCreateTeamAction(...args),
  addPokemonToTeamAction: (...args: unknown[]) =>
    mockAddPokemonToTeamAction(...args),
}));

const mockParseShowdownText = jest.fn(() => [] as ParsedPokemon[]);
jest.mock("@trainers/validators", () => ({
  parseShowdownText: (...args: unknown[]) => mockParseShowdownText(...args),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

const mockInvalidateQueries = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(() => ({
    invalidateQueries: mockInvalidateQueries,
  })),
}));

jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(() => ({})),
}));

// Legality functions are called by submitNewTeam during import. Without this
// mock, the real @pkmn/sim validator runs against ~800 moves per species,
// causing 20s+ test timeouts. Permissive defaults let the import flow proceed.
const MOCK_LEGALITY_UNAVAILABLE: unique symbol = Symbol("legality-unavailable");
jest.mock("@trainers/pokemon", () => ({
  getLegalSpecies: jest.fn(() => undefined),
  getLegalItems: jest.fn(() => undefined),
  getLegalMoves: jest.fn(() => undefined),
  getLegalTeraTypes: jest.fn(() => undefined),
  isLegalAbility: jest.fn(() => true),
  LEGALITY_UNAVAILABLE: MOCK_LEGALITY_UNAVAILABLE,
}));

import { NewTeamForm } from "../new-team-form";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Test data
// =============================================================================

const activeFormats: GameFormat[] = [
  { id: "gen9vgc2026regi", label: "SV: Reg I", generation: 9 },
  { id: "gen9vgc2026regig", label: "SV: Reg IG", generation: 9 },
];

const defaultProps = {
  altId: 10,
  handle: "ash_ketchum",
  activeFormats,
  defaultFormat: "gen9vgc2026regi",
  initialMode: "empty" as const,
};

// =============================================================================
// Tests
// =============================================================================

describe("NewTeamForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the team name input", () => {
      render(<NewTeamForm {...defaultProps} />);
      expect(screen.getByLabelText("Team Name")).toBeInTheDocument();
    });

    it("renders format selector pills", () => {
      render(<NewTeamForm {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "SV: Reg I" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "SV: Reg IG" })
      ).toBeInTheDocument();
    });

    it("renders Empty team and Import paste mode buttons", () => {
      render(<NewTeamForm {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Empty team" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Import paste" })
      ).toBeInTheDocument();
    });

    it("renders Create Team submit button in empty mode", () => {
      render(<NewTeamForm {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Create Team" })
      ).toBeInTheDocument();
    });

    it("renders Cancel button", () => {
      render(<NewTeamForm {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
    });

    it("does not render Showdown paste textarea in empty mode", () => {
      render(<NewTeamForm {...defaultProps} />);
      expect(screen.queryByLabelText("Showdown Paste")).not.toBeInTheDocument();
    });

    it("shows 'No active formats available' when formats list is empty", () => {
      render(<NewTeamForm {...defaultProps} activeFormats={[]} />);
      expect(
        screen.getByText("No active formats available.")
      ).toBeInTheDocument();
    });
  });

  describe("import mode", () => {
    it("shows paste textarea when import mode is selected", async () => {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: "Import paste" }));
      expect(screen.getByLabelText("Showdown Paste")).toBeInTheDocument();
    });

    it("renders as import mode from initialMode prop", () => {
      render(<NewTeamForm {...defaultProps} initialMode="import" />);
      expect(screen.getByLabelText("Showdown Paste")).toBeInTheDocument();
    });

    it("shows 'Import & Create Team' button label in import mode", async () => {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: "Import paste" }));
      expect(
        screen.getByRole("button", { name: "Import & Create Team" })
      ).toBeInTheDocument();
    });

    it("hides paste textarea when switching back to empty mode", async () => {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} initialMode="import" />);
      await user.click(screen.getByRole("button", { name: "Empty team" }));
      expect(screen.queryByLabelText("Showdown Paste")).not.toBeInTheDocument();
    });
  });

  describe("format selection", () => {
    it("selects a different format when pill is clicked", async () => {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} />);
      const regIGButton = screen.getByRole("button", { name: "SV: Reg IG" });
      await user.click(regIGButton);
      // The selected button gets primary background
      expect(regIGButton.className).toContain("bg-primary");
    });
  });

  describe("form validation", () => {
    it("prevents form submission when team name is empty (required field)", async () => {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: "Create Team" }));
      // The <input required> attribute prevents form submission in the browser,
      // so createTeamAction should never be called.
      expect(mockCreateTeamAction).not.toHaveBeenCalled();
    });

    it("does not call createTeamAction when name is empty", async () => {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: "Create Team" }));
      expect(mockCreateTeamAction).not.toHaveBeenCalled();
    });
  });

  describe("form submission", () => {
    it("calls createTeamAction with altId, name, and format", async () => {
      const user = userEvent.setup();
      mockCreateTeamAction.mockResolvedValue({
        success: true,
        data: { id: 42 },
      });
      render(<NewTeamForm {...defaultProps} />);
      await user.type(screen.getByLabelText("Team Name"), "My Reg I Team");
      await user.click(screen.getByRole("button", { name: "Create Team" }));
      await waitFor(() => {
        expect(mockCreateTeamAction).toHaveBeenCalledWith(
          10,
          "My Reg I Team",
          "gen9vgc2026regi"
        );
      });
    });

    it("navigates to the new team workspace on success", async () => {
      const user = userEvent.setup();
      mockCreateTeamAction.mockResolvedValue({
        success: true,
        data: { id: 42 },
      });
      render(<NewTeamForm {...defaultProps} />);
      await user.type(screen.getByLabelText("Team Name"), "My Reg I Team");
      await user.click(screen.getByRole("button", { name: "Create Team" }));
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          "/dashboard/alts/ash_ketchum/teams/42"
        );
      });
    });

    it("shows error toast when createTeamAction fails", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");
      mockCreateTeamAction.mockResolvedValue({
        success: false,
        error: "Failed to create team",
      });
      render(<NewTeamForm {...defaultProps} />);
      await user.type(screen.getByLabelText("Team Name"), "My Team");
      await user.click(screen.getByRole("button", { name: "Create Team" }));
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create team");
      });
    });

    it("shows toast success on successful creation", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");
      mockCreateTeamAction.mockResolvedValue({
        success: true,
        data: { id: 42 },
      });
      render(<NewTeamForm {...defaultProps} />);
      await user.type(screen.getByLabelText("Team Name"), "My Team");
      await user.click(screen.getByRole("button", { name: "Create Team" }));
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Team created!");
      });
    });
  });

  describe("Cancel button", () => {
    it("calls router.back() when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(mockBack).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Import-mode submission flow
  // =============================================================================

  // Helper: build a minimal ParsedPokemon with sensible defaults. Tests only need
  // to override the fields they care about.
  function makeParsedPokemon(
    overrides: Partial<ParsedPokemon> = {}
  ): ParsedPokemon {
    return {
      species: "Pikachu",
      nickname: null,
      level: 50,
      ability: "Static",
      nature: "Timid",
      held_item: null,
      move1: "Thunderbolt",
      move2: null,
      move3: null,
      move4: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 252,
      ev_special_defense: 4,
      ev_speed: 252,
      iv_hp: 31,
      iv_attack: 31,
      iv_defense: 31,
      iv_special_attack: 31,
      iv_special_defense: 31,
      iv_speed: 31,
      tera_type: null,
      gender: null,
      is_shiny: false,
      ...overrides,
    };
  }

  describe("import-mode submission flow", () => {
    // Shared setup: render in import mode, type a name, and put something in the
    // paste box. Tests control what mockParseShowdownText returns.
    async function setupImportForm(pastContent = "some paste") {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} initialMode="import" />);
      await user.type(screen.getByLabelText("Team Name"), "Import Team");
      await user.type(screen.getByLabelText("Showdown Paste"), pastContent);
      return user;
    }

    describe("successful full import", () => {
      it("calls parseShowdownText with the paste content", async () => {
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 99 },
        });
        mockAddPokemonToTeamAction.mockResolvedValue({
          success: true,
          data: {},
        });
        mockParseShowdownText.mockReturnValue([makeParsedPokemon()]);

        const user = await setupImportForm("paste content");
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          expect(mockParseShowdownText).toHaveBeenCalledWith("paste content");
        });
      });

      it("calls addPokemonToTeamAction for each parsed Pokemon", async () => {
        const parsed = [
          makeParsedPokemon({ species: "Pikachu" }),
          makeParsedPokemon({ species: "Charizard" }),
        ];
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 99 },
        });
        mockAddPokemonToTeamAction.mockResolvedValue({
          success: true,
          data: {},
        });
        mockParseShowdownText.mockReturnValue(parsed);

        const user = await setupImportForm();
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          expect(mockAddPokemonToTeamAction).toHaveBeenCalledTimes(2);
        });
      });

      it("passes position index starting at 1 for each Pokemon", async () => {
        const parsed = [
          makeParsedPokemon({ species: "Pikachu" }),
          makeParsedPokemon({ species: "Charizard" }),
          makeParsedPokemon({ species: "Snorlax" }),
        ];
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 99 },
        });
        mockAddPokemonToTeamAction.mockResolvedValue({
          success: true,
          data: {},
        });
        mockParseShowdownText.mockReturnValue(parsed);

        const user = await setupImportForm();
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          expect(mockAddPokemonToTeamAction).toHaveBeenNthCalledWith(
            1,
            99,
            expect.objectContaining({ species: "Pikachu" }),
            1
          );
          expect(mockAddPokemonToTeamAction).toHaveBeenNthCalledWith(
            2,
            99,
            expect.objectContaining({ species: "Charizard" }),
            2
          );
          expect(mockAddPokemonToTeamAction).toHaveBeenNthCalledWith(
            3,
            99,
            expect.objectContaining({ species: "Snorlax" }),
            3
          );
        });
      });

      it("shows success toast and navigates after all Pokemon are added", async () => {
        const { toast } = await import("sonner");
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 99 },
        });
        mockAddPokemonToTeamAction.mockResolvedValue({
          success: true,
          data: {},
        });
        mockParseShowdownText.mockReturnValue([makeParsedPokemon()]);

        const user = await setupImportForm();
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith("Team created!");
          expect(mockPush).toHaveBeenCalledWith(
            "/dashboard/alts/ash_ketchum/teams/99"
          );
        });
      });

      it("invalidates the team query cache on success", async () => {
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 99 },
        });
        mockAddPokemonToTeamAction.mockResolvedValue({
          success: true,
          data: {},
        });
        mockParseShowdownText.mockReturnValue([makeParsedPokemon()]);

        const user = await setupImportForm();
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          expect(mockInvalidateQueries).toHaveBeenCalled();
        });
      });
    });

    describe("parse returns 0 Pokemon", () => {
      it("shows a warning toast when the paste cannot be parsed", async () => {
        const { toast } = await import("sonner");
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 7 },
        });
        mockParseShowdownText.mockReturnValue([]);

        const user = await setupImportForm("garbage paste");
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          expect(toast.warning).toHaveBeenCalledWith(
            "Showdown paste could not be parsed. Team created empty."
          );
        });
      });

      it("does not call addPokemonToTeamAction when parse returns 0 Pokemon", async () => {
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 7 },
        });
        mockParseShowdownText.mockReturnValue([]);

        const user = await setupImportForm();
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
        });
      });

      it("still navigates to the new team when parse returns 0 Pokemon", async () => {
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 7 },
        });
        mockParseShowdownText.mockReturnValue([]);

        const user = await setupImportForm();
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith(
            "/dashboard/alts/ash_ketchum/teams/7"
          );
        });
      });
    });

    describe("partial addPokemonToTeamAction failures", () => {
      it("shows a warning with failed species names when some calls fail", async () => {
        const { toast } = await import("sonner");
        const parsed = [
          makeParsedPokemon({ species: "Pikachu" }),
          makeParsedPokemon({ species: "Eevee" }),
          makeParsedPokemon({ species: "Snorlax" }),
        ];
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 55 },
        });
        mockParseShowdownText.mockReturnValue(parsed);
        // First succeeds, second fails, third succeeds
        mockAddPokemonToTeamAction
          .mockResolvedValueOnce({ success: true, data: {} })
          .mockResolvedValueOnce({ success: false, error: "DB error" })
          .mockResolvedValueOnce({ success: true, data: {} });

        const user = await setupImportForm();
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          expect(toast.warning).toHaveBeenCalledWith(
            "Team created, but failed to import: Eevee"
          );
        });
      });

      it("includes all failed species names in the warning", async () => {
        const { toast } = await import("sonner");
        const parsed = [
          makeParsedPokemon({ species: "Pikachu" }),
          makeParsedPokemon({ species: "Eevee" }),
          makeParsedPokemon({ species: "Snorlax" }),
        ];
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 55 },
        });
        mockParseShowdownText.mockReturnValue(parsed);
        // All three fail
        mockAddPokemonToTeamAction.mockResolvedValue({
          success: false,
          error: "DB error",
        });

        const user = await setupImportForm();
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          expect(toast.warning).toHaveBeenCalledWith(
            "Team created, but failed to import: Pikachu, Eevee, Snorlax"
          );
        });
      });

      it("still navigates to the team when some Pokemon fail to import", async () => {
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 55 },
        });
        mockParseShowdownText.mockReturnValue([
          makeParsedPokemon({ species: "Pikachu" }),
          makeParsedPokemon({ species: "Eevee" }),
        ]);
        mockAddPokemonToTeamAction
          .mockResolvedValueOnce({ success: true, data: {} })
          .mockResolvedValueOnce({ success: false, error: "DB error" });

        const user = await setupImportForm();
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith(
            "/dashboard/alts/ash_ketchum/teams/55"
          );
        });
      });
    });

    describe("6-Pokemon limit", () => {
      it("imports at most 6 Pokemon even when paste contains more", async () => {
        const sevenPokemon = [
          makeParsedPokemon({ species: "Pikachu" }),
          makeParsedPokemon({ species: "Charizard" }),
          makeParsedPokemon({ species: "Snorlax" }),
          makeParsedPokemon({ species: "Gengar" }),
          makeParsedPokemon({ species: "Machamp" }),
          makeParsedPokemon({ species: "Lapras" }),
          makeParsedPokemon({ species: "Dragonite" }),
        ];
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 77 },
        });
        mockAddPokemonToTeamAction.mockResolvedValue({
          success: true,
          data: {},
        });
        mockParseShowdownText.mockReturnValue(sevenPokemon);

        const user = await setupImportForm();
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          expect(mockAddPokemonToTeamAction).toHaveBeenCalledTimes(6);
        });
      });

      it("does not add the 7th Pokemon (Dragonite) when 7 are parsed", async () => {
        const sevenPokemon = [
          makeParsedPokemon({ species: "Pikachu" }),
          makeParsedPokemon({ species: "Charizard" }),
          makeParsedPokemon({ species: "Snorlax" }),
          makeParsedPokemon({ species: "Gengar" }),
          makeParsedPokemon({ species: "Machamp" }),
          makeParsedPokemon({ species: "Lapras" }),
          makeParsedPokemon({ species: "Dragonite" }),
        ];
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 77 },
        });
        mockAddPokemonToTeamAction.mockResolvedValue({
          success: true,
          data: {},
        });
        mockParseShowdownText.mockReturnValue(sevenPokemon);

        const user = await setupImportForm();
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          const calls = mockAddPokemonToTeamAction.mock.calls as unknown[][];
          const importedSpecies = calls.map(
            (c) => (c[1] as { species: string }).species
          );
          expect(importedSpecies).not.toContain("Dragonite");
        });
      });
    });

    describe("gender mapping", () => {
      it.each([
        ["Male", "Male" as string | null],
        ["Female", "Female" as string | null],
        ["N", null],
        [null, null],
        ["Genderless", null],
        ["M", null],
        ["F", null],
      ])(
        'maps gender "%s" to %s in the Pokemon insert',
        async (inputGender, expectedGender) => {
          mockCreateTeamAction.mockResolvedValue({
            success: true,
            data: { id: 88 },
          });
          mockAddPokemonToTeamAction.mockResolvedValue({
            success: true,
            data: {},
          });
          mockParseShowdownText.mockReturnValue([
            makeParsedPokemon({ species: "Ralts", gender: inputGender }),
          ]);

          const user = userEvent.setup();
          render(<NewTeamForm {...defaultProps} initialMode="import" />);
          await user.type(screen.getByLabelText("Team Name"), "Gender Test");
          await user.type(screen.getByLabelText("Showdown Paste"), "paste");
          await user.click(
            screen.getByRole("button", { name: "Import & Create Team" })
          );

          await waitFor(() => {
            expect(mockAddPokemonToTeamAction).toHaveBeenCalledWith(
              88,
              expect.objectContaining({ gender: expectedGender }),
              1
            );
          });
        }
      );
    });

    describe("import mode with empty paste", () => {
      it("creates an empty team and shows success toast when paste is blank", async () => {
        const { toast } = await import("sonner");
        mockCreateTeamAction.mockResolvedValue({
          success: true,
          data: { id: 33 },
        });
        // parseShowdownText should not be called when paste is blank
        mockParseShowdownText.mockReturnValue([]);

        const user = userEvent.setup();
        render(<NewTeamForm {...defaultProps} initialMode="import" />);
        // Type a name but leave the paste empty
        await user.type(screen.getByLabelText("Team Name"), "Blank Paste Team");
        await user.click(
          screen.getByRole("button", { name: "Import & Create Team" })
        );

        await waitFor(() => {
          expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
          expect(toast.success).toHaveBeenCalledWith("Team created!");
          expect(mockPush).toHaveBeenCalledWith(
            "/dashboard/alts/ash_ketchum/teams/33"
          );
        });
      });
    });
  });
});
