/**
 * Tests for tournament-game-settings.tsx
 * Covers: helper functions (getFormatsForGame, getGameById, getFormatById)
 * and TournamentGameSettings component rendering + interactions.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  POKEMON_GAMES,
  GAME_FORMATS,
  getFormatsForGame,
  getGameById,
  getFormatById,
  TournamentGameSettings,
} from "../tournament-game-settings";

// ── Helper functions ──────────────────────────────────────────────────────

describe("getFormatsForGame", () => {
  it.each([
    ["sv", 9],
    ["swsh", 13],
    ["bdsp", 2],
    ["lgpe", 2],
  ])("returns correct format count for game '%s' (%d)", (gameId, count) => {
    const formats = getFormatsForGame(gameId);
    expect(formats).toHaveLength(count);
  });

  it("returns empty array for unknown game", () => {
    expect(getFormatsForGame("nonexistent")).toEqual([]);
  });
});

describe("getGameById", () => {
  it.each(POKEMON_GAMES.map((g) => [g.id, g.name]))(
    "finds game '%s' (%s)",
    (id, name) => {
      const game = getGameById(id);
      expect(game).toBeDefined();
      expect(game!.name).toBe(name);
    }
  );

  it("returns undefined for unknown game ID", () => {
    expect(getGameById("gen1")).toBeUndefined();
  });
});

describe("getFormatById", () => {
  it("finds 'reg-i' in sv", () => {
    const format = getFormatById("sv", "reg-i");
    expect(format).toBeDefined();
    expect(format!.name).toBe("Regulation I");
  });

  it("finds 'series-1' in swsh", () => {
    const format = getFormatById("swsh", "series-1");
    expect(format).toBeDefined();
    expect(format!.name).toBe("Series 1");
  });

  it("returns undefined for mismatched game/format", () => {
    // reg-i belongs to sv, not swsh
    expect(getFormatById("swsh", "reg-i")).toBeUndefined();
  });

  it("returns undefined for unknown game", () => {
    expect(getFormatById("nonexistent", "reg-i")).toBeUndefined();
  });
});

// ── Constants ─────────────────────────────────────────────────────────────

describe("POKEMON_GAMES", () => {
  it("contains at least 4 games", () => {
    expect(POKEMON_GAMES.length).toBeGreaterThanOrEqual(4);
  });

  it("each game has id, name, and shortName", () => {
    for (const game of POKEMON_GAMES) {
      expect(game.id).toBeTruthy();
      expect(game.name).toBeTruthy();
      expect(game.shortName).toBeTruthy();
    }
  });
});

describe("GAME_FORMATS", () => {
  it("has formats for every game in POKEMON_GAMES", () => {
    for (const game of POKEMON_GAMES) {
      expect(GAME_FORMATS[game.id]).toBeDefined();
      expect(GAME_FORMATS[game.id]!.length).toBeGreaterThan(0);
    }
  });
});

// ── Component ─────────────────────────────────────────────────────────────

// Mock UI components to isolate logic
jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    disabled,
    value,
  }: {
    children: React.ReactNode;
    onValueChange: (v: string | null) => void;
    disabled: boolean;
    value?: string;
  }) => (
    <div data-testid="select" data-disabled={disabled} data-value={value}>
      {children}
      {/* Expose the callback so tests can trigger it */}
      <button
        data-testid={`select-trigger-${value || "empty"}`}
        onClick={() => onValueChange("sv")}
      />
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({
    children,
    id,
  }: {
    children: React.ReactNode;
    id?: string;
  }) => <div data-testid={`trigger-${id}`}>{children}</div>,
  SelectValue: ({
    children,
    placeholder,
  }: {
    children: React.ReactNode;
    placeholder?: string;
  }) => <span>{children ?? placeholder}</span>,
}));

jest.mock("@/components/ui/button-group", () => ({
  ButtonGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="button-group">{children}</div>
  ),
}));

jest.mock("@/components/ui/field", () => ({
  Field: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FieldLabel: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

const defaultProps = {
  onGameChange: jest.fn(),
  onGameFormatChange: jest.fn(),
  onPlatformChange: jest.fn(),
  onBattleFormatChange: jest.fn(),
};

function renderComponent(overrides = {}) {
  return render(<TournamentGameSettings {...defaultProps} {...overrides} />);
}

describe("TournamentGameSettings component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Game, Regulation, Platform, and Battle Format labels", () => {
    renderComponent();
    expect(screen.getByText("Game")).toBeInTheDocument();
    expect(screen.getByText("Regulation")).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Battle Format")).toBeInTheDocument();
  });

  it("renders platform buttons (Switch and Showdown)", () => {
    renderComponent();
    expect(screen.getByText("Switch")).toBeInTheDocument();
    expect(screen.getByText("Showdown")).toBeInTheDocument();
  });

  it("renders battle format buttons (Doubles and Singles)", () => {
    renderComponent();
    expect(screen.getByText("Doubles")).toBeInTheDocument();
    expect(screen.getByText("Singles")).toBeInTheDocument();
  });

  it("calls onPlatformChange when clicking Showdown", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByText("Showdown"));
    expect(defaultProps.onPlatformChange).toHaveBeenCalledWith("showdown");
  });

  it("calls onBattleFormatChange when clicking Singles", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByText("Singles"));
    expect(defaultProps.onBattleFormatChange).toHaveBeenCalledWith("singles");
  });

  it("disables buttons when disabled prop is true", () => {
    renderComponent({ disabled: true });
    const switchBtn = screen.getByText("Switch");
    expect(switchBtn).toBeDisabled();
  });

  it("shows game short name when game is selected", () => {
    renderComponent({ game: "sv" });
    expect(screen.getByText("Scarlet/Violet")).toBeInTheDocument();
  });

  it("clears format when game changes via handleGameChange", async () => {
    const user = userEvent.setup();
    renderComponent({ game: "swsh", gameFormat: "series-1" });

    // Click the mock select trigger to fire handleGameChange
    const trigger = screen.getByTestId("select-trigger-swsh");
    await user.click(trigger);

    // handleGameChange should call onGameChange with new value and clear format
    expect(defaultProps.onGameChange).toHaveBeenCalledWith("sv");
    expect(defaultProps.onGameFormatChange).toHaveBeenCalledWith(undefined);
  });
});
