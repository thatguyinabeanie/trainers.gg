import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, ...rest }: { alt: string } & Record<string, unknown>) => (
    <img alt={alt} {...rest} />
  ),
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn((_species: string) => ({
    url: "https://sprites.test/mock.png",
    w: 1,
    h: 1,
    pixelated: false,
  })),
}));

jest.mock("@trainers/pokemon", () => ({
  getFormatLabel: jest.fn((id: string) => `Format:${id}`),
}));

// Mock HoverCard primitives — Base UI PreviewCard uses portals and floating-ui
// positioning that do not function in JSDOM.  Replace with a thin stub that
// renders the trigger + popup inline so tests can assert on QuickLookContent.
jest.mock("@/components/ui/hover-card", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");

  function HoverCard({ children }: { children: React.ReactNode }) {
    return <div data-testid="hover-card">{children}</div>;
  }

  function HoverCardTrigger({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <div data-testid="hover-card-trigger" className={className}>
        {children}
      </div>
    );
  }

  function HoverCardContent({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <div data-testid="hover-card-content" className={className}>
        {children}
      </div>
    );
  }

  return { HoverCard, HoverCardTrigger, HoverCardContent };
});

// Mock Sheet primitives — Base UI Dialog has the same portalling constraints.
jest.mock("@/components/ui/sheet", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");

  function Sheet({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) {
    if (!open) return null;
    return <div data-testid="sheet">{children}</div>;
  }

  function SheetContent({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    side?: string;
  }) {
    return (
      <div data-testid="sheet-content" className={className}>
        {children}
      </div>
    );
  }

  function SheetHeader({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <div data-testid="sheet-header" className={className}>
        {children}
      </div>
    );
  }

  function SheetTitle({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <div data-testid="sheet-title" className={className}>
        {children}
      </div>
    );
  }

  return { Sheet, SheetContent, SheetHeader, SheetTitle };
});

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  toQuickLookData,
  type QuickLookData,
  type QuickLookSlot,
} from "../quick-look-shared";
import { QuickLookContent } from "../quick-look-content";
import { QuickLook } from "../quick-look";
import { QuickLookSheet } from "../quick-look-sheet";
import { type TeamWithPokemon } from "@trainers/supabase";
import { makeDraftRecord } from "./fixtures";

// =============================================================================
// Fixture helpers
// =============================================================================

function makePokemon(
  id: number,
  overrides: Partial<{
    species: string;
    ability: string;
    held_item: string | null;
    tera_type: string | null;
    move1: string | null;
    move2: string | null;
    move3: string | null;
    move4: string | null;
    is_shiny: boolean | null;
  }> = {}
): TeamWithPokemon["team_pokemon"][number]["pokemon"] {
  return {
    id,
    species: overrides.species ?? "Pikachu",
    ability: overrides.ability ?? "Static",
    held_item: overrides.held_item !== undefined ? overrides.held_item : null,
    tera_type: overrides.tera_type !== undefined ? overrides.tera_type : null,
    move1: overrides.move1 !== undefined ? overrides.move1 : "Thunderbolt",
    move2: overrides.move2 !== undefined ? overrides.move2 : null,
    move3: overrides.move3 !== undefined ? overrides.move3 : null,
    move4: overrides.move4 !== undefined ? overrides.move4 : null,
    nickname: null,
    notes: null,
    gender: null,
    nature: "Timid",
    is_shiny: overrides.is_shiny !== undefined ? overrides.is_shiny : false,
    level: 50,
    format_legal: null,
    created_at: "2024-01-01T00:00:00Z",
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
  };
}

function makeSlot(
  id: number,
  position: number,
  pokemonOverrides?: Parameters<typeof makePokemon>[1]
): TeamWithPokemon["team_pokemon"][number] {
  return {
    id,
    pokemon_id: id,
    team_position: position,
    pokemon: makePokemon(id, pokemonOverrides),
  } as TeamWithPokemon["team_pokemon"][number];
}

function makeNullSlot(
  id: number,
  position: number
): TeamWithPokemon["team_pokemon"][number] {
  return {
    id,
    pokemon_id: id,
    team_position: position,
    pokemon: null,
  } as TeamWithPokemon["team_pokemon"][number];
}

function makeRecord(
  overrides: Partial<{
    id: string;
    name: string;
    format: string | null;
    teamPokemon: TeamWithPokemon["team_pokemon"];
  }> = {}
) {
  return makeDraftRecord({
    id: overrides.id,
    team: {
      name: overrides.name !== undefined ? overrides.name : "My Team",
      ...(overrides.format !== undefined ? { format: overrides.format } : {}),
      ...(overrides.teamPokemon !== undefined
        ? { team_pokemon: overrides.teamPokemon }
        : {}),
    },
  });
}

/** Build a minimal QuickLookData fixture directly (for rendering tests). */
function makeQuickLookData(
  overrides: Partial<QuickLookData> = {}
): QuickLookData {
  return {
    id: "local-ab12",
    name: "My Team",
    format: "gen9vgc2026regi",
    slots: overrides.slots ?? [
      {
        species: "Incineroar",
        isShiny: false,
        ability: "Intimidate",
        heldItem: "Safety Goggles",
        teraType: "Fire",
        moves: ["Fake Out", "Flare Blitz", "Knock Off", "Parting Shot"],
      },
    ],
    ...overrides,
  };
}

function makeFullSlot(overrides: Partial<QuickLookSlot> = {}): QuickLookSlot {
  return {
    species: "Incineroar",
    isShiny: false,
    ability: "Intimidate",
    heldItem: "Safety Goggles",
    teraType: "Fire",
    moves: ["Fake Out", "Flare Blitz", "Knock Off", "Parting Shot"],
    ...overrides,
  };
}

// =============================================================================
// toQuickLookData
// =============================================================================

describe("toQuickLookData", () => {
  describe("empty team", () => {
    it("returns empty slots array when team_pokemon is empty", () => {
      const record = makeRecord({ teamPokemon: [] });
      const result = toQuickLookData(record);
      expect(result.slots).toEqual([]);
    });

    it("falls back to 'Untitled Team' when team.name is empty string", () => {
      const record = makeRecord({ name: "" });
      expect(toQuickLookData(record).name).toBe("Untitled Team");
    });

    it("falls back to 'Untitled Team' when team.name is whitespace only", () => {
      const record = makeRecord({ name: "   " });
      expect(toQuickLookData(record).name).toBe("Untitled Team");
    });

    it("trims whitespace from team.name", () => {
      const record = makeRecord({ name: "  Rain Core  " });
      expect(toQuickLookData(record).name).toBe("Rain Core");
    });
  });

  describe("passthrough fields", () => {
    it("passes id through from the record", () => {
      const record = makeRecord({ id: "local-zz99" });
      expect(toQuickLookData(record).id).toBe("local-zz99");
    });

    it("passes format through unchanged", () => {
      const record = makeRecord({ format: "gen9vgc2026regi" });
      expect(toQuickLookData(record).format).toBe("gen9vgc2026regi");
    });

    it("passes null format through unchanged", () => {
      const record = makeRecord({ format: null });
      expect(toQuickLookData(record).format).toBeNull();
    });
  });

  describe("filled-slots-only", () => {
    it("excludes null-pokemon slots", () => {
      const record = makeRecord({
        teamPokemon: [
          makeSlot(1, 0, { species: "Bulbasaur" }),
          makeNullSlot(2, 1),
          makeSlot(3, 2, { species: "Squirtle" }),
        ],
      });
      const result = toQuickLookData(record);
      expect(result.slots).toHaveLength(2);
      expect(result.slots[0]?.species).toBe("Bulbasaur");
      expect(result.slots[1]?.species).toBe("Squirtle");
    });
  });

  describe("slot ordering", () => {
    it("orders slots by team_position ascending regardless of input order", () => {
      const record = makeRecord({
        teamPokemon: [
          makeSlot(10, 2, { species: "Charizard" }),
          makeSlot(11, 0, { species: "Pikachu" }),
          makeSlot(12, 1, { species: "Eevee" }),
        ],
      });
      const result = toQuickLookData(record);
      expect(result.slots.map((s) => s.species)).toEqual([
        "Pikachu",
        "Eevee",
        "Charizard",
      ]);
    });
  });

  describe("moves filtering", () => {
    it("includes only non-null move strings", () => {
      const record = makeRecord({
        teamPokemon: [
          makeSlot(1, 0, {
            move1: "Fake Out",
            move2: null,
            move3: "Flare Blitz",
            move4: null,
          }),
        ],
      });
      const result = toQuickLookData(record);
      expect(result.slots[0]?.moves).toEqual(["Fake Out", "Flare Blitz"]);
    });

    it("returns empty moves array when all moves are null", () => {
      const record = makeRecord({
        teamPokemon: [
          makeSlot(1, 0, {
            move1: null,
            move2: null,
            move3: null,
            move4: null,
          }),
        ],
      });
      expect(toQuickLookData(record).slots[0]?.moves).toEqual([]);
    });

    it("preserves move order (move1..move4)", () => {
      const record = makeRecord({
        teamPokemon: [
          makeSlot(1, 0, {
            move1: "A",
            move2: "B",
            move3: "C",
            move4: "D",
          }),
        ],
      });
      expect(toQuickLookData(record).slots[0]?.moves).toEqual([
        "A",
        "B",
        "C",
        "D",
      ]);
    });
  });

  describe("shiny flag", () => {
    it.each<[boolean | null, boolean]>([
      [null, false],
      [false, false],
      [true, true],
    ])(
      "maps is_shiny=%s to isShiny=%s",
      (isShiny, expected) => {
        const record = makeRecord({
          teamPokemon: [makeSlot(1, 0, { is_shiny: isShiny })],
        });
        expect(toQuickLookData(record).slots[0]?.isShiny).toBe(expected);
      }
    );
  });

  describe("item / ability / tera", () => {
    it("maps held_item, ability, and tera_type correctly", () => {
      const record = makeRecord({
        teamPokemon: [
          makeSlot(1, 0, {
            held_item: "Safety Goggles",
            ability: "Intimidate",
            tera_type: "Fire",
          }),
        ],
      });
      const slot = toQuickLookData(record).slots[0];
      expect(slot?.heldItem).toBe("Safety Goggles");
      expect(slot?.ability).toBe("Intimidate");
      expect(slot?.teraType).toBe("Fire");
    });

    it("returns null for missing item/ability/tera", () => {
      const record = makeRecord({
        teamPokemon: [
          makeSlot(1, 0, {
            held_item: null,
            ability: "Static",
            tera_type: null,
          }),
        ],
      });
      const slot = toQuickLookData(record).slots[0];
      expect(slot?.heldItem).toBeNull();
      expect(slot?.teraType).toBeNull();
    });
  });
});

// =============================================================================
// QuickLookContent
// =============================================================================

describe("QuickLookContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("filled slots", () => {
    it("renders the species name", () => {
      render(
        <QuickLookContent data={makeQuickLookData()} />
      );
      expect(screen.getByText("Incineroar")).toBeInTheDocument();
    });

    it("renders the held item with @ prefix", () => {
      render(
        <QuickLookContent data={makeQuickLookData()} />
      );
      expect(screen.getByTestId("ql-item")).toHaveTextContent(
        "@ Safety Goggles"
      );
    });

    it("renders the ability", () => {
      render(
        <QuickLookContent data={makeQuickLookData()} />
      );
      expect(screen.getByTestId("ql-ability")).toHaveTextContent("Intimidate");
    });

    it("renders the tera type with 'Tera:' prefix", () => {
      render(
        <QuickLookContent data={makeQuickLookData()} />
      );
      expect(screen.getByTestId("ql-tera")).toHaveTextContent("Tera: Fire");
    });

    it("renders all four moves", () => {
      render(
        <QuickLookContent data={makeQuickLookData()} />
      );
      const moves = screen.getAllByTestId("ql-move");
      expect(moves).toHaveLength(4);
      expect(moves[0]).toHaveTextContent("Fake Out");
      expect(moves[1]).toHaveTextContent("Flare Blitz");
      expect(moves[2]).toHaveTextContent("Knock Off");
      expect(moves[3]).toHaveTextContent("Parting Shot");
    });

    it("does not render item row when heldItem is null", () => {
      const data = makeQuickLookData({
        slots: [makeFullSlot({ heldItem: null })],
      });
      render(<QuickLookContent data={data} />);
      expect(screen.queryByTestId("ql-item")).not.toBeInTheDocument();
    });

    it("does not render tera row when teraType is null", () => {
      const data = makeQuickLookData({
        slots: [makeFullSlot({ teraType: null })],
      });
      render(<QuickLookContent data={data} />);
      expect(screen.queryByTestId("ql-tera")).not.toBeInTheDocument();
    });

    it("does not render moves list when moves array is empty", () => {
      const data = makeQuickLookData({
        slots: [makeFullSlot({ moves: [] })],
      });
      render(<QuickLookContent data={data} />);
      expect(screen.queryByTestId("ql-move")).not.toBeInTheDocument();
    });
  });

  describe("empty slot placeholders", () => {
    it("renders 6 empty-slot placeholders when no slots are filled", () => {
      const data = makeQuickLookData({ slots: [] });
      render(<QuickLookContent data={data} />);
      // All 6 placeholders should appear (aria-hidden)
      const placeholders = screen
        .getAllByText("Empty slot")
        .filter((el) => el.closest("[aria-hidden]"));
      expect(placeholders).toHaveLength(6);
    });

    it("renders the correct number of empty placeholders for a partial team", () => {
      const data = makeQuickLookData({
        slots: [
          makeFullSlot({ species: "Incineroar" }),
          makeFullSlot({ species: "Rillaboom" }),
        ],
      });
      render(<QuickLookContent data={data} />);
      const placeholders = screen.getAllByText("Empty slot");
      expect(placeholders).toHaveLength(4);
    });

    it("renders no empty placeholders for a full 6-slot team", () => {
      const slots = Array.from({ length: 6 }, (_, i) =>
        makeFullSlot({ species: `Pokemon${i}` })
      );
      const data = makeQuickLookData({ slots });
      render(<QuickLookContent data={data} />);
      expect(screen.queryByText("Empty slot")).not.toBeInTheDocument();
    });
  });

  describe("sprite rendering", () => {
    it("renders a sprite image for each filled slot", () => {
      const data = makeQuickLookData({
        slots: [
          makeFullSlot({ species: "Incineroar" }),
          makeFullSlot({ species: "Rillaboom" }),
        ],
      });
      render(<QuickLookContent data={data} />);
      const imgs = screen.getAllByRole("img");
      expect(imgs.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// =============================================================================
// QuickLook (desktop hovercard)
// =============================================================================

describe("QuickLook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the trigger children", () => {
    render(
      <QuickLook data={makeQuickLookData()}>
        <span>Trigger content</span>
      </QuickLook>
    );
    expect(screen.getByText("Trigger content")).toBeInTheDocument();
  });

  it("renders the team name in the hovercard content", () => {
    render(
      <QuickLook data={makeQuickLookData({ name: "My Rain Team" })}>
        <span>Trigger</span>
      </QuickLook>
    );
    // The hovercard content area shows the name header
    const content = screen.getByTestId("hover-card-content");
    expect(content).toHaveTextContent("My Rain Team");
  });

  it("renders QuickLookContent inside the hovercard", () => {
    render(
      <QuickLook data={makeQuickLookData()}>
        <span>Trigger</span>
      </QuickLook>
    );
    // QuickLookContent renders the ability — verify it's inside the card
    expect(screen.getByTestId("ql-ability")).toBeInTheDocument();
  });

  it("wraps the trigger in a hover-card-trigger element", () => {
    render(
      <QuickLook data={makeQuickLookData()}>
        <span data-testid="child">Row</span>
      </QuickLook>
    );
    const trigger = screen.getByTestId("hover-card-trigger");
    expect(trigger).toContainElement(screen.getByTestId("child"));
  });
});

// =============================================================================
// QuickLookSheet (mobile bottom-sheet)
// =============================================================================

describe("QuickLookSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("when open=false", () => {
    it("does not render the sheet content", () => {
      render(
        <QuickLookSheet
          data={makeQuickLookData()}
          open={false}
          onOpenChange={jest.fn()}
        />
      );
      expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
    });
  });

  describe("when open=true", () => {
    it("renders the team name in the sheet title", () => {
      render(
        <QuickLookSheet
          data={makeQuickLookData({ name: "Trick Room Core" })}
          open={true}
          onOpenChange={jest.fn()}
        />
      );
      expect(screen.getByTestId("sheet-title")).toHaveTextContent(
        "Trick Room Core"
      );
    });

    it("renders QuickLookContent inside the sheet", () => {
      render(
        <QuickLookSheet
          data={makeQuickLookData()}
          open={true}
          onOpenChange={jest.fn()}
        />
      );
      expect(screen.getByTestId("ql-ability")).toBeInTheDocument();
    });

    it("renders all filled slot species names", () => {
      const data = makeQuickLookData({
        slots: [
          makeFullSlot({ species: "Incineroar" }),
          makeFullSlot({ species: "Rillaboom" }),
        ],
      });
      render(
        <QuickLookSheet data={data} open={true} onOpenChange={jest.fn()} />
      );
      expect(screen.getByText("Incineroar")).toBeInTheDocument();
      expect(screen.getByText("Rillaboom")).toBeInTheDocument();
    });
  });

  describe("conditional-mount sanity", () => {
    it("mounts when open transitions from false to true", () => {
      const { rerender } = render(
        <QuickLookSheet
          data={makeQuickLookData()}
          open={false}
          onOpenChange={jest.fn()}
        />
      );
      expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();

      rerender(
        <QuickLookSheet
          data={makeQuickLookData()}
          open={true}
          onOpenChange={jest.fn()}
        />
      );
      expect(screen.getByTestId("sheet")).toBeInTheDocument();
    });

    it("unmounts when open transitions from true to false", () => {
      const { rerender } = render(
        <QuickLookSheet
          data={makeQuickLookData()}
          open={true}
          onOpenChange={jest.fn()}
        />
      );
      expect(screen.getByTestId("sheet")).toBeInTheDocument();

      rerender(
        <QuickLookSheet
          data={makeQuickLookData()}
          open={false}
          onOpenChange={jest.fn()}
        />
      );
      expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
    });
  });
});
