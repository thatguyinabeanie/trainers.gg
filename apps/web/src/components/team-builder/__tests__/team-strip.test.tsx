import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

const mockRefresh = jest.fn();
const mockRouterPush = jest.fn();

const mockInvalidateQueries = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(() => ({
    invalidateQueries: mockInvalidateQueries,
  })),
}));

jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(() => ({})),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: mockRouterPush,
    refresh: mockRefresh,
  })),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    ...rest
  }: {
    src: string;
    alt: string;
  } & Record<string, unknown>) => <img src={src} alt={alt} {...rest} />,
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn((_species: string) => ({
    url: "https://example.com/sprite.png",
    w: 96,
    h: 96,
    pixelated: false,
  })),
}));

const mockReorderTeamPokemonAction = jest
  .fn()
  .mockResolvedValue({ success: true });
const mockRemovePokemonFromTeamAction = jest
  .fn()
  .mockResolvedValue({ success: true });

jest.mock("@/actions/teams", () => ({
  reorderTeamPokemonAction: (...args: unknown[]) =>
    mockReorderTeamPokemonAction(...args),
  removePokemonFromTeamAction: (...args: unknown[]) =>
    mockRemovePokemonFromTeamAction(...args),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
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

import { TeamStrip } from "../team-strip";
import { type TeamWithPokemon } from "@trainers/supabase";
import { type ValidationError } from "../validation-hooks";
import { toast } from "sonner";

// =============================================================================
// Factories
// =============================================================================

function makePokemonEntry(
  id: number,
  position: number,
  species = "Pikachu",
  options: {
    heldItem?: string;
    nickname?: string;
    gender?: "Male" | "Female" | null;
    isShiny?: boolean;
    noPokemon?: boolean;
  } = {}
): TeamWithPokemon["team_pokemon"][number] {
  return {
    id,
    team_id: 1,
    pokemon_id: id,
    team_position: position,
    pokemon: options.noPokemon
      ? null
      : {
          id,
          species,
          is_shiny: options.isShiny ?? false,
          ability: "Static",
          nature: "Jolly",
          held_item: options.heldItem ?? null,
          nickname: options.nickname ?? null,
          gender: options.gender ?? null,
          level: 50,
          move1: "Thunderbolt",
          move2: null,
          move3: null,
          move4: null,
          tera_type: null,
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
  } as TeamWithPokemon["team_pokemon"][number];
}

/** Build a minimal ValidationError for a pokemon id. */
function makeValidationError(
  pokemonId: number,
  severity: "error" | "warning" = "error"
): ValidationError {
  return {
    pokemonId,
    pokemonName: "Pikachu",
    field: "species",
    message: "Test error",
    severity,
  };
}

/** Helper to build a DataTransfer-like object for drag events. */
function makeDragEvent(
  data: Record<string, string> = {}
): Partial<DragEvent> & { dataTransfer: DataTransfer } {
  const store: Record<string, string> = { ...data };
  const dataTransfer = {
    setData: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    getData: jest.fn((key: string) => store[key] ?? ""),
    effectAllowed: "none" as DataTransfer["effectAllowed"],
    dropEffect: "none" as DataTransfer["dropEffect"],
  } as unknown as DataTransfer;
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    dataTransfer,
  } as unknown as Partial<DragEvent> & { dataTransfer: DataTransfer };
}

const defaultStripProps = {
  teamId: 1,
  handle: "ash_ketchum",
  selectedPokemonId: null as number | null,
  onSelect: jest.fn(),
  onAddNew: jest.fn(),
};

// =============================================================================
// Tests
// =============================================================================

describe("TeamStrip", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefresh.mockClear();
    mockInvalidateQueries.mockClear();
    mockReorderTeamPokemonAction.mockResolvedValue({ success: true });
    mockRemovePokemonFromTeamAction.mockResolvedValue({ success: true });
  });

  // ---------------------------------------------------------------------------
  // Pokemon chips — rendering
  // ---------------------------------------------------------------------------

  describe("pokemon chips", () => {
    it("renders a chip for each team member", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[
            makePokemonEntry(1, 1, "Pikachu"),
            makePokemonEntry(2, 2, "Charizard"),
          ]}
        />
      );
      expect(screen.getByAltText("Pikachu")).toBeInTheDocument();
      expect(screen.getByAltText("Charizard")).toBeInTheDocument();
    });

    it("uses species name as the chip's accessible label (sprite-only chips)", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Arcanine")]}
        />
      );
      expect(screen.getByLabelText("Arcanine")).toBeInTheDocument();
      expect(screen.getByAltText("Arcanine")).toBeInTheDocument();
    });

    it("does not render the species name or held item as visible text", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[
            makePokemonEntry(1, 1, "Pikachu", {
              nickname: "Sparky",
              heldItem: "Leftovers",
            }),
          ]}
        />
      );
      // Sprite-only chips: nickname/species/item live in tooltip content only
      expect(screen.queryByText("Sparky")).not.toBeInTheDocument();
      expect(screen.queryByText("Leftovers")).not.toBeInTheDocument();
    });

    it("renders chip with 'Choosing…' label when choosingSlot matches an occupied slot index", () => {
      // choosingSlot=0 with a filled pokemon at position 0 — hits the
      // isChoosing branch inside PokemonChip (line 75), not the empty-slot path.
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
          choosingSlot={0}
        />
      );
      // The PokemonChip isChoosing branch renders a div labeled "Choosing species…"
      expect(screen.getByLabelText("Choosing species…")).toBeInTheDocument();
      // And the "Choosing…" text inside it
      expect(screen.getByText("Choosing…")).toBeInTheDocument();
    });

    it("renders an empty-slot div when a team_pokemon entry has no pokemon species", () => {
      // entry.pokemon === null hits the !pokemon branch (line 89) in PokemonChip
      const entry = makePokemonEntry(1, 1, "Pikachu", { noPokemon: true });
      render(<TeamStrip {...defaultStripProps} pokemon={[entry]} />);
      expect(screen.getByLabelText("Empty slot")).toBeInTheDocument();
    });

    it.each([
      ["Male", "M"],
      ["Female", "F"],
    ] as const)(
      "passes gender '%s' → '%s' to getPokemonSprite",
      (gender, _expected) => {
        const { getPokemonSprite } = jest.requireMock(
          "@trainers/pokemon/sprites"
        ) as { getPokemonSprite: jest.MockedFunction<() => unknown> };
        render(
          <TeamStrip
            {...defaultStripProps}
            pokemon={[makePokemonEntry(1, 1, "Pikachu", { gender })]}
          />
        );
        expect(getPokemonSprite).toHaveBeenCalled();
      }
    );

    it("renders shiny sprite when pokemon is_shiny", () => {
      const { getPokemonSprite } = jest.requireMock(
        "@trainers/pokemon/sprites"
      ) as { getPokemonSprite: jest.MockedFunction<() => unknown> };
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu", { isShiny: true })]}
        />
      );
      expect(getPokemonSprite).toHaveBeenCalledWith(
        "Pikachu",
        expect.objectContaining({ shiny: true })
      );
    });

    it("uses 'Unknown' label when pokemon has no species", () => {
      const entry = makePokemonEntry(1, 1, "Pikachu");
      // Force species to null to test the ?? "Unknown" branch
      (entry.pokemon as NonNullable<typeof entry.pokemon>).species =
        null as unknown as string;
      render(<TeamStrip {...defaultStripProps} pokemon={[entry]} />);
      expect(screen.getByLabelText("Unknown")).toBeInTheDocument();
    });

    it("sorts chips by team_position before rendering", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[
            makePokemonEntry(2, 2, "Charizard"),
            makePokemonEntry(1, 1, "Pikachu"),
          ]}
        />
      );
      const images = screen.getAllByRole("img");
      // First image should be the lower position (Pikachu=1), then Charizard=2
      expect(images[0]).toHaveAttribute("alt", "Pikachu");
      expect(images[1]).toHaveAttribute("alt", "Charizard");
    });

    it("marks chip as selected when selectedPokemonId matches", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          selectedPokemonId={1}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      const selectBtn = screen
        .getByLabelText("Pikachu")
        .querySelector("button[aria-pressed]");
      expect(selectBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("marks chip as not selected when selectedPokemonId does not match", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          selectedPokemonId={99}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      const selectBtn = screen
        .getByLabelText("Pikachu")
        .querySelector("button[aria-pressed]");
      expect(selectBtn).toHaveAttribute("aria-pressed", "false");
    });
  });

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  describe("selection", () => {
    it("calls onSelect with pokemon id when chip is clicked", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(
        <TeamStrip
          {...defaultStripProps}
          onSelect={onSelect}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      const chip = screen.getByLabelText("Pikachu");
      const selectBtn = chip.querySelector("button[aria-pressed]");
      expect(selectBtn).not.toBeNull();
      await user.click(selectBtn as HTMLElement);
      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it("calls onSelect with the correct pokemon id for each chip", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(
        <TeamStrip
          {...defaultStripProps}
          onSelect={onSelect}
          pokemon={[
            makePokemonEntry(1, 1, "Pikachu"),
            makePokemonEntry(2, 2, "Charizard"),
          ]}
        />
      );
      const charizardChip = screen.getByLabelText("Charizard");
      const selectBtn = charizardChip.querySelector("button[aria-pressed]");
      await user.click(selectBtn as HTMLElement);
      expect(onSelect).toHaveBeenCalledWith(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Empty slots
  // ---------------------------------------------------------------------------

  describe("empty slots", () => {
    it("renders empty slot placeholders to fill to 6 total", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      expect(
        screen.getByRole("button", { name: "Add Pokémon" })
      ).toBeInTheDocument();
    });

    it("renders 6 empty slots when no pokemon exist", () => {
      render(<TeamStrip {...defaultStripProps} pokemon={[]} />);
      expect(
        screen.getByRole("button", { name: "Add Pokémon" })
      ).toBeInTheDocument();
    });

    it("calls onAddNew when the + empty slot is clicked", async () => {
      const user = userEvent.setup();
      const onAddNew = jest.fn();
      render(
        <TeamStrip
          {...defaultStripProps}
          onAddNew={onAddNew}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      await user.click(screen.getByRole("button", { name: "Add Pokémon" }));
      expect(onAddNew).toHaveBeenCalled();
    });

    it("renders non-clickable filler slots beyond the first empty slot", () => {
      render(<TeamStrip {...defaultStripProps} pokemon={[]} />);
      // Only the first empty slot is a button; slots 2-6 are divs
      const addButton = screen.getByRole("button", { name: "Add Pokémon" });
      expect(addButton).toBeInTheDocument();
      // Slot 2 has aria-label "Empty slot 2"
      expect(screen.getByLabelText("Empty slot 2")).toBeInTheDocument();
    });

    it("shows 'Choosing…' state on an empty slot when choosingSlot matches", () => {
      // choosingSlot=1 with 1 pokemon — slot index 1 is the first empty slot
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
          choosingSlot={1}
        />
      );
      expect(screen.getByText("Choosing…")).toBeInTheDocument();
      expect(screen.getByLabelText("Choosing species…")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Choosing slot state
  // ---------------------------------------------------------------------------

  describe("choosing slot state", () => {
    it("shows 'Choosing…' on the designated choosing slot index (empty team)", () => {
      render(
        <TeamStrip {...defaultStripProps} pokemon={[]} choosingSlot={0} />
      );
      expect(screen.getByText("Choosing…")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Full team (6 pokemon)
  // ---------------------------------------------------------------------------

  describe("full team (6 pokemon)", () => {
    it("does not render Add Pokémon button when team has 6 members", () => {
      const pokemon = Array.from({ length: 6 }, (_, i) =>
        makePokemonEntry(i + 1, i + 1, `Pokemon${i + 1}`)
      );
      render(<TeamStrip {...defaultStripProps} pokemon={pokemon} />);
      expect(
        screen.queryByRole("button", { name: "Add Pokémon" })
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Remove button
  // ---------------------------------------------------------------------------

  describe("remove button", () => {
    it("renders remove button for each filled chip", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      expect(
        screen.getByRole("button", { name: "Remove Pikachu" })
      ).toBeInTheDocument();
    });

    it("calls removePokemonFromTeamAction and refreshes router on remove click", async () => {
      const user = userEvent.setup();
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      await user.click(screen.getByRole("button", { name: "Remove Pikachu" }));
      // Wait for async transition
      await act(async () => {});
      expect(mockRemovePokemonFromTeamAction).toHaveBeenCalledWith(1, 1);
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("shows toast error when removePokemonFromTeamAction fails", async () => {
      mockRemovePokemonFromTeamAction.mockResolvedValue({
        success: false,
        error: "Server error",
      });
      const user = userEvent.setup();
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      await user.click(screen.getByRole("button", { name: "Remove Pikachu" }));
      await act(async () => {});
      expect(toast.error).toHaveBeenCalledWith("Server error");
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it("shows fallback toast error when removePokemonFromTeamAction fails with no message", async () => {
      mockRemovePokemonFromTeamAction.mockResolvedValue({
        success: false,
        error: undefined,
      });
      const user = userEvent.setup();
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      await user.click(screen.getByRole("button", { name: "Remove Pikachu" }));
      await act(async () => {});
      expect(toast.error).toHaveBeenCalledWith("Failed to remove Pokémon.");
    });

    it("does not propagate click event when remove button is clicked", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(
        <TeamStrip
          {...defaultStripProps}
          onSelect={onSelect}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      await user.click(screen.getByRole("button", { name: "Remove Pikachu" }));
      // onSelect should NOT have been called — stopPropagation prevents it
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Drag and drop
  // ---------------------------------------------------------------------------

  describe("drag and drop", () => {
    it("calls reorderTeamPokemonAction with swapped positions on drop", async () => {
      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[
            makePokemonEntry(1, 1, "Pikachu"),
            makePokemonEntry(2, 2, "Charizard"),
          ]}
        />
      );

      // Find the draggable chip wrappers (they have draggable attribute)
      const draggables = container.querySelectorAll("[draggable]");
      expect(draggables.length).toBeGreaterThanOrEqual(2);

      const pikaChip = draggables[0] as HTMLElement;
      const charChip = draggables[1] as HTMLElement;

      // Simulate dragstart on Pikachu (pokemon_id=1)
      const dragStartEvent = makeDragEvent();
      pikaChip.dispatchEvent(
        Object.assign(new Event("dragstart", { bubbles: true }), {
          dataTransfer: dragStartEvent.dataTransfer,
        })
      );

      // Simulate drop on Charizard (pokemon_id=2) carrying pokemon_id=1
      const dropEvent = makeDragEvent({ "text/plain": "1" });
      await act(async () => {
        charChip.dispatchEvent(
          Object.assign(new Event("drop", { bubbles: true }), {
            dataTransfer: dropEvent.dataTransfer,
            preventDefault: dropEvent.preventDefault,
          })
        );
      });

      await act(async () => {});

      expect(mockReorderTeamPokemonAction).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({ pokemonId: 1, position: 2 }),
          expect.objectContaining({ pokemonId: 2, position: 1 }),
        ])
      );
    });

    it("calls router.refresh after successful reorder", async () => {
      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[
            makePokemonEntry(1, 1, "Pikachu"),
            makePokemonEntry(2, 2, "Charizard"),
          ]}
        />
      );

      const draggables = container.querySelectorAll("[draggable]");
      const charChip = draggables[1] as HTMLElement;
      const dropEvent = makeDragEvent({ "text/plain": "1" });

      await act(async () => {
        charChip.dispatchEvent(
          Object.assign(new Event("drop", { bubbles: true }), {
            dataTransfer: dropEvent.dataTransfer,
            preventDefault: dropEvent.preventDefault,
          })
        );
      });
      await act(async () => {});

      expect(mockRefresh).toHaveBeenCalled();
    });

    it("shows toast error when reorderTeamPokemonAction fails", async () => {
      mockReorderTeamPokemonAction.mockResolvedValue({
        success: false,
        error: "Reorder failed",
      });

      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[
            makePokemonEntry(1, 1, "Pikachu"),
            makePokemonEntry(2, 2, "Charizard"),
          ]}
        />
      );

      const draggables = container.querySelectorAll("[draggable]");
      const charChip = draggables[1] as HTMLElement;
      const dropEvent = makeDragEvent({ "text/plain": "1" });

      await act(async () => {
        charChip.dispatchEvent(
          Object.assign(new Event("drop", { bubbles: true }), {
            dataTransfer: dropEvent.dataTransfer,
            preventDefault: dropEvent.preventDefault,
          })
        );
      });
      await act(async () => {});

      expect(toast.error).toHaveBeenCalledWith("Reorder failed");
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it("shows fallback toast error when reorder fails with no message", async () => {
      mockReorderTeamPokemonAction.mockResolvedValue({
        success: false,
        error: undefined,
      });

      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[
            makePokemonEntry(1, 1, "Pikachu"),
            makePokemonEntry(2, 2, "Charizard"),
          ]}
        />
      );

      const draggables = container.querySelectorAll("[draggable]");
      const charChip = draggables[1] as HTMLElement;
      const dropEvent = makeDragEvent({ "text/plain": "1" });

      await act(async () => {
        charChip.dispatchEvent(
          Object.assign(new Event("drop", { bubbles: true }), {
            dataTransfer: dropEvent.dataTransfer,
            preventDefault: dropEvent.preventDefault,
          })
        );
      });
      await act(async () => {});

      expect(toast.error).toHaveBeenCalledWith("Failed to reorder Pokémon.");
    });

    it("does not call reorderTeamPokemonAction when dragged id equals target id", async () => {
      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[
            makePokemonEntry(1, 1, "Pikachu"),
            makePokemonEntry(2, 2, "Charizard"),
          ]}
        />
      );

      const draggables = container.querySelectorAll("[draggable]");
      const pikaChip = draggables[0] as HTMLElement;
      // Drop pokemon 1 onto pokemon 1 — same id, should be no-op
      const dropEvent = makeDragEvent({ "text/plain": "1" });

      await act(async () => {
        pikaChip.dispatchEvent(
          Object.assign(new Event("drop", { bubbles: true }), {
            dataTransfer: dropEvent.dataTransfer,
            preventDefault: dropEvent.preventDefault,
          })
        );
      });
      await act(async () => {});

      expect(mockReorderTeamPokemonAction).not.toHaveBeenCalled();
    });

    it("does not call reorderTeamPokemonAction when dragged id is 0 (empty transfer)", async () => {
      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[
            makePokemonEntry(1, 1, "Pikachu"),
            makePokemonEntry(2, 2, "Charizard"),
          ]}
        />
      );

      const draggables = container.querySelectorAll("[draggable]");
      const charChip = draggables[1] as HTMLElement;
      // Empty dataTransfer — getData returns "" → Number("") = 0 → falsy
      const dropEvent = makeDragEvent({ "text/plain": "" });

      await act(async () => {
        charChip.dispatchEvent(
          Object.assign(new Event("drop", { bubbles: true }), {
            dataTransfer: dropEvent.dataTransfer,
            preventDefault: dropEvent.preventDefault,
          })
        );
      });
      await act(async () => {});

      expect(mockReorderTeamPokemonAction).not.toHaveBeenCalled();
    });

    it("resets dragSourceId when dropping onto an empty slot", async () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );

      // The "Add Pokémon" button is the first empty slot — it accepts onDrop
      const addButton = screen.getByRole("button", { name: "Add Pokémon" });
      const dropEvent = makeDragEvent({ "text/plain": "1" });

      await act(async () => {
        addButton.dispatchEvent(
          Object.assign(new Event("drop", { bubbles: true }), {
            dataTransfer: dropEvent.dataTransfer,
            preventDefault: dropEvent.preventDefault,
          })
        );
      });
      await act(async () => {});

      // handleDropOnEmpty just resets state — no action should be called
      expect(mockReorderTeamPokemonAction).not.toHaveBeenCalled();
    });

    it("sets dataTransfer data on drag start", async () => {
      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );

      const draggable = container.querySelector("[draggable]") as HTMLElement;
      const setData = jest.fn();
      const dragEvent = Object.assign(
        new Event("dragstart", { bubbles: true }),
        {
          dataTransfer: {
            setData,
            effectAllowed: "none",
            dropEffect: "none",
          },
        }
      );

      draggable.dispatchEvent(dragEvent);
      expect(setData).toHaveBeenCalledWith("text/plain", "1");
    });

    it("prevents default on dragover events", async () => {
      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );

      const draggable = container.querySelector("[draggable]") as HTMLElement;
      const preventDefault = jest.fn();
      const dragOverEvent = Object.assign(
        new Event("dragover", { bubbles: true }),
        {
          dataTransfer: { dropEffect: "none" },
          preventDefault,
        }
      );

      draggable.dispatchEvent(dragOverEvent);
      expect(preventDefault).toHaveBeenCalled();
    });

    it("preserves position for bystander pokemon (not drag source or target)", async () => {
      // Three pokemon: drag pokemon_id=1 (pos 1) onto pokemon_id=3 (pos 3).
      // Pokemon_id=2 (pos 2) is a bystander — hits the passthrough return
      // in sorted.map (line 297) and keeps its own position.
      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[
            makePokemonEntry(1, 1, "Pikachu"),
            makePokemonEntry(2, 2, "Bulbasaur"),
            makePokemonEntry(3, 3, "Charizard"),
          ]}
        />
      );

      const draggables = container.querySelectorAll("[draggable]");
      // Drop pokemon_id=1 onto pokemon_id=3 (index 2)
      const charizardChip = draggables[2] as HTMLElement;
      const dropEvent = makeDragEvent({ "text/plain": "1" });

      await act(async () => {
        charizardChip.dispatchEvent(
          Object.assign(new Event("drop", { bubbles: true }), {
            dataTransfer: dropEvent.dataTransfer,
            preventDefault: dropEvent.preventDefault,
          })
        );
      });
      await act(async () => {});

      expect(mockReorderTeamPokemonAction).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          // Pikachu gets Charizard's old position
          expect.objectContaining({ pokemonId: 1, position: 3 }),
          // Bulbasaur keeps its position unchanged
          expect.objectContaining({ pokemonId: 2, position: 2 }),
          // Charizard gets Pikachu's old position
          expect.objectContaining({ pokemonId: 3, position: 1 }),
        ])
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Validation badges
  // ---------------------------------------------------------------------------

  describe("validation badges", () => {
    it("renders error badge (red) when pokemon has validation errors", () => {
      const pokemonErrors = new Map<number, ValidationError[]>([
        [1, [makeValidationError(1, "error")]],
      ]);
      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
          pokemonErrors={pokemonErrors}
        />
      );
      // The validation indicator badge is a <span> with bg-destructive
      const badge = container.querySelector("span.bg-destructive");
      expect(badge).toBeInTheDocument();
    });

    it("renders warning badge (amber) when pokemon has warnings only", () => {
      const pokemonErrors = new Map<number, ValidationError[]>([
        [1, [makeValidationError(1, "warning")]],
      ]);
      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
          pokemonErrors={pokemonErrors}
        />
      );
      const badge = container.querySelector(".bg-amber-500");
      expect(badge).toBeInTheDocument();
    });

    it("does not render any badge when pokemon has no errors", () => {
      const pokemonErrors = new Map<number, ValidationError[]>();
      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
          pokemonErrors={pokemonErrors}
        />
      );
      // The validation indicator badge is a <span>, distinct from the remove
      // button which also carries bg-destructive.
      expect(
        container.querySelector("span.bg-destructive")
      ).not.toBeInTheDocument();
      expect(container.querySelector(".bg-amber-500")).not.toBeInTheDocument();
    });

    it("does not render any badge when pokemonErrors prop is not provided", () => {
      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      // The validation indicator badge is a <span>, distinct from the remove
      // button which also carries bg-destructive.
      expect(
        container.querySelector("span.bg-destructive")
      ).not.toBeInTheDocument();
      expect(container.querySelector(".bg-amber-500")).not.toBeInTheDocument();
    });

    it("renders error badge (not amber) when pokemon has mixed errors and warnings", () => {
      const pokemonErrors = new Map<number, ValidationError[]>([
        [
          1,
          [makeValidationError(1, "error"), makeValidationError(1, "warning")],
        ],
      ]);
      const { container } = render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
          pokemonErrors={pokemonErrors}
        />
      );
      // When mixed, hasWarningsOnly is false → span.bg-destructive, not amber
      expect(
        container.querySelector("span.bg-destructive")
      ).toBeInTheDocument();
      expect(container.querySelector(".bg-amber-500")).not.toBeInTheDocument();
    });
  });
});
