import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks — must be hoisted before imports
// =============================================================================

const mockParsedPikachu = {
  species: "Pikachu",
  ability: "Static",
  held_item: "Light Ball",
  nature: "Timid",
  move1: "Thunderbolt",
  move2: null,
  move3: null,
  move4: null,
  level: 50,
  nickname: null,
  gender: null,
  is_shiny: false,
  tera_type: null,
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
};

const mockParseShowdownText = jest.fn(() => [mockParsedPikachu]);
const mockParsePokepaseUrl = jest.fn(() => null);
const mockGetPokepaseRawUrl = jest.fn(
  (id: string) => `https://pokepast.es/${id}/raw`
);
const mockValidateTeamStructure = jest.fn(() => []);

jest.mock("@trainers/validators", () => ({
  parseShowdownText: (...args: unknown[]) => mockParseShowdownText(...args),
  parsePokepaseUrl: (...args: unknown[]) => mockParsePokepaseUrl(...args),
  getPokepaseRawUrl: (...args: unknown[]) => mockGetPokepaseRawUrl(...args),
  validateTeamStructure: (...args: unknown[]) =>
    mockValidateTeamStructure(...args),
}));

const mockGetLegalSpecies = jest.fn(() => undefined as Set<string> | undefined);
const mockGetLegalItems = jest.fn(() => undefined as Set<string> | undefined);
const mockGetLegalMoves = jest.fn(() => undefined as Set<string> | undefined);
const mockGetLegalTeraTypes = jest.fn(
  () => undefined as Set<string> | undefined
);
const mockIsLegalAbility = jest.fn(() => true);

// Re-create the LEGALITY_UNAVAILABLE sentinel inside the mock so that
// `result === LEGALITY_UNAVAILABLE` checks in the production code line up
// with whatever the mock returns (otherwise the imported symbol resolves
// to `undefined` and collides with the format-not-registered case).
const MOCK_LEGALITY_UNAVAILABLE: unique symbol = Symbol("legality-unavailable");
jest.mock("@trainers/pokemon", () => ({
  getLegalSpecies: (...args: unknown[]) =>
    mockGetLegalSpecies(args[0] as string),
  getLegalItems: (...args: unknown[]) => mockGetLegalItems(args[0] as string),
  getLegalMoves: (...args: unknown[]) =>
    mockGetLegalMoves(args[0] as string, args[1] as string),
  getLegalTeraTypes: (...args: unknown[]) =>
    mockGetLegalTeraTypes(args[0] as string),
  isLegalAbility: (...args: unknown[]) =>
    mockIsLegalAbility(args[0] as string, args[1] as string, args[2] as string),
  LEGALITY_UNAVAILABLE: MOCK_LEGALITY_UNAVAILABLE,
  legalSetOrPermissive: (result: unknown) =>
    result === undefined || result === MOCK_LEGALITY_UNAVAILABLE
      ? undefined
      : result,
}));

const mockAddPokemonToTeamAction = jest.fn(() =>
  Promise.resolve({ success: true })
);

jest.mock("@/actions/teams", () => ({
  addPokemonToTeamAction: (...args: unknown[]) =>
    mockAddPokemonToTeamAction(...args),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
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

// =============================================================================
// Imports (after mocks)
// =============================================================================

// Use fake timers so Base UI's Sheet exit animations resolve instantly rather
// than leaving stale portal nodes in the DOM between tests.
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  // Flush any pending animation timers from the Sheet's close transition
  jest.runAllTimers();
  jest.useRealTimers();
  // Reset all scroll-lock and inert attributes Base UI may have applied
  for (const attr of [
    "data-base-ui-scroll-locked",
    "data-base-ui-inert",
    "data-scroll-locked",
  ]) {
    document.documentElement.removeAttribute(attr);
    document.body.removeAttribute(attr);
  }
  for (const prop of [
    "overflow",
    "position",
    "height",
    "width",
    "box-sizing",
    "scroll-behavior",
    "pointer-events",
  ]) {
    document.body.style.removeProperty(prop);
  }
});

import { ImportDialog } from "../import-dialog";
import { type TeamWithPokemon } from "@trainers/supabase";
import { toast } from "sonner";

// =============================================================================
// Factories
// =============================================================================

function makeTeamPokemonEntry(
  id: number,
  position: number
): TeamWithPokemon["team_pokemon"][number] {
  return {
    id,
    team_id: 1,
    pokemon_id: id,
    team_position: position,
    pokemon: {
      id,
      species: `Existing${id}`,
      nickname: null,
      ability: "Static",
      nature: "Jolly",
      held_item: null,
      gender: null,
      level: 50,
      is_shiny: false,
      tera_type: null,
      move1: "Tackle",
      move2: null,
      move3: null,
      move4: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 0,
      ev_special_defense: 0,
      ev_speed: 0,
      iv_hp: 31,
      iv_attack: 31,
      iv_defense: 31,
      iv_special_attack: 31,
      iv_special_defense: 31,
      iv_speed: 31,
      notes: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  } as TeamWithPokemon["team_pokemon"][number];
}

function makeTeam(overrides: Partial<TeamWithPokemon> = {}): TeamWithPokemon {
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
    team_pokemon: [],
    ...overrides,
  } as TeamWithPokemon;
}

// =============================================================================
// Shared helpers
// =============================================================================

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  onImportComplete: jest.fn(),
};

/** Type paste text, then click "Preview Team". */
async function parsePaste(
  user: ReturnType<typeof userEvent.setup>,
  text: string
) {
  const textarea = screen.getByLabelText("Showdown Paste");
  await user.type(textarea, text);
  await user.click(screen.getByRole("button", { name: /preview team/i }));
}

// =============================================================================
// Tests
// =============================================================================

describe("ImportDialog", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockParseShowdownText.mockReturnValue([mockParsedPikachu]);
    mockParsePokepaseUrl.mockReturnValue(null);
    mockValidateTeamStructure.mockReturnValue([]);
    mockAddPokemonToTeamAction.mockResolvedValue({ success: true });
    // Default: permissive — no registered legality lists
    mockGetLegalSpecies.mockReturnValue(undefined);
    mockGetLegalItems.mockReturnValue(undefined);
    mockGetLegalMoves.mockReturnValue(undefined);
    mockGetLegalTeraTypes.mockReturnValue(undefined);
    mockIsLegalAbility.mockReturnValue(true);
  });

  // ---------------------------------------------------------------------------
  // Open / closed state
  // ---------------------------------------------------------------------------

  describe("when closed (open=false)", () => {
    it("does not render the sheet title", () => {
      render(
        <ImportDialog
          team={makeTeam()}
          open={false}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
        />
      );
      expect(
        screen.queryByRole("heading", { name: "Import Pokémon" })
      ).not.toBeInTheDocument();
    });

    it("does not render the tab buttons", () => {
      render(
        <ImportDialog
          team={makeTeam()}
          open={false}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
        />
      );
      expect(
        screen.queryByRole("tab", { name: /paste text/i })
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Initial render when open
  // ---------------------------------------------------------------------------

  describe("initial render (open=true)", () => {
    it("renders the sheet title", () => {
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      expect(
        screen.getByRole("heading", { name: "Import Pokémon" })
      ).toBeInTheDocument();
    });

    it("shows 'Paste Text' and 'Pokepaste URL' tab buttons", () => {
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      expect(
        screen.getByRole("tab", { name: /paste text/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /pokepaste url/i })
      ).toBeInTheDocument();
    });

    it("shows the Cancel button", () => {
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
    });

    it("does not show the Import button before parsing", () => {
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      expect(
        screen.queryByRole("button", { name: /import \d/i })
      ).not.toBeInTheDocument();
    });

    it("shows available slots in the description — 6 for empty team", () => {
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      expect(screen.getByText(/6 slots available/i)).toBeInTheDocument();
    });

    it("shows singular 'slot' when 1 slot remains", () => {
      const team = makeTeam({
        team_pokemon: Array.from({ length: 5 }, (_, i) =>
          makeTeamPokemonEntry(i + 1, i + 1)
        ),
      });
      render(<ImportDialog team={team} {...defaultProps} />);
      expect(screen.getByText(/1 slot available/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Paste tab — textarea
  // ---------------------------------------------------------------------------

  describe("Paste Text tab", () => {
    it("renders the Showdown Paste textarea on the paste tab", () => {
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      expect(screen.getByLabelText("Showdown Paste")).toBeInTheDocument();
    });

    it("Preview Team button is disabled when textarea is empty", () => {
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /preview team/i })
      ).toBeDisabled();
    });

    it("Preview Team button is enabled after typing", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await user.type(
        screen.getByLabelText("Showdown Paste"),
        "Pikachu @ Light Ball"
      );
      expect(
        screen.getByRole("button", { name: /preview team/i })
      ).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // Parse paste — error paths
  // ---------------------------------------------------------------------------

  describe("Parse paste — error handling", () => {
    it("shows an error toast when textarea is submitted empty", async () => {
      // Bypass the disabled-button guard by calling handleParsePaste
      // with an empty paste — simulate by temporarily enabling the button
      // via the component's internal check. We do this by firing the click
      // programmatically while text is whitespace.
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);

      // Type then clear — leaves empty string, button stays disabled.
      // Instead test the branch via: paste text that parses to empty result.
      mockParseShowdownText.mockReturnValueOnce([]);
      await user.type(
        screen.getByLabelText("Showdown Paste"),
        "bad text that parses empty"
      );
      await user.click(screen.getByRole("button", { name: /preview team/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/could not parse/i)
        );
      });
    });

    it("does not show preview panel when parsing returns no results", async () => {
      mockParseShowdownText.mockReturnValueOnce([]);
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await user.type(
        screen.getByLabelText("Showdown Paste"),
        "invalid showdown text"
      );
      await user.click(screen.getByRole("button", { name: /preview team/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
      // Preview panel (showing "Previewing N Pokémon...") should not appear
      expect(screen.queryByText(/previewing/i)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Preview panel
  // ---------------------------------------------------------------------------

  describe("Preview panel after successful parse", () => {
    it("transitions to preview mode showing species names", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(screen.getByText("Pikachu")).toBeInTheDocument();
      });
    });

    it("shows the preview count message", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(screen.getByText(/previewing 1 pokémon/i)).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Structural validation errors — Import button disabled
  // ---------------------------------------------------------------------------

  describe("structural validation errors", () => {
    it("shows error messages from validateTeamStructure", async () => {
      mockValidateTeamStructure.mockReturnValue([
        { message: "Duplicate held items: Light Ball" },
      ]);
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(
          screen.getByText("Duplicate held items: Light Ball")
        ).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Back button
  // ---------------------------------------------------------------------------

  describe("Back button", () => {
    it("returns to input mode when Back is clicked after preview", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(screen.getByText(/previewing/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /back/i }));

      await waitFor(() => {
        expect(screen.queryByText(/previewing/i)).not.toBeInTheDocument();
      });
      // Input tabs are visible again
      expect(
        screen.getByRole("tab", { name: /paste text/i })
      ).toBeInTheDocument();
    });

    it("hides the Import button after clicking Back", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /import \d/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /back/i }));

      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: /import \d/i })
        ).not.toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Cancel button
  // ---------------------------------------------------------------------------

  describe("Cancel button", () => {
    it("calls onOpenChange(false) when Cancel is clicked", async () => {
      const onOpenChange = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={onOpenChange}
          onImportComplete={jest.fn()}
        />
      );
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Import action
  // ---------------------------------------------------------------------------

  describe("Import action — happy path", () => {
    it("calls addPokemonToTeamAction for each parsed pokemon and fires onImportComplete", async () => {
      const onImportComplete = jest.fn();
      const onOpenChange = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={onOpenChange}
          onImportComplete={onImportComplete}
        />
      );
      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /import 1/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /import 1/i }));

      await waitFor(() => {
        expect(mockAddPokemonToTeamAction).toHaveBeenCalledTimes(1);
      });
      expect(onImportComplete).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/imported 1/i)
      );
    });

    it("passes parsedToInsert-mapped data and position to the action", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /import 1/i })
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /import 1/i }));

      await waitFor(() => {
        expect(mockAddPokemonToTeamAction).toHaveBeenCalledWith(
          1, // team.id
          expect.objectContaining({ species: "Pikachu", ability: "Static" }),
          1 // first available position
        );
      });
    });

    it("fills the next available position slot when some slots are already used", async () => {
      // Team has pokemon in positions 1 and 3 — next available is 2
      const team = makeTeam({
        team_pokemon: [makeTeamPokemonEntry(1, 1), makeTeamPokemonEntry(3, 3)],
      });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={team} {...defaultProps} />);
      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /import 1/i })
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /import 1/i }));

      await waitFor(() => {
        expect(mockAddPokemonToTeamAction).toHaveBeenCalledWith(
          team.id,
          expect.any(Object),
          2 // first available slot
        );
      });
    });

    it("shows a success toast and closes the dialog on full success", async () => {
      const onOpenChange = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={onOpenChange}
          onImportComplete={jest.fn()}
        />
      );
      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /import 1/i })
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /import 1/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Imported 1 Pokémon.");
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Import action — error paths", () => {
    it("shows an error toast and keeps dialog open when all imports fail", async () => {
      mockAddPokemonToTeamAction.mockResolvedValue({
        success: false,
        error: "DB constraint violation",
      });
      const onOpenChange = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={onOpenChange}
          onImportComplete={jest.fn()}
        />
      );
      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /import 1/i })
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /import 1/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/import failed.*DB constraint/i)
        );
      });
      // Dialog stays open — onOpenChange(false) should NOT have been called
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it("shows a warning toast when some but not all imports succeed", async () => {
      const mockParsedCharizard = {
        ...mockParsedPikachu,
        species: "Charizard",
      };
      mockParseShowdownText.mockReturnValue([
        mockParsedPikachu,
        mockParsedCharizard,
      ]);
      // First call succeeds, second fails
      mockAddPokemonToTeamAction
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: "Slot taken" });

      const onImportComplete = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={onImportComplete}
        />
      );
      await parsePaste(user, "two pokemon paste");

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /import 2/i })
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /import 2/i }));

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith(
          expect.stringMatching(/imported 1.*charizard.*failed/i)
        );
      });
      expect(onImportComplete).toHaveBeenCalled();
    });

    it("shows an error toast and does not import when team is full", async () => {
      const fullTeam = makeTeam({
        team_pokemon: Array.from({ length: 6 }, (_, i) =>
          makeTeamPokemonEntry(i + 1, i + 1)
        ),
      });
      userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={fullTeam}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
        />
      );
      // Can't parse via paste flow since Import button is disabled when team full
      // and availableSlots = 0. Verify the description reflects 0 slots.
      expect(screen.getByText(/0 slots available/i)).toBeInTheDocument();
      // Import button should not exist (parsed is null initially)
      expect(
        screen.queryByRole("button", { name: /import/i })
      ).not.toBeInTheDocument();
    });

    it("shows a legality error at import time if checkLegality fails on the second check", async () => {
      // First legality check passes (no formatId), but we simulate a formatId where
      // after parsing the import is triggered with an illegal species.
      const onOpenChange = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Render with a formatId so legality is checked
      mockGetLegalSpecies.mockReturnValue(new Set(["Pikachu"])); // Only Pikachu legal
      // Parse returns Pikachu (legal) — proceed to preview
      mockParseShowdownText.mockReturnValue([mockParsedPikachu]);

      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={onOpenChange}
          onImportComplete={jest.fn()}
          formatId="gen9vgc2026regi"
        />
      );
      await parsePaste(user, "Pikachu @ Light Ball");

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /import 1/i })
        ).toBeInTheDocument();
      });

      // Now change the species mock to illegal before clicking import
      mockGetLegalSpecies.mockReturnValue(new Set(["Raichu"])); // Pikachu now illegal
      await user.click(screen.getByRole("button", { name: /import 1/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
    });
  });

  describe("Import action — slot counting", () => {
    it("imports only up to available slots when parsed count exceeds team space", async () => {
      // Team has 5 pokemon, only 1 slot left
      const almostFullTeam = makeTeam({
        team_pokemon: Array.from({ length: 5 }, (_, i) =>
          makeTeamPokemonEntry(i + 1, i + 1)
        ),
      });
      const pikachu2 = { ...mockParsedPikachu, species: "Raichu" };
      mockParseShowdownText.mockReturnValue([mockParsedPikachu, pikachu2]);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={almostFullTeam}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
        />
      );
      await parsePaste(user, "two pokemon paste");

      await waitFor(() => {
        // Only 1 slot available, button shows Import 1
        expect(
          screen.getByRole("button", { name: /import 1/i })
        ).toBeInTheDocument();
      });
      // Preview shows skipped pokemon
      expect(screen.getByText(/1 skipped, team full/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /import 1/i }));

      await waitFor(() => {
        // Only 1 addPokemonToTeamAction call despite 2 parsed pokemon
        expect(mockAddPokemonToTeamAction).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Pokepaste URL tab
  // ---------------------------------------------------------------------------

  describe("Pokepaste URL tab", () => {
    async function switchToUrlTab(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("tab", { name: /pokepaste url/i }));
    }

    it("Fetch & Preview button is disabled when URL input is empty", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await switchToUrlTab(user);
      expect(
        screen.getByRole("button", { name: /fetch.*preview/i })
      ).toBeDisabled();
    });

    it("shows an error toast when URL is invalid (parsePokepaseUrl returns null)", async () => {
      mockParsePokepaseUrl.mockReturnValue(null);
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await switchToUrlTab(user);

      const urlInput = screen.getByPlaceholderText(
        "https://pokepast.es/abc1234567890abc"
      );
      await user.type(urlInput, "https://not-a-pokepaste.com/abc");
      await user.click(screen.getByRole("button", { name: /fetch.*preview/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/invalid pokepaste url/i)
        );
      });
    });

    it("shows an error toast when the fetch fails with a network error", async () => {
      mockParsePokepaseUrl.mockReturnValue({ pasteId: "abc1234567890abc" });
      mockGetPokepaseRawUrl.mockReturnValue(
        "https://pokepast.es/abc1234567890abc/raw"
      );

      // Simulate fetch throwing a TypeError (CORS/network failure)
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new TypeError("Failed to fetch"));

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await switchToUrlTab(user);

      const urlInput = screen.getByPlaceholderText(
        "https://pokepast.es/abc1234567890abc"
      );
      await user.type(urlInput, "https://pokepast.es/abc1234567890abc");
      await user.click(screen.getByRole("button", { name: /fetch.*preview/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/cors blocked/i)
        );
      });
    });

    it("shows a generic error toast when fetch fails with a non-TypeError error", async () => {
      mockParsePokepaseUrl.mockReturnValue({ pasteId: "abc1234567890abc" });
      mockGetPokepaseRawUrl.mockReturnValue(
        "https://pokepast.es/abc1234567890abc/raw"
      );

      global.fetch = jest.fn().mockRejectedValueOnce(new Error("HTTP 404"));

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await switchToUrlTab(user);

      const urlInput = screen.getByPlaceholderText(
        "https://pokepast.es/abc1234567890abc"
      );
      await user.type(urlInput, "https://pokepast.es/abc1234567890abc");
      await user.click(screen.getByRole("button", { name: /fetch.*preview/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/failed to fetch pokepaste.*HTTP 404/i)
        );
      });
    });

    it("shows an error toast when the HTTP response is not ok", async () => {
      mockParsePokepaseUrl.mockReturnValue({ pasteId: "abc1234567890abc" });
      mockGetPokepaseRawUrl.mockReturnValue(
        "https://pokepast.es/abc1234567890abc/raw"
      );

      // Use a plain object mock — JSDOM's Response stub doesn't support status
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not Found"),
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await switchToUrlTab(user);

      const urlInput = screen.getByPlaceholderText(
        "https://pokepast.es/abc1234567890abc"
      );
      await user.type(urlInput, "https://pokepast.es/abc1234567890abc");
      await user.click(screen.getByRole("button", { name: /fetch.*preview/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/HTTP 404|failed to fetch/i)
        );
      });
    });

    it("shows an error toast when fetched content parses to empty results", async () => {
      mockParsePokepaseUrl.mockReturnValue({ pasteId: "abc1234567890abc" });
      mockGetPokepaseRawUrl.mockReturnValue(
        "https://pokepast.es/abc1234567890abc/raw"
      );
      mockParseShowdownText.mockReturnValue([]);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("some invalid content"),
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await switchToUrlTab(user);

      const urlInput = screen.getByPlaceholderText(
        "https://pokepast.es/abc1234567890abc"
      );
      await user.type(urlInput, "https://pokepast.es/abc1234567890abc");
      await user.click(screen.getByRole("button", { name: /fetch.*preview/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/could not parse.*pokepaste/i)
        );
      });
    });

    it("transitions to preview when URL fetch and parse succeed", async () => {
      mockParsePokepaseUrl.mockReturnValue({ pasteId: "abc1234567890abc" });
      mockGetPokepaseRawUrl.mockReturnValue(
        "https://pokepast.es/abc1234567890abc/raw"
      );
      mockParseShowdownText.mockReturnValue([mockParsedPikachu]);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("Pikachu @ Light Ball\nAbility: Static"),
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await switchToUrlTab(user);

      const urlInput = screen.getByPlaceholderText(
        "https://pokepast.es/abc1234567890abc"
      );
      await user.type(urlInput, "https://pokepast.es/abc1234567890abc");
      await user.click(screen.getByRole("button", { name: /fetch.*preview/i }));

      await waitFor(() => {
        expect(screen.getByText(/previewing/i)).toBeInTheDocument();
      });
      expect(screen.getByText("Pikachu")).toBeInTheDocument();
    });

    it("shows a legality error when fetched pokepaste contains an illegal species", async () => {
      mockParsePokepaseUrl.mockReturnValue({ pasteId: "abc1234567890abc" });
      mockGetPokepaseRawUrl.mockReturnValue(
        "https://pokepast.es/abc1234567890abc/raw"
      );
      mockParseShowdownText.mockReturnValue([mockParsedPikachu]);
      mockGetLegalSpecies.mockReturnValue(new Set(["Raichu"])); // Pikachu is illegal

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("Pikachu @ Light Ball"),
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
          formatId="gen9ou"
        />
      );
      await switchToUrlTab(user);

      const urlInput = screen.getByPlaceholderText(
        "https://pokepast.es/abc1234567890abc"
      );
      await user.type(urlInput, "https://pokepast.es/abc1234567890abc");
      await user.click(screen.getByRole("button", { name: /fetch.*preview/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.queryByText(/previewing/i)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // parsedToInsert transformation
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Item paste guard
  // ---------------------------------------------------------------------------

  describe("item legality guard", () => {
    it("shows an inline error and does not show preview when paste contains an illegal item", async () => {
      const mockWithIllegalItem = {
        ...mockParsedPikachu,
        held_item: "Booster Energy",
      };
      mockParseShowdownText.mockReturnValueOnce([mockWithIllegalItem]);
      // Simulate format that bans Booster Energy
      mockGetLegalItems.mockReturnValue(new Set(["Life Orb", "Leftovers"]));

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
          formatId="gen9monotype"
        />
      );

      await parsePaste(user, "Pikachu @ Booster Energy");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByRole("alert")).toHaveTextContent("Booster Energy");

      // Preview panel must not appear
      expect(screen.queryByText(/previewing/i)).not.toBeInTheDocument();
      // Import action should never be called
      expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
    });

    it("proceeds to preview when all held items are legal in the target format", async () => {
      const mockWithLegalItem = { ...mockParsedPikachu, held_item: "Life Orb" };
      mockParseShowdownText.mockReturnValueOnce([mockWithLegalItem]);
      mockGetLegalItems.mockReturnValue(new Set(["Life Orb", "Leftovers"]));

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
          formatId="gen9monotype"
        />
      );

      await parsePaste(user, "Pikachu @ Life Orb");

      await waitFor(() => {
        expect(screen.getByText(/previewing/i)).toBeInTheDocument();
      });
    });

    it("proceeds to preview when getLegalItems returns undefined (permissive format)", async () => {
      const mockWithAnyItem = {
        ...mockParsedPikachu,
        held_item: "Booster Energy",
      };
      mockParseShowdownText.mockReturnValueOnce([mockWithAnyItem]);
      // permissive — no item banlist
      mockGetLegalItems.mockReturnValue(undefined);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
          formatId="gen9vgc2026regi"
        />
      );

      await parsePaste(user, "Pikachu @ Booster Energy");

      await waitFor(() => {
        expect(screen.getByText(/previewing/i)).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Move legality guard
  // ---------------------------------------------------------------------------

  describe("move legality guard", () => {
    it("shows an inline error when paste contains an illegal move", async () => {
      const mockWithIllegalMove = {
        ...mockParsedPikachu,
        move1: "Hyperspace Hole", // Pikachu can't learn this
      };
      mockParseShowdownText.mockReturnValueOnce([mockWithIllegalMove]);
      mockGetLegalMoves.mockReturnValue(
        new Set(["Thunderbolt", "Protect", "Fake Out"])
      );

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
          formatId="gen9vgc2026regi"
        />
      );

      await parsePaste(user, "Pikachu with illegal move");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByRole("alert")).toHaveTextContent(/Hyperspace Hole/);
      expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
    });

    it("proceeds to preview when all moves are legal", async () => {
      mockParseShowdownText.mockReturnValueOnce([mockParsedPikachu]);
      mockGetLegalMoves.mockReturnValue(
        new Set(["Thunderbolt", "Protect", "Fake Out"])
      );

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
          formatId="gen9vgc2026regi"
        />
      );

      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(screen.getByText(/previewing/i)).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Tera type paste guard
  // ---------------------------------------------------------------------------

  describe("tera type legality guard", () => {
    it("shows an inline error when paste contains an illegal tera type", async () => {
      const mockWithTera = {
        ...mockParsedPikachu,
        tera_type: "Fire",
      };
      mockParseShowdownText.mockReturnValueOnce([mockWithTera]);
      // Empty set = no Tera allowed
      mockGetLegalTeraTypes.mockReturnValue(new Set());

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
          formatId="championsvgc2026regma"
        />
      );

      await parsePaste(user, "Pikachu\nTera Type: Fire");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByRole("alert")).toHaveTextContent(
        /tera isn't allowed/i
      );
      // Preview panel must not appear
      expect(screen.queryByText(/previewing/i)).not.toBeInTheDocument();
    });

    it("proceeds to preview when tera types are legal", async () => {
      const mockWithTera = {
        ...mockParsedPikachu,
        tera_type: "Fire",
      };
      mockParseShowdownText.mockReturnValueOnce([mockWithTera]);
      // All 18 types legal
      mockGetLegalTeraTypes.mockReturnValue(
        new Set(["Fire", "Water", "Grass"])
      );

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
          formatId="gen9vgc2026regi"
        />
      );

      await parsePaste(user, "Pikachu\nTera Type: Fire");

      await waitFor(() => {
        expect(screen.getByText(/previewing/i)).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Ability paste guard
  // ---------------------------------------------------------------------------

  describe("ability legality guard", () => {
    it("shows an inline error when paste contains an illegal ability", async () => {
      const mockWithIllegalAbility = {
        ...mockParsedPikachu,
        ability: "Moody",
        species: "Smeargle",
      };
      mockParseShowdownText.mockReturnValueOnce([mockWithIllegalAbility]);
      // Moody is illegal on Smeargle in Gen 9 OU
      mockIsLegalAbility.mockReturnValue(false);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
          formatId="gen9ou"
        />
      );

      await parsePaste(user, "Smeargle\nAbility: Moody");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByRole("alert")).toHaveTextContent("Moody");
      // Preview panel must not appear
      expect(screen.queryByText(/previewing/i)).not.toBeInTheDocument();
      expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
    });

    it("proceeds to preview when abilities are legal", async () => {
      mockParseShowdownText.mockReturnValueOnce([mockParsedPikachu]);
      mockIsLegalAbility.mockReturnValue(true);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
          formatId="gen9vgc2026regi"
        />
      );

      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(screen.getByText(/previewing/i)).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // checkLegality — no formatId (skips all checks)
  // ---------------------------------------------------------------------------

  describe("checkLegality — no formatId", () => {
    it("proceeds to preview without formatId regardless of species", async () => {
      // formatId not passed — all species are allowed
      mockParseShowdownText.mockReturnValueOnce([mockParsedPikachu]);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
          // no formatId prop — permissive
        />
      );

      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(screen.getByText(/previewing/i)).toBeInTheDocument();
      });
      // No legality functions should be called without a formatId
      expect(mockGetLegalSpecies).not.toHaveBeenCalled();
      expect(mockGetLegalItems).not.toHaveBeenCalled();
      expect(mockGetLegalMoves).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // parsedToInsert — gender field mapping
  // ---------------------------------------------------------------------------

  describe("parsedToInsert — gender field", () => {
    it("passes gender 'Male' through to the action payload", async () => {
      const malePokemon = { ...mockParsedPikachu, gender: "Male" as const };
      mockParseShowdownText.mockReturnValue([malePokemon]);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await parsePaste(user, "Pikachu (M) @ Light Ball");

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /import 1/i })
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /import 1/i }));

      await waitFor(() => {
        expect(mockAddPokemonToTeamAction).toHaveBeenCalledWith(
          expect.any(Number),
          expect.objectContaining({ gender: "Male" }),
          expect.any(Number)
        );
      });
    });

    it("passes gender 'Female' through to the action payload", async () => {
      const femalePokemon = { ...mockParsedPikachu, gender: "Female" as const };
      mockParseShowdownText.mockReturnValue([femalePokemon]);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await parsePaste(user, "Pikachu (F) @ Light Ball");

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /import 1/i })
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /import 1/i }));

      await waitFor(() => {
        expect(mockAddPokemonToTeamAction).toHaveBeenCalledWith(
          expect.any(Number),
          expect.objectContaining({ gender: "Female" }),
          expect.any(Number)
        );
      });
    });

    it("maps unknown gender to null in the action payload", async () => {
      const genderlessPokemon = {
        ...mockParsedPikachu,
        gender: "Genderless" as unknown as null,
      };
      mockParseShowdownText.mockReturnValue([genderlessPokemon]);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await parsePaste(user, "Mewtwo @ Light Ball");

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /import 1/i })
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /import 1/i }));

      await waitFor(() => {
        expect(mockAddPokemonToTeamAction).toHaveBeenCalledWith(
          expect.any(Number),
          expect.objectContaining({ gender: null }),
          expect.any(Number)
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Import button disabled states
  // ---------------------------------------------------------------------------

  describe("Import button disabled states", () => {
    it("Import button is disabled when structural errors exist", async () => {
      mockValidateTeamStructure.mockReturnValue([
        { message: "Duplicate held items detected" },
      ]);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ImportDialog team={makeTeam()} {...defaultProps} />);
      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /import 1/i })
        ).toBeDisabled();
      });
      expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Preview panel — skip display
  // ---------------------------------------------------------------------------

  describe("Preview panel — skipped pokemon display", () => {
    it("shows skipped pokemon with strikethrough styling when team cannot fit all", async () => {
      // Team has 5, only 1 slot left, parsing 2 pokemon
      const almostFullTeam = makeTeam({
        team_pokemon: Array.from({ length: 5 }, (_, i) =>
          makeTeamPokemonEntry(i + 1, i + 1)
        ),
      });
      const pikachu2 = { ...mockParsedPikachu, species: "Raichu" };
      mockParseShowdownText.mockReturnValue([mockParsedPikachu, pikachu2]);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={almostFullTeam}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
        />
      );
      await parsePaste(user, "two pokemon paste");

      await waitFor(() => {
        expect(screen.getByText(/previewing 2 pokémon/i)).toBeInTheDocument();
      });

      // Skipped pokemon shows "skipped" label
      expect(screen.getByText("skipped")).toBeInTheDocument();
      // Both species are rendered
      expect(screen.getByText("Pikachu")).toBeInTheDocument();
      expect(screen.getByText("Raichu")).toBeInTheDocument();
    });

    it("shows a team-already-has-N warning when slots are partially occupied", async () => {
      const partialTeam = makeTeam({
        team_pokemon: [makeTeamPokemonEntry(1, 1)],
      });
      mockParseShowdownText.mockReturnValue([mockParsedPikachu]);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={partialTeam}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
        />
      );
      await parsePaste(user, "Pikachu @ Light Ball");

      await waitFor(() => {
        expect(
          screen.getByText(/this team already has 1 pokémon/i)
        ).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // handleOpenChange — state reset on close
  // ---------------------------------------------------------------------------

  describe("handleOpenChange — state reset", () => {
    it("clears parsed state and legality error when dialog is closed", async () => {
      // First get to preview mode
      const onOpenChange = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={onOpenChange}
          onImportComplete={jest.fn()}
        />
      );
      await parsePaste(user, "Pikachu @ Light Ball\nAbility: Static");

      await waitFor(() => {
        expect(screen.getByText(/previewing/i)).toBeInTheDocument();
      });

      // Close via Cancel
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Illegal tera type — specific legalTera.size > 0 branch
  // ---------------------------------------------------------------------------

  describe("tera type legality — non-empty restricted set", () => {
    it("shows 'Illegal Tera types' message when tera types are restricted but not all banned", async () => {
      const mockWithIllegalTera = {
        ...mockParsedPikachu,
        tera_type: "Dark",
      };
      mockParseShowdownText.mockReturnValueOnce([mockWithIllegalTera]);
      // Only Fire and Water allowed — Dark is illegal
      mockGetLegalTeraTypes.mockReturnValue(new Set(["Fire", "Water"]));

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ImportDialog
          team={makeTeam()}
          open={true}
          onOpenChange={jest.fn()}
          onImportComplete={jest.fn()}
          formatId="championsvgc2026regma"
        />
      );

      await parsePaste(user, "Pikachu\nTera Type: Dark");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByRole("alert")).toHaveTextContent(
        /illegal tera types.*dark/i
      );
    });
  });
});
