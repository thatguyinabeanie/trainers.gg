import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  exportTeamToShowdown: jest.fn(
    () => "Pikachu @ Light Ball\nAbility: Static\n"
  ),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
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

// Mock the dropdown-menu UI primitives — Base UI's Menu uses portals and
// floating-ui positioning that don't work in JSDOM. Replace with a simple
// open/close toggle so we can test ExportMenu's click handlers directly.
jest.mock("@/components/ui/dropdown-menu", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");

  function DropdownMenu({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    return (
      <div data-testid="dropdown-menu">
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(
                child as React.ReactElement<Record<string, unknown>>,
                {
                  open,
                  onToggle: () => setOpen((v: boolean) => !v),
                }
              )
            : child
        )}
      </div>
    );
  }

  function DropdownMenuTrigger({
    children,
    onToggle,
    render: renderProp,
  }: {
    children: React.ReactNode;
    onToggle?: () => void;
    render?: React.ReactElement;
  }) {
    // If a render prop element is provided (as in the source), clone it with onClick
    if (renderProp) {
      return React.cloneElement(renderProp, { onClick: onToggle }, children);
    }
    return <button onClick={onToggle}>{children}</button>;
  }

  function DropdownMenuContent({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) {
    if (!open) return null;
    return <div data-testid="dropdown-content">{children}</div>;
  }

  function DropdownMenuItem({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) {
    return (
      <div role="menuitem" onClick={onClick}>
        {children}
      </div>
    );
  }

  return {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
  };
});

// Clipboard API — defined here so it's available for Object.defineProperty;
// the spy is set up in beforeEach so it survives jest.clearAllMocks().
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: jest.fn() },
  configurable: true,
  writable: true,
});

// window.open — set once at module scope; mockOpen reference is stable
const mockOpen = jest.fn();
Object.defineProperty(window, "open", { value: mockOpen, writable: true });

import { ExportMenu } from "../export-menu";
import { type TeamWithPokemon } from "@trainers/supabase";
import { exportTeamToShowdown } from "@trainers/pokemon";
import { toast } from "sonner";

// =============================================================================
// Factories
// =============================================================================

function makePokemonEntry(
  id: number,
  position: number,
  species = "Pikachu"
): TeamWithPokemon["team_pokemon"][number] {
  return {
    id,
    team_id: 1,
    pokemon_id: id,
    team_position: position,
    pokemon: {
      id,
      species,
      nickname: null,
      ability: "Static",
      nature: "Jolly",
      held_item: "Light Ball",
      gender: null,
      level: 50,
      is_shiny: false,
      tera_type: null,
      move1: "Thunderbolt",
      move2: "Volt Tackle",
      move3: null,
      move4: null,
      ev_hp: 0,
      ev_attack: 4,
      ev_defense: 0,
      ev_special_attack: 252,
      ev_special_defense: 0,
      ev_speed: 252,
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
    name: "My Team",
    format: "gen9vgc2026regi",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    is_public: false,
    description: null,
    fork_source_id: null,
    team_pokemon: [
      makePokemonEntry(1, 1, "Pikachu"),
      makePokemonEntry(2, 2, "Charizard"),
    ],
    ...overrides,
  } as TeamWithPokemon;
}

// =============================================================================
// Tests
// =============================================================================

describe("ExportMenu", () => {
  // Use a local spy variable so each test gets a fresh mock that survives
  // jest.clearAllMocks() (which resets calls but not the spy reference itself).
  let clipboardSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    clipboardSpy = jest
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    clipboardSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // Initial render
  // ---------------------------------------------------------------------------

  describe("initial render", () => {
    it("renders the Export trigger button", () => {
      render(<ExportMenu team={makeTeam()} />);
      expect(
        screen.getByRole("button", { name: /export/i })
      ).toBeInTheDocument();
    });

    it("does not show dropdown items before the button is clicked", () => {
      render(<ExportMenu team={makeTeam()} />);
      expect(
        screen.queryByText("Copy as Showdown text")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Open in Pokepaste")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Dropdown open
  // ---------------------------------------------------------------------------

  describe("dropdown menu", () => {
    it("shows 'Copy as Showdown text' after clicking Export", async () => {
      const user = userEvent.setup();
      render(<ExportMenu team={makeTeam()} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      expect(screen.getByText("Copy as Showdown text")).toBeInTheDocument();
    });

    it("shows 'Open in Pokepaste' after clicking Export", async () => {
      const user = userEvent.setup();
      render(<ExportMenu team={makeTeam()} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      expect(screen.getByText("Open in Pokepaste")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Copy as Showdown text
  // ---------------------------------------------------------------------------

  describe("Copy as Showdown text", () => {
    it("calls exportTeamToShowdown with the team's pokemon", async () => {
      const user = userEvent.setup();
      render(<ExportMenu team={makeTeam()} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText("Copy as Showdown text"));
      expect(exportTeamToShowdown).toHaveBeenCalled();
    });

    it("calls clipboard.writeText with the Showdown export text", async () => {
      const user = userEvent.setup();
      render(<ExportMenu team={makeTeam()} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText("Copy as Showdown text"));
      await waitFor(() => {
        expect(clipboardSpy).toHaveBeenCalledWith(
          "Pikachu @ Light Ball\nAbility: Static\n"
        );
      });
    });

    it("shows a success toast after copying", async () => {
      const user = userEvent.setup();
      render(<ExportMenu team={makeTeam()} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText("Copy as Showdown text"));
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Copied to clipboard!");
      });
    });

    it("shows an error toast when clipboard write fails", async () => {
      clipboardSpy.mockRejectedValue(new Error("denied"));
      const user = userEvent.setup();
      render(<ExportMenu team={makeTeam()} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText("Copy as Showdown text"));
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to copy — please copy manually."
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Open in Pokepaste
  // ---------------------------------------------------------------------------

  describe("Open in Pokepaste", () => {
    it("calls clipboard.writeText with the Showdown export text", async () => {
      const user = userEvent.setup();
      render(<ExportMenu team={makeTeam()} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText("Open in Pokepaste"));
      await waitFor(() => {
        expect(clipboardSpy).toHaveBeenCalledWith(
          "Pikachu @ Light Ball\nAbility: Static\n"
        );
      });
    });

    it("opens pokepast.es/create/ in a new tab after copying", async () => {
      const user = userEvent.setup();
      render(<ExportMenu team={makeTeam()} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText("Open in Pokepaste"));
      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith(
          "https://pokepast.es/create/",
          "_blank",
          "noopener"
        );
      });
    });

    it("shows a success toast after copying for Pokepaste", async () => {
      const user = userEvent.setup();
      render(<ExportMenu team={makeTeam()} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText("Open in Pokepaste"));
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Copied — paste it on Pokepaste."
        );
      });
    });

    it("shows an error toast and does not open a window when clipboard write fails", async () => {
      clipboardSpy.mockRejectedValue(new Error("denied"));
      const user = userEvent.setup();
      render(<ExportMenu team={makeTeam()} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText("Open in Pokepaste"));
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to copy — please copy manually."
        );
      });
      expect(mockOpen).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Team data transformation
  // ---------------------------------------------------------------------------

  describe("buildShowdownText — pokemon ordering and null guards", () => {
    it("sorts pokemon by team_position before passing to exportTeamToShowdown", async () => {
      const user = userEvent.setup();
      // Provide entries out of order
      const team = makeTeam({
        team_pokemon: [
          makePokemonEntry(2, 2, "Charizard"),
          makePokemonEntry(1, 1, "Pikachu"),
        ],
      });
      render(<ExportMenu team={team} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText("Copy as Showdown text"));
      await waitFor(() => {
        expect(exportTeamToShowdown).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ species: "Pikachu" }),
            expect.objectContaining({ species: "Charizard" }),
          ])
        );
      });
      // Verify Pikachu comes first in the call
      const callArg = (exportTeamToShowdown as jest.Mock).mock
        .calls[0]![0] as Array<{ species: string }>;
      expect(callArg[0]!.species).toBe("Pikachu");
      expect(callArg[1]!.species).toBe("Charizard");
    });

    it("skips team_pokemon entries with null pokemon", async () => {
      const user = userEvent.setup();
      const team = makeTeam({
        team_pokemon: [
          makePokemonEntry(1, 1, "Pikachu"),
          {
            id: 99,
            team_id: 1,
            pokemon_id: null,
            team_position: 2,
            pokemon: null,
          } as unknown as TeamWithPokemon["team_pokemon"][number],
        ],
      });
      render(<ExportMenu team={team} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText("Copy as Showdown text"));
      await waitFor(() => {
        const callArg = (exportTeamToShowdown as jest.Mock).mock
          .calls[0]![0] as unknown[];
        expect(callArg).toHaveLength(1);
      });
    });

    it("passes default values for null pokemon fields", async () => {
      const user = userEvent.setup();
      const team = makeTeam({
        team_pokemon: [
          {
            id: 1,
            team_id: 1,
            pokemon_id: 1,
            team_position: 1,
            pokemon: {
              id: 1,
              species: "Bulbasaur",
              nickname: null,
              ability: null,
              nature: null,
              held_item: null,
              gender: null,
              level: null,
              is_shiny: null,
              tera_type: null,
              move1: null,
              move2: null,
              move3: null,
              move4: null,
              ev_hp: null,
              ev_attack: null,
              ev_defense: null,
              ev_special_attack: null,
              ev_special_defense: null,
              ev_speed: null,
              iv_hp: null,
              iv_attack: null,
              iv_defense: null,
              iv_special_attack: null,
              iv_special_defense: null,
              iv_speed: null,
              notes: null,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          } as unknown as TeamWithPokemon["team_pokemon"][number],
        ],
      });
      render(<ExportMenu team={team} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText("Copy as Showdown text"));
      await waitFor(() => {
        const callArg = (exportTeamToShowdown as jest.Mock).mock
          .calls[0]![0] as Array<Record<string, unknown>>;
        expect(callArg[0]).toMatchObject({
          species: "Bulbasaur",
          ability: "",
          nature: "",
          level: 50,
          isShiny: false,
          evHp: 0,
          evAttack: 0,
          evDefense: 0,
          evSpecialAttack: 0,
          evSpecialDefense: 0,
          evSpeed: 0,
          ivHp: 31,
          ivAttack: 31,
          ivDefense: 31,
          ivSpecialAttack: 31,
          ivSpecialDefense: 31,
          ivSpeed: 31,
        });
      });
    });

    it("handles an empty team_pokemon array without throwing", async () => {
      const user = userEvent.setup();
      const team = makeTeam({ team_pokemon: [] });
      render(<ExportMenu team={team} />);
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText("Copy as Showdown text"));
      await waitFor(() => {
        expect(exportTeamToShowdown).toHaveBeenCalledWith([]);
      });
    });
  });
});
