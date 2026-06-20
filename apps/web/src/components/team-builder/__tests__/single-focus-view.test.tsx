"use client";

/**
 * Tests for SingleFocusView — the carousel that hosts one FocusCard/CalcVersusView
 * at a time, with dot/arrow nav, keyboard nav, and an empty-slot CTA picker.
 *
 * Strategy: mock all heavy child components to lightweight stubs, mock dnd-kit
 * (same pattern as sprite-tab-strip.test.tsx), and mock useCalcStateContext to
 * control the FocusCard vs CalcVersusView branch.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mock @dnd-kit/* — JSDOM has no pointer-event support; mirrors the
// sprite-tab-strip pattern exactly.
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
// Mock SpriteTabStrip — stub that just renders a testid
// =============================================================================

jest.mock("../shared/sprite-tab-strip", () => ({
  SpriteTabStrip: () => <div data-testid="sprite-tab-strip" />,
}));

// =============================================================================
// Mock FocusCard — stub that renders a testid so we can assert the branch
// =============================================================================

jest.mock("../layouts/focus-card", () => ({
  FocusCard: ({ pokemon }: { pokemon: { species?: string | null } }) => (
    <div data-testid="focus-card" data-species={pokemon.species ?? ""} />
  ),
}));

// =============================================================================
// Mock CalcVersusView — stub
// =============================================================================

jest.mock("../layouts/calc-versus-view", () => ({
  CalcVersusView: ({ pokemon }: { pokemon: { species?: string | null } }) => (
    <div data-testid="calc-versus-view" data-species={pokemon.species ?? ""} />
  ),
}));

// =============================================================================
// Mock SpeciesPickerDialog — stub that exposes a button to trigger onPick
// =============================================================================

jest.mock("../pickers/species-picker-dialog", () => ({
  SpeciesPickerDialog: ({
    open,
    onPick,
  }: {
    open: boolean;
    onPick: (species: string) => void;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="species-picker-dialog">
        <button
          data-testid="pick-species-btn"
          onClick={() => onPick("Garchomp")}
        >
          Pick Garchomp
        </button>
      </div>
    ) : null,
}));

// =============================================================================
// Mock useCalcStateContext — controllable via mockCalcEnabled
// =============================================================================

let mockCalcEnabled = false;

jest.mock("../calc/calc-state-context", () => ({
  useCalcStateContext: () => ({
    calcEnabled: mockCalcEnabled,
    defenderSpecies: "",
    moveCalcOutputs: [null, null, null, null],
    field: {
      doubles: true,
      tailwind: false,
      foesAlive: 2,
      allyAlive: 2,
      atkTera: false,
    },
    setField: jest.fn(),
  }),
}));

// =============================================================================
// Mock identity-layout-props — filterCurrentTeam is pure util; stub avoids
// importing heavy pokemon barrel in test.
// =============================================================================

jest.mock("../shared/identity-layout-props", () => ({
  filterCurrentTeam: (slots: Array<{ species: string | null }>) =>
    slots.map((s) => ({ species: s.species ?? "" })),
}));

// =============================================================================
// Import subject under test — after all mocks are declared
// =============================================================================

import { SingleFocusView } from "../layouts/single-focus-view";
import { type ValidationError } from "../validation-hooks";

// =============================================================================
// Test fixtures
// =============================================================================

const ITEM_IDS = [
  "__empty__0",
  "__empty__1",
  "__empty__2",
  "__empty__3",
  "__empty__4",
  "__empty__5",
];

/** Minimal Tables<"pokemon"> row */
function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Garchomp",
    ability: "Rough Skin",
    nature: "Jolly",
    move1: "Earthquake",
    move2: null,
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
    held_item: null,
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

/** Build a 6-slot array with a pokemon at the given index, rest null */
function slotsWithPokemonAt(
  idx: number,
  pokemon: Tables<"pokemon"> = makePokemon()
): (Tables<"pokemon"> | null)[] {
  return Array.from({ length: 6 }, (_, i) => (i === idx ? pokemon : null));
}

/** All-null slots */
const EMPTY_SLOTS: (Tables<"pokemon"> | null)[] = Array(6).fill(null);

interface RenderProps {
  slots?: (Tables<"pokemon"> | null)[];
  activeIdx?: number;
  onActivate?: jest.Mock;
  onAdd?: jest.Mock;
  onRemove?: jest.Mock;
  onPokemonUpdate?: jest.Mock;
  errorsBySlot?: Map<number, ValidationError[]>;
}

function renderView({
  slots = EMPTY_SLOTS,
  activeIdx = 0,
  onActivate = jest.fn(),
  onAdd = jest.fn(),
  onRemove = jest.fn(),
  onPokemonUpdate = jest.fn(),
  errorsBySlot,
}: RenderProps = {}) {
  return render(
    <SingleFocusView
      slots={slots}
      activeIdx={activeIdx}
      onActivate={onActivate}
      itemIds={ITEM_IDS}
      format={undefined}
      onAdd={onAdd}
      onRemove={onRemove}
      onPokemonUpdate={onPokemonUpdate}
      errorsBySlot={errorsBySlot}
    />
  );
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  mockCalcEnabled = false;
});

// =============================================================================
// Tests
// =============================================================================

describe("SingleFocusView", () => {
  // ---------------------------------------------------------------------------
  // Filled slot — calcEnabled = false → FocusCard, not CalcVersusView
  // ---------------------------------------------------------------------------
  describe("filled active slot", () => {
    it("renders FocusCard (not CalcVersusView) when calcEnabled=false", () => {
      mockCalcEnabled = false;
      renderView({ slots: slotsWithPokemonAt(0), activeIdx: 0 });

      expect(screen.getByTestId("focus-card")).toBeInTheDocument();
      expect(screen.queryByTestId("calc-versus-view")).not.toBeInTheDocument();
    });

    it("renders CalcVersusView (not FocusCard) when calcEnabled=true", () => {
      mockCalcEnabled = true;
      renderView({ slots: slotsWithPokemonAt(0), activeIdx: 0 });

      expect(screen.getByTestId("calc-versus-view")).toBeInTheDocument();
      expect(screen.queryByTestId("focus-card")).not.toBeInTheDocument();
    });

    it("passes the active pokemon species to FocusCard", () => {
      mockCalcEnabled = false;
      const pokemon = makePokemon({ species: "Pikachu" });
      renderView({ slots: slotsWithPokemonAt(2, pokemon), activeIdx: 2 });

      expect(screen.getByTestId("focus-card")).toHaveAttribute(
        "data-species",
        "Pikachu"
      );
    });

    it("passes the active pokemon species to CalcVersusView when calc is on", () => {
      mockCalcEnabled = true;
      const pokemon = makePokemon({ species: "Mewtwo", id: 99 });
      renderView({ slots: slotsWithPokemonAt(3, pokemon), activeIdx: 3 });

      expect(screen.getByTestId("calc-versus-view")).toHaveAttribute(
        "data-species",
        "Mewtwo"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Empty active slot — "+ Add Pokémon" CTA
  // ---------------------------------------------------------------------------
  describe("empty active slot", () => {
    it("renders the Add Pokémon CTA when the active slot is empty", () => {
      renderView({ slots: EMPTY_SLOTS, activeIdx: 0 });

      // The accessible button in EmptySlotCenterpiece
      expect(
        screen.getByRole("button", { name: /add pokémon to this slot/i })
      ).toBeInTheDocument();

      // Neither FocusCard nor CalcVersusView should appear
      expect(screen.queryByTestId("focus-card")).not.toBeInTheDocument();
      expect(screen.queryByTestId("calc-versus-view")).not.toBeInTheDocument();
    });

    it("opens the SpeciesPickerDialog when the Add Pokémon CTA is clicked", async () => {
      renderView({ slots: EMPTY_SLOTS, activeIdx: 0 });

      // Dialog not open initially
      expect(
        screen.queryByTestId("species-picker-dialog")
      ).not.toBeInTheDocument();

      const ctaButton = screen.getByRole("button", {
        name: /add pokémon to this slot/i,
      });
      await userEvent.click(ctaButton);

      expect(screen.getByTestId("species-picker-dialog")).toBeInTheDocument();
    });

    it("calls onAdd(activeIdx, species) when a species is picked from the dialog", async () => {
      const onAdd = jest.fn();
      renderView({ slots: EMPTY_SLOTS, activeIdx: 2, onAdd });

      const ctaButton = screen.getByRole("button", {
        name: /add pokémon to this slot/i,
      });
      await userEvent.click(ctaButton);

      // The stub dialog renders a "Pick Garchomp" button that calls onPick("Garchomp")
      const pickBtn = screen.getByTestId("pick-species-btn");
      await userEvent.click(pickBtn);

      expect(onAdd).toHaveBeenCalledWith(2, "Garchomp");
    });

    it("closes the species picker after a pick", async () => {
      renderView({ slots: EMPTY_SLOTS, activeIdx: 0 });

      await userEvent.click(
        screen.getByRole("button", { name: /add pokémon to this slot/i })
      );
      expect(screen.getByTestId("species-picker-dialog")).toBeInTheDocument();

      await userEvent.click(screen.getByTestId("pick-species-btn"));

      // Dialog should unmount after the pick
      expect(
        screen.queryByTestId("species-picker-dialog")
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // SpriteTabStrip is always rendered
  // ---------------------------------------------------------------------------
  describe("sprite tab strip", () => {
    it("renders SpriteTabStrip regardless of slot content", () => {
      renderView({ slots: EMPTY_SLOTS });
      expect(screen.getByTestId("sprite-tab-strip")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Dot indicators
  // ---------------------------------------------------------------------------
  describe("dot position indicators", () => {
    it("renders 6 dot buttons", () => {
      renderView();
      const dots = screen.getAllByRole("button", { name: /go to slot/i });
      expect(dots).toHaveLength(6);
    });

    it("renders dot buttons labelled Go to slot 1 through Go to slot 6", () => {
      renderView();
      for (let i = 1; i <= 6; i++) {
        expect(
          screen.getByRole("button", { name: `Go to slot ${i}` })
        ).toBeInTheDocument();
      }
    });

    it("marks the active slot's dot as aria-pressed=true", () => {
      renderView({ activeIdx: 3 });
      const dots = screen.getAllByRole("button", { name: /go to slot/i });
      expect(dots[3]).toHaveAttribute("aria-pressed", "true");
    });

    it("marks inactive dots as aria-pressed=false", () => {
      renderView({ activeIdx: 1 });
      const dots = screen.getAllByRole("button", { name: /go to slot/i });
      for (let i = 0; i < 6; i++) {
        if (i !== 1) {
          expect(dots[i]).toHaveAttribute("aria-pressed", "false");
        }
      }
    });

    it("calls onActivate with the correct index when a dot is clicked", async () => {
      const onActivate = jest.fn();
      renderView({ onActivate, activeIdx: 0 });
      const dots = screen.getAllByRole("button", { name: /go to slot/i });
      await userEvent.click(dots[4]!);
      expect(onActivate).toHaveBeenCalledWith(4);
    });

    it.each([
      [0, 0, false], // already at 0, clicking dot 0 does NOT call onActivate (same idx)
      [2, 5, true], // different idx → calls onActivate
    ])(
      "activeIdx=%i dot=%i → onActivate called=%s",
      async (activeIdx, dotIdx, shouldCall) => {
        const onActivate = jest.fn();
        renderView({ onActivate, activeIdx });
        const dots = screen.getAllByRole("button", { name: /go to slot/i });
        await userEvent.click(dots[dotIdx]!);
        if (shouldCall) {
          expect(onActivate).toHaveBeenCalledWith(dotIdx);
        } else {
          expect(onActivate).not.toHaveBeenCalled();
        }
      }
    );
  });

  // ---------------------------------------------------------------------------
  // Arrow nav buttons
  // ---------------------------------------------------------------------------
  describe("arrow navigation buttons", () => {
    it("renders a Previous and a Next button", () => {
      renderView({ activeIdx: 2 });
      expect(
        screen.getByRole("button", { name: /previous pokémon slot/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /next pokémon slot/i })
      ).toBeInTheDocument();
    });

    it("Previous button is disabled at slot 0", () => {
      renderView({ activeIdx: 0 });
      expect(
        screen.getByRole("button", { name: /previous pokémon slot/i })
      ).toBeDisabled();
    });

    it("Next button is disabled at slot 5", () => {
      renderView({ activeIdx: 5 });
      expect(
        screen.getByRole("button", { name: /next pokémon slot/i })
      ).toBeDisabled();
    });

    it("Previous button is enabled when activeIdx > 0", () => {
      renderView({ activeIdx: 3 });
      expect(
        screen.getByRole("button", { name: /previous pokémon slot/i })
      ).not.toBeDisabled();
    });

    it("Next button is enabled when activeIdx < 5", () => {
      renderView({ activeIdx: 3 });
      expect(
        screen.getByRole("button", { name: /next pokémon slot/i })
      ).not.toBeDisabled();
    });

    it("clicking Next calls onActivate(activeIdx + 1)", async () => {
      const onActivate = jest.fn();
      renderView({ onActivate, activeIdx: 2 });
      await userEvent.click(
        screen.getByRole("button", { name: /next pokémon slot/i })
      );
      expect(onActivate).toHaveBeenCalledWith(3);
    });

    it("clicking Previous calls onActivate(activeIdx - 1)", async () => {
      const onActivate = jest.fn();
      renderView({ onActivate, activeIdx: 4 });
      await userEvent.click(
        screen.getByRole("button", { name: /previous pokémon slot/i })
      );
      expect(onActivate).toHaveBeenCalledWith(3);
    });

    it("clicking Previous at slot 0 does NOT call onActivate (clamped)", async () => {
      const onActivate = jest.fn();
      renderView({ onActivate, activeIdx: 0 });
      // The button is disabled, so clicking it should not fire
      const prevBtn = screen.getByRole("button", {
        name: /previous pokémon slot/i,
      });
      expect(prevBtn).toBeDisabled();
      // Confirm disabled by firing click via fireEvent (disabled buttons swallow userEvent clicks)
      fireEvent.click(prevBtn);
      expect(onActivate).not.toHaveBeenCalled();
    });

    it("clicking Next at slot 5 does NOT call onActivate (clamped)", async () => {
      const onActivate = jest.fn();
      renderView({ onActivate, activeIdx: 5 });
      const nextBtn = screen.getByRole("button", {
        name: /next pokémon slot/i,
      });
      expect(nextBtn).toBeDisabled();
      fireEvent.click(nextBtn);
      expect(onActivate).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Keyboard navigation (ArrowLeft / ArrowRight on the stage)
  // ---------------------------------------------------------------------------
  describe("keyboard navigation", () => {
    it("ArrowRight on the stage calls onActivate(activeIdx + 1)", () => {
      const onActivate = jest.fn();
      renderView({ onActivate, activeIdx: 1 });

      const stage = screen.getByLabelText(/pokémon slot carousel/i);

      fireEvent.keyDown(stage, { key: "ArrowRight" });
      expect(onActivate).toHaveBeenCalledWith(2);
    });

    it("ArrowLeft on the stage calls onActivate(activeIdx - 1)", () => {
      const onActivate = jest.fn();
      renderView({ onActivate, activeIdx: 3 });

      const stage = screen.getByLabelText(/pokémon slot carousel/i);
      fireEvent.keyDown(stage, { key: "ArrowLeft" });
      expect(onActivate).toHaveBeenCalledWith(2);
    });

    it("ArrowRight does NOT call onActivate when at slot 5 (clamped)", () => {
      const onActivate = jest.fn();
      renderView({ onActivate, activeIdx: 5 });

      const stage = screen.getByLabelText(/pokémon slot carousel/i);
      fireEvent.keyDown(stage, { key: "ArrowRight" });
      expect(onActivate).not.toHaveBeenCalled();
    });

    it("ArrowLeft does NOT call onActivate when at slot 0 (clamped)", () => {
      const onActivate = jest.fn();
      renderView({ onActivate, activeIdx: 0 });

      const stage = screen.getByLabelText(/pokémon slot carousel/i);
      fireEvent.keyDown(stage, { key: "ArrowLeft" });
      expect(onActivate).not.toHaveBeenCalled();
    });

    it("ArrowRight does NOT call onActivate when an input is focused", () => {
      const onActivate = jest.fn();
      renderView({ onActivate, activeIdx: 1 });

      const stage = screen.getByLabelText(/pokémon slot carousel/i);

      // Append a real input inside the stage and dispatch the key event FROM it.
      // handleKeyDown checks e.target.tagName, so the event must originate from
      // the input — not from the stage div with a spoofed target property.
      const inputEl = document.createElement("input");
      stage.appendChild(inputEl);
      fireEvent.keyDown(inputEl, { key: "ArrowRight", bubbles: true });
      expect(onActivate).not.toHaveBeenCalled();
      inputEl.remove();
    });

    it("ArrowLeft does NOT call onActivate when a textarea is focused", () => {
      const onActivate = jest.fn();
      renderView({ onActivate, activeIdx: 2 });

      const stage = screen.getByLabelText(/pokémon slot carousel/i);
      const textarea = document.createElement("textarea");
      stage.appendChild(textarea);
      fireEvent.keyDown(textarea, { key: "ArrowLeft", bubbles: true });
      expect(onActivate).not.toHaveBeenCalled();
      textarea.remove();
    });

    it("other keys do NOT call onActivate", () => {
      const onActivate = jest.fn();
      renderView({ onActivate, activeIdx: 2 });

      const stage = screen.getByLabelText(/pokémon slot carousel/i);
      fireEvent.keyDown(stage, { key: "Enter" });
      fireEvent.keyDown(stage, { key: "Escape" });
      fireEvent.keyDown(stage, { key: "Tab" });
      expect(onActivate).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Transition state tracking (slideDir / animKey)
  // ---------------------------------------------------------------------------
  describe("transition tracking", () => {
    it("does not crash when activeIdx changes (re-render)", () => {
      const { rerender } = renderView({ activeIdx: 0 });
      expect(() => {
        rerender(
          <SingleFocusView
            slots={EMPTY_SLOTS}
            activeIdx={2}
            onActivate={jest.fn()}
            itemIds={ITEM_IDS}
            format={undefined}
            onAdd={jest.fn()}
            onRemove={jest.fn()}
            onPokemonUpdate={jest.fn()}
          />
        );
      }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Mixed slots: active filled slot + surrounding empty slots
  // ---------------------------------------------------------------------------
  describe("mixed slots", () => {
    it("shows FocusCard when active slot is filled, not the Add CTA", () => {
      mockCalcEnabled = false;
      const slots: (Tables<"pokemon"> | null)[] = [
        null,
        makePokemon({ id: 2, species: "Pikachu" }),
        null,
        null,
        null,
        null,
      ];
      renderView({ slots, activeIdx: 1 });

      expect(screen.getByTestId("focus-card")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /add pokémon to this slot/i })
      ).not.toBeInTheDocument();
    });

    it("shows Add CTA when navigating to an empty slot adjacent to filled ones", () => {
      const slots: (Tables<"pokemon"> | null)[] = [
        makePokemon({ id: 1 }),
        null,
        null,
        null,
        null,
        null,
      ];
      renderView({ slots, activeIdx: 1 });

      expect(
        screen.getByRole("button", { name: /add pokémon to this slot/i })
      ).toBeInTheDocument();
      expect(screen.queryByTestId("focus-card")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // errorsBySlot forwarded — no direct assertion on child (stub) but verifies
  // render doesn't crash with validation errors present
  // ---------------------------------------------------------------------------
  describe("errorsBySlot", () => {
    it("renders without crashing when errorsBySlot has errors for the active slot", () => {
      const errors = new Map<number, ValidationError[]>([
        [
          0,
          [
            {
              field: "species",
              message: "Missing species",
              severity: "error",
              pokemonId: 1,
              pokemonName: "Garchomp",
            },
          ],
        ],
      ]);
      expect(() => {
        renderView({
          slots: slotsWithPokemonAt(0),
          activeIdx: 0,
          errorsBySlot: errors,
        });
      }).not.toThrow();
    });
  });
});
