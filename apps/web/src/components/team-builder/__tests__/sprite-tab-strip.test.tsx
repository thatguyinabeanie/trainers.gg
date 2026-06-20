"use client";

/**
 * Tests for SpriteTabStrip — the 6-tab horizontal carousel nav.
 *
 * The component calls `useSortable` internally, so every render must be
 * wrapped in `<DndContext><SortableContext items={itemIds} strategy={...}>`.
 * We mock `@dnd-kit/*` at the module level to avoid pointer-event setup while
 * still exercising the component's logic.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mock @dnd-kit/* — JSDOM has no pointer-event support; mock the DnD hooks and
// context components so we test the SpriteTabStrip's own logic, not DnD wiring.
// =============================================================================

jest.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    transform: null,
  }),
  closestCenter: jest.fn(),
}));

jest.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  horizontalListSortingStrategy: jest.fn(),
}));

jest.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => "",
    },
  },
}));

// =============================================================================
// Mock @trainers/pokemon — avoid real sprite + type-color data.
// =============================================================================

import type * as TrainersPokemon from "@trainers/pokemon";

const mockGetSpeciesTypes = jest.fn();
const mockGetTypeColor = jest.fn();

jest.mock("@trainers/pokemon", () => {
  const actual =
    jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    getSpeciesTypes: (...args: unknown[]) => mockGetSpeciesTypes(...args),
    getTypeColor: (...args: unknown[]) => mockGetTypeColor(...args),
  };
});

// =============================================================================
// Mock Sprite — avoids next/image + getPokemonSprite resolution.
// =============================================================================

jest.mock("../sprite", () => ({
  Sprite: ({
    species,
    size,
  }: {
    species: string;
    size?: number;
    types: unknown[];
  }) => (
    <img
      data-testid="sprite-img"
      alt={species}
      width={size ?? 32}
      height={size ?? 32}
    />
  ),
}));

// =============================================================================
// Import subject under test — after all mocks are in place.
// =============================================================================

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import { SpriteTabStrip } from "../shared/sprite-tab-strip";

// =============================================================================
// Helpers
// =============================================================================

function buildPokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Garchomp",
    ability: "Rough Skin",
    nature: "Jolly",
    move1: "Earthquake",
    move2: "Dragon Claw",
    move3: null,
    move4: null,
    ev_hp: 0,
    ev_attack: 252,
    ev_defense: 4,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 252,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    held_item: "Choice Scarf",
    nickname: null,
    notes: null,
    tera_type: null,
    is_shiny: null,
    gender: null,
    format_legal: null,
    created_at: null,
    ...overrides,
  };
}

const ITEM_IDS = ["id-0", "id-1", "id-2", "id-3", "id-4", "id-5"];

/** Renders SpriteTabStrip inside the required DnD context wrappers. */
function renderStrip(
  props: Partial<React.ComponentProps<typeof SpriteTabStrip>> & {
    slots?: (Tables<"pokemon"> | null)[];
  } = {}
) {
  const slots = props.slots ?? Array(6).fill(null);
  return render(
    <DndContext collisionDetection={closestCenter}>
      <SortableContext
        items={ITEM_IDS}
        strategy={horizontalListSortingStrategy}
      >
        <SpriteTabStrip
          slots={slots}
          activeIdx={props.activeIdx ?? 0}
          onActivate={props.onActivate ?? jest.fn()}
          itemIds={ITEM_IDS}
          errorsBySlot={props.errorsBySlot}
        />
      </SortableContext>
    </DndContext>
  );
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  // Default: no types → empty array, neutral color
  mockGetSpeciesTypes.mockReturnValue([]);
  mockGetTypeColor.mockReturnValue("#999");
});

// =============================================================================
// Tests
// =============================================================================

describe("SpriteTabStrip", () => {
  describe("rendering", () => {
    it("renders a toolbar with 6 slot buttons", () => {
      renderStrip();
      expect(screen.getByRole("toolbar")).toBeInTheDocument();
      // Each tab is a <button> — 6 tabs total
      expect(screen.getAllByRole("button")).toHaveLength(6);
    });

    it("renders slot numbers 01–06", () => {
      renderStrip();
      for (let i = 1; i <= 6; i++) {
        expect(
          screen.getByText(String(i).padStart(2, "0"))
        ).toBeInTheDocument();
      }
    });
  });

  describe("filled slots", () => {
    it("renders a sprite image for a filled slot", () => {
      const pokemon = buildPokemon({ species: "Garchomp" });
      const slots: (Tables<"pokemon"> | null)[] = [
        pokemon,
        ...Array(5).fill(null),
      ];
      renderStrip({ slots });
      expect(screen.getByTestId("sprite-img")).toBeInTheDocument();
    });

    it("uses the pokemon species as the sprite alt text", () => {
      const pokemon = buildPokemon({ species: "Pikachu" });
      const slots: (Tables<"pokemon"> | null)[] = [
        pokemon,
        ...Array(5).fill(null),
      ];
      renderStrip({ slots });
      expect(screen.getByAltText("Pikachu")).toBeInTheDocument();
    });

    it("renders an accessible aria-label with slot number and species for filled slots", () => {
      const pokemon = buildPokemon({ species: "Garchomp" });
      const slots: (Tables<"pokemon"> | null)[] = [
        pokemon,
        ...Array(5).fill(null),
      ];
      renderStrip({ slots, activeIdx: 0 });
      expect(screen.getByLabelText("Slot 01: Garchomp")).toBeInTheDocument();
    });
  });

  describe("empty slots", () => {
    it("renders the '+' placeholder for empty slots", () => {
      renderStrip();
      // All 6 slots are empty — 6 '+' elements, all aria-hidden
      const plusElements = screen
        .getAllByText("+")
        .filter((el) => el.getAttribute("aria-hidden") === "true");
      expect(plusElements).toHaveLength(6);
    });

    it("renders an accessible aria-label indicating empty for empty slots", () => {
      renderStrip({ activeIdx: 2 });
      // slot index 2 → "Slot 03: empty"
      expect(screen.getByLabelText("Slot 03: empty")).toBeInTheDocument();
    });
  });

  describe("active tab", () => {
    it("marks the active tab with aria-pressed='true'", () => {
      renderStrip({ activeIdx: 1 });
      const buttons = screen.getAllByRole("button");
      expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    });

    it("marks all other tabs with aria-pressed='false'", () => {
      renderStrip({ activeIdx: 2 });
      const buttons = screen.getAllByRole("button");
      for (let i = 0; i < 6; i++) {
        if (i !== 2) {
          expect(buttons[i]).toHaveAttribute("aria-pressed", "false");
        }
      }
    });
  });

  describe("interaction", () => {
    it("calls onActivate with the correct index when a tab is clicked", async () => {
      const onActivate = jest.fn();
      renderStrip({ onActivate, activeIdx: 0 });
      const buttons = screen.getAllByRole("button");
      await userEvent.click(buttons[3]!);
      expect(onActivate).toHaveBeenCalledWith(3);
    });

    it("calls onActivate(0) when the first tab is clicked", async () => {
      const onActivate = jest.fn();
      renderStrip({ onActivate, activeIdx: 3 });
      const buttons = screen.getAllByRole("button");
      await userEvent.click(buttons[0]!);
      expect(onActivate).toHaveBeenCalledWith(0);
    });

    it("calls onActivate(5) when the last tab is clicked", async () => {
      const onActivate = jest.fn();
      renderStrip({ onActivate });
      const buttons = screen.getAllByRole("button");
      await userEvent.click(buttons[5]!);
      expect(onActivate).toHaveBeenCalledWith(5);
    });
  });

  describe("error dot badge", () => {
    it("renders an error dot when the slot has errors", () => {
      const errorsBySlot = new Map([[2, ["some error"]]]);
      renderStrip({ errorsBySlot });
      expect(screen.getByLabelText("validation error")).toBeInTheDocument();
    });

    it("renders no error dot when errorsBySlot is absent", () => {
      renderStrip();
      expect(
        screen.queryByLabelText("validation error")
      ).not.toBeInTheDocument();
    });

    it("renders no error dot for a slot with an empty errors array", () => {
      const errorsBySlot = new Map([[0, []]]);
      renderStrip({ errorsBySlot });
      expect(
        screen.queryByLabelText("validation error")
      ).not.toBeInTheDocument();
    });

    it("renders one error dot per slot that has errors", () => {
      const errorsBySlot = new Map([
        [0, ["err1"]],
        [3, ["err2", "err3"]],
      ]);
      renderStrip({ errorsBySlot });
      expect(screen.getAllByLabelText("validation error")).toHaveLength(2);
    });

    it("renders error dot only on slots that have errors, not adjacent ones", () => {
      // Only slot 1 has an error
      const errorsBySlot = new Map([[1, ["error"]]]);
      renderStrip({ errorsBySlot });
      const dots = screen.getAllByLabelText("validation error");
      expect(dots).toHaveLength(1);
    });
  });

  describe("mixed filled and empty slots", () => {
    it("renders sprites for filled slots and '+' for empty slots", () => {
      const slots: (Tables<"pokemon"> | null)[] = [
        buildPokemon({ species: "Pikachu", id: 1 }),
        null,
        buildPokemon({ species: "Charizard", id: 2 }),
        null,
        null,
        null,
      ];
      renderStrip({ slots });
      expect(screen.getAllByTestId("sprite-img")).toHaveLength(2);
      const plusElements = screen
        .getAllByText("+")
        .filter((el) => el.getAttribute("aria-hidden") === "true");
      expect(plusElements).toHaveLength(4);
    });
  });
});
