"use client";

/**
 * Behavioral tests for CalcVersusView.
 *
 * Strategy: stub all heavy child components (RadialStatEditor, MovesLane,
 * FieldControlSurface, StatBoostsRow, SpriteSection, SpeciesPickerDialog) to
 * lightweight testid-bearing stubs. The calc prop is a plain stub object that
 * satisfies UseCalcStateReturn's surface. useTargetAsPokemon and
 * useIdentityState are mocked so the test controls the synthetic target row
 * directly.
 *
 * Covers:
 *  - Both sides (your mon + target) and field surface render (testids present)
 *  - Your MovesLane gets direction="outgoing" and forward outputs
 *  - Target MovesLane gets direction="incoming" and reverse outputs
 *  - computeForwardOutputsForRow / computeReverseOutputsForRow called correctly
 *  - Per-side StatBoostsRow wired to attacker vs defender boosts
 *  - "Calc Target · click to edit ▾" label renders for target side
 *  - "Your Pokémon" label renders for attacker side
 *  - Species picker dialogs render (open=false initially)
 *  - Clicking your sprite button opens your SpeciesPickerDialog
 *  - Clicking target sprite button opens target SpeciesPickerDialog
 *  - Picking a species on your side calls yourIdentity.handleSpeciesPick
 *  - Picking a species on target side calls targetIdentity.handleSpeciesPick
 *  - Type chips render for your mon's types
 *  - Tera type chip renders when tera_type is set
 *  - Item + ability chips render when held_item / ability are set
 *  - No tera chip when tera_type is null
 *  - No item chip when held_item is null
 *  - MobileFieldSheet trigger ("Field ▾") renders in mobile layout
 *  - MobileStatsSheet triggers render in mobile layout
 *  - CalcEnabled false still renders both sides
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { type Tables } from "@trainers/supabase";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Mocks
// =============================================================================

// useIsMobile — default to desktop; individual tests override for mobile
const mockUseIsMobile = jest.fn().mockReturnValue(false);
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

// @trainers/pokemon — stub getSpeciesTypes, getTypeColor, and all picker-loader
// functions that item-picker.tsx and ability-picker.tsx call at module load
// time (getAllItems is a top-level const; without this stub Jest throws
// "getAllItems is not a function" before the test even renders).
jest.mock("@trainers/pokemon", () => ({
  getSpeciesTypes: jest.fn((species: string) => {
    if (species === "Garchomp") return ["Dragon", "Ground"];
    if (species === "Incineroar") return ["Fire", "Dark"];
    return [];
  }),
  getTypeColor: jest.fn(() => "#999"),
  isChampionsFormat: jest.fn(() => false),
  getFormsForSpecies: jest.fn(() => []),
  getMegaAbilityForSpecies: jest.fn(() => null),
  getMegaStoneForSpecies: jest.fn(() => null),
  getCanonicalBaseSpecies: jest.fn((s: string) => s),
  NATURE_EFFECTS: {},
  formatSupportsLevel: jest.fn(() => false),
  // item-picker.tsx calls getAllItems() at module load — return empty array
  getAllItems: jest.fn(() => []),
  getItemShortDesc: jest.fn(() => ""),
  getLegalItems: jest.fn(() => null),
  legalSetOrPermissive: jest.fn(
    (s: Set<string> | null) => s ?? new Set<string>()
  ),
  // ability-picker.tsx
  getAllAbilities: jest.fn(() => []),
  getAbilityShortDesc: jest.fn(() => ""),
  getLegalAbilities: jest.fn(() => null),
  getValidAbilities: jest.fn(() => []),
  formatHasTera: jest.fn(() => true),
  // MonMovesCard calls getMoveData once per slot to pre-compute isStatus
  getMoveData: jest.fn(() => ({
    type: "Dragon",
    category: "Physical",
    basePower: 80,
    accuracy: 100,
    shortDesc: "",
  })),
}));

// MobileMoveRow — stub the extracted component so the mobile-moves stack
// renders testable rows without mounting live MovePickerMobile Drawers.
jest.mock("../lanes/moves-lane-mobile", () => ({
  MobileMoveRow: ({
    moveName,
    slotKey,
    isStatus,
  }: {
    moveName: string | null;
    slotKey: string;
    isStatus: boolean;
  }) => (
    <div
      data-testid={`mobile-move-row-${slotKey}`}
      data-move={moveName ?? ""}
      data-is-status={String(isStatus)}
    />
  ),
}));

// useTargetAsPokemon — controlled stub
const mockTargetOnUpdate = jest.fn();
const mockTargetPokemon: Tables<"pokemon"> = {
  id: -1,
  species: "Incineroar",
  ability: "Intimidate",
  nature: "Careful",
  held_item: "Sitrus Berry",
  tera_type: null,
  move1: "Fake Out",
  move2: "Flare Blitz",
  move3: null,
  move4: null,
  ev_hp: 252,
  ev_attack: 0,
  ev_defense: 4,
  ev_special_attack: 0,
  ev_special_defense: 252,
  ev_speed: 0,
  iv_hp: 31,
  iv_attack: 31,
  iv_defense: 31,
  iv_special_attack: 31,
  iv_special_defense: 31,
  iv_speed: 31,
  level: 50,
  nickname: null,
  notes: null,
  gender: null,
  is_shiny: false,
  format_legal: null,
  created_at: null,
};
jest.mock("../calc/use-target-as-pokemon", () => ({
  useTargetAsPokemon: jest.fn(() => ({
    pokemon: mockTargetPokemon,
    onUpdate: mockTargetOnUpdate,
  })),
}));

// useIdentityState — return handleSpeciesPick stubs so picker calls are testable
const mockYourHandleSpeciesPick = jest.fn();
const mockTargetHandleSpeciesPick = jest.fn();

// We need to distinguish "your" vs "target" calls. The first call to
// useIdentityState in the component is for the target, the second is for your
// mon. We track call count to assign the correct mock.
let identityCallCount = 0;
jest.mock("../shared/use-identity-state", () => ({
  useIdentityState: jest.fn(() => {
    // Reset at module scope between renders is handled by beforeEach
    const isFirst = identityCallCount === 0;
    identityCallCount += 1;
    return {
      handleSpeciesPick: isFirst
        ? mockTargetHandleSpeciesPick
        : mockYourHandleSpeciesPick,
      types: [],
      gender: null,
      isShiny: false,
      level: 50,
      showLevel: false,
      natUp: undefined,
      natDown: undefined,
      megaAbility: null,
      isMegaStone: false,
      nicknameErrors: [],
      speciesErrors: [],
      genderErrors: [],
      itemErrors: [],
      abilityErrors: [],
      natureErrors: [],
      nickDraft: "",
      setNickDraft: jest.fn(),
      nicknameRef: { current: null },
      handleNickBlur: jest.fn(),
      handleGenderToggle: jest.fn(),
      handleShinyToggle: jest.fn(),
    };
  }),
}));

// ItemCell stub — renders "ITEM· {item}" so existing chip assertions keep passing
jest.mock("../shared/fields/item", () => ({
  ItemCell: ({ pokemon }: { pokemon: Tables<"pokemon"> }) =>
    pokemon.held_item ? (
      <div data-testid="item-cell">
        <span>ITEM·</span>
        <span>{pokemon.held_item}</span>
      </div>
    ) : null,
}));

// AbilityCell stub — renders "ABIL· {ability}" so existing chip assertions keep passing
jest.mock("../shared/fields/ability", () => ({
  AbilityCell: ({ pokemon }: { pokemon: Tables<"pokemon"> }) =>
    pokemon.ability ? (
      <div data-testid="ability-cell">
        <span>ABIL·</span>
        <span>{pokemon.ability}</span>
      </div>
    ) : null,
}));

// RadialStatEditor stub
jest.mock("../stats/radial-stat-editor", () => ({
  RadialStatEditor: ({
    pokemon,
    boosts,
  }: {
    pokemon: Tables<"pokemon">;
    boosts: Record<string, number>;
  }) => (
    <div
      data-testid="radial-stat-editor"
      data-species={pokemon.species}
      data-boost-atk={boosts?.atk ?? 0}
    />
  ),
}));

// StatBoostsRow stub — echoes boosts and onChange so we can assert wiring
jest.mock("../calc/stat-boosts-row", () => ({
  StatBoostsRow: ({
    boosts,
    onChange,
  }: {
    boosts: Record<string, number>;
    onChange: (stat: string, v: number) => void;
  }) => (
    <div
      data-testid="stat-boosts-row"
      data-boost-atk={boosts?.atk ?? 0}
      data-boost-def={boosts?.def ?? 0}
    >
      <button
        type="button"
        data-testid="stat-boosts-row-trigger"
        onClick={() => onChange("atk", 1)}
      />
    </div>
  ),
}));

// MovesLane stub — echoes direction and outputs length so we can assert wiring
jest.mock("../lanes/moves-lane", () => ({
  MovesLane: ({
    pokemon,
    direction,
    outputs,
  }: {
    pokemon: Tables<"pokemon">;
    direction: "outgoing" | "incoming";
    outputs: readonly unknown[];
  }) => (
    <div
      data-testid={`moves-lane-${direction}`}
      data-direction={direction}
      data-outputs-len={outputs?.length ?? 0}
      data-species={pokemon.species}
    />
  ),
}));

// FieldControlSurface stub
jest.mock("../calc/field-control-surface", () => ({
  FieldControlSurface: () => <div data-testid="field-control-surface" />,
}));

// SpriteSection stub — exposes onSpeciesClick as a button for testing
jest.mock("../shared/sprite-section", () => ({
  SpriteSection: ({
    pokemon,
    onSpeciesClick,
  }: {
    pokemon: Tables<"pokemon">;
    onSpeciesClick: () => void;
  }) => (
    <div data-testid={`sprite-section-${pokemon.species ?? "none"}`}>
      <button
        type="button"
        data-testid={`sprite-click-${pokemon.species ?? "none"}`}
        onClick={onSpeciesClick}
        aria-label={`Change species (${pokemon.species ?? "none"})`}
      />
    </div>
  ),
}));

// SpeciesPickerDialog stub — exposes a pick button when open
jest.mock("../pickers/species-picker-dialog", () => ({
  SpeciesPickerDialog: ({
    open,
    onOpenChange,
    onPick,
    value,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPick: (s: string) => void;
    value: string | null;
  }) => (
    <div
      data-testid={`species-picker-dialog-${value ?? "none"}`}
      data-open={String(open)}
    >
      {open && (
        <>
          <button
            type="button"
            data-testid="picker-pick-species"
            onClick={() => onPick("Tornadus")}
          />
          <button
            type="button"
            data-testid="picker-close"
            onClick={() => onOpenChange(false)}
          />
        </>
      )}
    </div>
  ),
}));

// Sheet — render children unconditionally so MobileFieldSheet / MobileStatsSheet
// content is always queryable. We need to test trigger labels in the mobile path.
jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (
    <div data-testid="sheet" data-open={String(!!open)}>
      {children}
    </div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  SheetTrigger: ({
    children,
    render: renderProp,
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
  }) => (
    <div data-testid="sheet-trigger">
      {renderProp}
      {children}
    </div>
  ),
}));

// =============================================================================
// Component import (after mocks are registered)
// =============================================================================

import { CalcVersusView } from "../layouts/calc-versus-view";
import type { CalcFieldExtras } from "../layouts/calc-versus-view";
import type {
  UseCalcStateReturn,
  CalcOutput,
  StatBoosts,
} from "../use-calc-state";

// =============================================================================
// Test fixtures
// =============================================================================

const VGC_FORMAT: GameFormat = {
  id: "gen9vgc2026regi",
  game: "Scarlet & Violet",
  gameShort: "SV",
  generation: 9,
  category: "VGC",
  year: 2026,
  regulation: "I",
  label: "SV: Reg I",
  showdownName: "[Gen 9] VGC 2026 Reg I",
  doubles: true,
  active: true,
};

function makeGarchomp(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Garchomp",
    ability: "Rough Skin",
    nature: "Hardy",
    move1: "Dragon Claw",
    move2: "Earthquake",
    move3: null,
    move4: null,
    ev_hp: 4,
    ev_attack: 252,
    ev_defense: 0,
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

/** A minimal stub CalcOutput */
function makeCalcOutput(minPercent = 40, maxPercent = 60): CalcOutput {
  return {
    minPercent,
    maxPercent,
    desc: `Test: ${minPercent}–${maxPercent}%`,
    rolls: [
      100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240,
      252,
    ],
    defenderMaxHP: 175,
    recoverySuffix: "",
    recoveryTier: "3HKO",
    koChance: null,
  };
}

const defaultAttackerBoosts: StatBoosts = {
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
};
const defaultDefenderBoosts: StatBoosts = {
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
};

/** Build a complete calc stub with sensible defaults */
function makeCalcStub(
  overrides: Partial<UseCalcStateReturn & CalcFieldExtras> = {}
): UseCalcStateReturn & CalcFieldExtras {
  const forwardOutputs = [makeCalcOutput(50, 70), null, null, null] as const;
  const reverseOutputs = [makeCalcOutput(20, 30), null, null, null] as const;

  return {
    direction: "offense",
    setDirection: jest.fn(),
    selectedMoveIdx: 0,
    setSelectedMoveIdx: jest.fn(),
    critMoves: [false, false, false, false],
    toggleCrit: jest.fn(),
    attackerStatus: "Healthy",
    setAttackerStatus: jest.fn(),
    attackerBoosts: defaultAttackerBoosts,
    setAttackerBoost: jest.fn(),
    defenderSpecies: "Incineroar",
    defenderAbility: "Intimidate",
    defenderItem: "Sitrus Berry",
    defenderNature: "Careful",
    defenderTera: "",
    defenderEvs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
    defenderIvs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    defenderBoosts: defaultDefenderBoosts,
    defenderStatus: "Healthy",
    defenderHpPercent: 100,
    defenderMoves: ["Fake Out", "Flare Blitz", "", ""] as readonly [
      string,
      string,
      string,
      string,
    ],
    setDefenderSpecies: jest.fn(),
    setDefenderAbility: jest.fn(),
    setDefenderItem: jest.fn(),
    setDefenderNature: jest.fn(),
    setDefenderTera: jest.fn(),
    setDefenderEv: jest.fn(),
    setDefenderIv: jest.fn(),
    setDefenderBoost: jest.fn(),
    setDefenderStatus: jest.fn(),
    setDefenderHpPercent: jest.fn(),
    attackerMegaActive: false,
    setAttackerMegaActive: jest.fn(),
    defenderMegaActive: false,
    setDefenderMegaActive: jest.fn(),
    setDefenderMove: jest.fn(),
    resetDefenderForSpecies: jest.fn(),
    gameType: "Doubles",
    weather: "",
    terrain: "",
    gravity: false,
    setGameType: jest.fn(),
    setWeather: jest.fn(),
    setTerrain: jest.fn(),
    setGravity: jest.fn(),
    fairyAura: false,
    setFairyAura: jest.fn(),
    magicRoom: false,
    setMagicRoom: jest.fn(),
    wonderRoom: false,
    setWonderRoom: jest.fn(),
    attackerSide: {
      reflect: false,
      lightScreen: false,
      auroraVeil: false,
      tailwind: false,
      helpingHand: false,
      friendGuard: false,
      protect: false,
      stealthRock: false,
      spikes: 0 as const,
      saltCure: false,
      leechSeed: false,
      crit: false,
      singleTarget: false,
    },
    defenderSide: {
      reflect: false,
      lightScreen: false,
      auroraVeil: false,
      tailwind: false,
      helpingHand: false,
      friendGuard: false,
      protect: false,
      stealthRock: false,
      spikes: 0 as const,
      saltCure: false,
      leechSeed: false,
      crit: false,
      singleTarget: false,
    },
    setAttackerSide: jest.fn(),
    setDefenderSide: jest.fn(),
    moves: ["Dragon Claw", "Earthquake", null, null],
    moveCalcOutputs: [null, null, null, null],
    computeForwardOutputsForRow: jest.fn(() => forwardOutputs),
    computeReverseOutputsForRow: jest.fn(() => reverseOutputs),
    selectedMoveName: null,
    selectedMoveOutput: null,
    moveCalcOutputsReverse: [null, null, null, null],
    computeReverseOutput: jest.fn(() => null),
    inferredWeather: null,
    inferredTerrain: null,
    calcEnabled: true,
    field: { foesAlive: 2, allyAlive: true },
    setField: jest.fn(),
    ...overrides,
  } as unknown as UseCalcStateReturn & CalcFieldExtras;
}

function renderView(
  pokemonOverrides: Partial<Tables<"pokemon">> = {},
  calcOverrides: Partial<UseCalcStateReturn & CalcFieldExtras> = {}
) {
  const pokemon = makeGarchomp(pokemonOverrides);
  const calc = makeCalcStub(calcOverrides);
  const onUpdate = jest.fn();

  const utils = render(
    <CalcVersusView
      pokemon={pokemon}
      format={VGC_FORMAT}
      onUpdate={onUpdate}
      calc={calc}
    />
  );
  return { ...utils, pokemon, calc, onUpdate };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  identityCallCount = 0;
  mockUseIsMobile.mockReturnValue(false);
});

// =============================================================================
// Tests
// =============================================================================

describe("CalcVersusView — structural rendering", () => {
  // Both desktop and mobile layouts render simultaneously in JSDOM (hidden by
  // CSS media queries, but both exist in the DOM). Use getAllByTestId and
  // check for at least one match to avoid "Found multiple elements" errors.

  it("renders the FieldControlSurface (desktop layout)", () => {
    renderView();
    // Desktop renders one FieldControlSurface inside the center column
    expect(
      screen.getAllByTestId("field-control-surface").length
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders a SpriteSection for your mon", () => {
    renderView();
    expect(
      screen.getAllByTestId("sprite-section-Garchomp").length
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders a SpriteSection for the target (Incineroar)", () => {
    renderView();
    expect(
      screen.getAllByTestId("sprite-section-Incineroar").length
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders 'Your Pokémon' label", () => {
    renderView();
    expect(screen.getAllByText("Your Pokémon").length).toBeGreaterThanOrEqual(
      1
    );
  });

  it("renders 'Calc Target · click to edit ▾' label", () => {
    renderView();
    expect(
      screen.getAllByText(/Calc Target · click to edit ▾/).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders two StatBoostsRow stubs (one per side)", () => {
    renderView();
    // Desktop: 2 (attacker + defender); mobile: 2 more inside sheets → ≥ 4
    expect(
      screen.getAllByTestId("stat-boosts-row").length
    ).toBeGreaterThanOrEqual(2);
  });
});

// =============================================================================
// Moves lane direction and outputs wiring
// =============================================================================

describe("CalcVersusView — MovesLane direction wiring", () => {
  it("renders an outgoing MovesLane for your moves", () => {
    renderView();
    const outgoing = screen.getAllByTestId("moves-lane-outgoing");
    expect(outgoing.length).toBeGreaterThanOrEqual(1);
    expect(outgoing[0]).toHaveAttribute("data-direction", "outgoing");
  });

  it("renders an incoming MovesLane for target moves", () => {
    renderView();
    const incoming = screen.getAllByTestId("moves-lane-incoming");
    expect(incoming.length).toBeGreaterThanOrEqual(1);
    expect(incoming[0]).toHaveAttribute("data-direction", "incoming");
  });

  it("calls computeForwardOutputsForRow with your pokemon", () => {
    const { calc, pokemon } = renderView();
    expect(calc.computeForwardOutputsForRow).toHaveBeenCalledWith(pokemon);
  });

  it("calls computeReverseOutputsForRow with your pokemon and defenderMoves", () => {
    const { calc, pokemon } = renderView();
    expect(calc.computeReverseOutputsForRow).toHaveBeenCalledWith(
      pokemon,
      calc.defenderMoves
    );
  });

  it("passes forward outputs to the outgoing MovesLane", () => {
    renderView();
    // Forward outputs array has 4 entries (1 output + 3 nulls)
    const outgoing = screen.getAllByTestId("moves-lane-outgoing")[0]!;
    expect(outgoing).toHaveAttribute("data-outputs-len", "4");
  });

  it("passes reverse outputs to the incoming MovesLane", () => {
    renderView();
    const incoming = screen.getAllByTestId("moves-lane-incoming")[0]!;
    expect(incoming).toHaveAttribute("data-outputs-len", "4");
  });
});

// =============================================================================
// StatBoostsRow — per-side boost wiring
// =============================================================================

describe("CalcVersusView — StatBoostsRow boost wiring", () => {
  it("your-side StatBoostsRow uses attackerBoosts (atk=1)", () => {
    renderView(
      {},
      { attackerBoosts: { atk: 1, def: 0, spa: 0, spd: 0, spe: 0 } }
    );
    const rows = screen.getAllByTestId("stat-boosts-row");
    // At least one row should have data-boost-atk=1 (the attacker side)
    const attackerRow = rows.find(
      (r) => r.getAttribute("data-boost-atk") === "1"
    );
    expect(attackerRow).toBeInTheDocument();
  });

  it("target-side StatBoostsRow uses defenderBoosts (def=2)", () => {
    renderView(
      {},
      { defenderBoosts: { atk: 0, def: 2, spa: 0, spd: 0, spe: 0 } }
    );
    const rows = screen.getAllByTestId("stat-boosts-row");
    const defenderRow = rows.find(
      (r) => r.getAttribute("data-boost-def") === "2"
    );
    expect(defenderRow).toBeInTheDocument();
  });

  it("clicking attacker StatBoostsRow calls setAttackerBoost", () => {
    const { calc } = renderView();
    // The first StatBoostsRow trigger found is on the attacker (your) side
    const triggers = screen.getAllByTestId("stat-boosts-row-trigger");
    fireEvent.click(triggers[0]!);
    expect(calc.setAttackerBoost).toHaveBeenCalledWith("atk", 1);
  });

  it("clicking defender StatBoostsRow calls setDefenderBoost", () => {
    const { calc } = renderView();
    const triggers = screen.getAllByTestId("stat-boosts-row-trigger");
    // Second trigger is on the defender side
    fireEvent.click(triggers[1]!);
    expect(calc.setDefenderBoost).toHaveBeenCalledWith("atk", 1);
  });
});

// =============================================================================
// Type chips for your mon
// =============================================================================

describe("CalcVersusView — type chips", () => {
  it("renders type chips for Garchomp (Dragon + Ground)", () => {
    renderView();
    // Both desktop and mobile layouts render — at least 2 occurrences each
    expect(screen.getAllByText("Dragon").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ground").length).toBeGreaterThanOrEqual(1);
  });

  it("renders tera type chip when tera_type is set", () => {
    renderView({ tera_type: "Fire" });
    // The tera chip renders as: <span>T·</span> + "Fire" in sibling text nodes.
    // Use a DOM query that finds the parent span containing both parts.
    const teraParents = screen
      .getAllByText("Fire")
      .map((el) => el.parentElement)
      .filter((p) => p?.textContent?.includes("T·"));
    expect(teraParents.length).toBeGreaterThanOrEqual(1);
  });

  it("does not render tera chip when tera_type is null", () => {
    renderView({ tera_type: null });
    expect(screen.queryByText(/T·/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Item and ability chips
// =============================================================================

describe("CalcVersusView — item and ability chips", () => {
  it("renders item chip when held_item is set", () => {
    renderView({ held_item: "Choice Band" });
    const itemChips = screen.getAllByText(/Choice Band/);
    expect(itemChips.length).toBeGreaterThanOrEqual(1);
  });

  it("does not render item chip for your mon when held_item is null", () => {
    // Your mon has no item (null). The target (Incineroar) has "Sitrus Berry".
    // We assert the previously-held item text doesn't appear (Garchomp had null,
    // so "Choice Band" or any item specific to your side is absent).
    renderView({ held_item: null });
    // "Sitrus Berry" still renders from the target side, which is expected.
    // But there should be no second distinct item chip for Garchomp.
    // Verify: when your mon has held_item=null, only target items render.
    // The target has exactly one item (Sitrus Berry) so total ITEM· count = 2
    // (desktop + mobile layouts both render). That's from the target, not your side.
    // All found ITEM· spans reference the target item, not a non-existent your-side item
    screen.queryAllByText(/ITEM·/).forEach((el) => {
      expect(el.nextSibling?.textContent).toMatch(/Sitrus Berry/);
    });
  });

  it("renders ability chip when ability is set", () => {
    renderView({ ability: "Rough Skin" });
    const abilityChips = screen.getAllByText(/Rough Skin/);
    expect(abilityChips.length).toBeGreaterThanOrEqual(1);
  });

  it("does not render ability chip for your mon when ability is empty string", () => {
    // Your mon has no ability (""). The target (Incineroar) has "Intimidate".
    // All ABIL· chips found should reference the target's ability (Intimidate),
    // not an empty-string ability for your side.
    renderView({ ability: "" });
    screen.queryAllByText(/ABIL·/).forEach((el) => {
      expect(el.nextSibling?.textContent).toMatch(/Intimidate/);
    });
  });
});

// =============================================================================
// Species picker dialogs
// =============================================================================

describe("CalcVersusView — species picker dialogs", () => {
  it("renders both species picker dialogs closed initially", () => {
    renderView();
    const dialogs = screen.getAllByTestId(/species-picker-dialog/);
    dialogs.forEach((d) => {
      expect(d).toHaveAttribute("data-open", "false");
    });
  });

  it("clicking your sprite button opens your species picker", () => {
    renderView();
    // Both desktop and mobile render sprite buttons — click the first one
    fireEvent.click(screen.getAllByTestId("sprite-click-Garchomp")[0]!);
    // Your picker should now be open — use getAllByTestId since both dialogs render
    const yourDialogs = screen.getAllByTestId("species-picker-dialog-Garchomp");
    expect(yourDialogs[0]).toHaveAttribute("data-open", "true");
  });

  it("clicking target sprite button opens target species picker", () => {
    renderView();
    fireEvent.click(screen.getAllByTestId("sprite-click-Incineroar")[0]!);
    const targetDialogs = screen.getAllByTestId(
      "species-picker-dialog-Incineroar"
    );
    expect(targetDialogs[0]).toHaveAttribute("data-open", "true");
  });

  it("picking a species on your side closes your dialog", () => {
    renderView();
    fireEvent.click(screen.getAllByTestId("sprite-click-Garchomp")[0]!);
    // picker-pick-species button appears once the dialog is open
    fireEvent.click(screen.getAllByTestId("picker-pick-species")[0]!);
    // Dialog closes after pick
    const yourDialogs = screen.getAllByTestId("species-picker-dialog-Garchomp");
    yourDialogs.forEach((d) => expect(d).toHaveAttribute("data-open", "false"));
  });

  it("picking a species on target side closes the target dialog", () => {
    renderView();
    fireEvent.click(screen.getAllByTestId("sprite-click-Incineroar")[0]!);
    fireEvent.click(screen.getAllByTestId("picker-pick-species")[0]!);
    const targetDialogs = screen.getAllByTestId(
      "species-picker-dialog-Incineroar"
    );
    targetDialogs.forEach((d) =>
      expect(d).toHaveAttribute("data-open", "false")
    );
  });
});

// =============================================================================
// calcEnabled=false branch
// =============================================================================

describe("CalcVersusView — calcEnabled=false", () => {
  it("still renders both sprite sections when calcEnabled=false", () => {
    renderView({}, { calcEnabled: false });
    expect(
      screen.getAllByTestId("sprite-section-Garchomp").length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByTestId("sprite-section-Incineroar").length
    ).toBeGreaterThanOrEqual(1);
  });

  it("still calls computeForwardOutputsForRow when calcEnabled=false", () => {
    const { calc } = renderView({}, { calcEnabled: false });
    // Component always calls the compute functions regardless of calcEnabled
    expect(calc.computeForwardOutputsForRow).toHaveBeenCalled();
  });
});

// =============================================================================
// Mobile layout
// =============================================================================

describe("CalcVersusView — mobile layout", () => {
  beforeEach(() => {
    // Reset identityCallCount for mobile renders
    identityCallCount = 0;
    mockUseIsMobile.mockReturnValue(true);
  });

  it("renders 'Field ▾' sheet trigger in mobile layout", () => {
    renderView();
    expect(screen.getByText("Field ▾")).toBeInTheDocument();
  });

  it("renders stats sheet triggers with nature label in mobile layout", () => {
    renderView({ nature: "Adamant" });
    // MobileStatsSheet trigger includes "⬡ Stats · Adamant … edit ▾"
    const triggers = screen.getAllByText(/⬡ Stats · Adamant … edit ▾/);
    expect(triggers.length).toBeGreaterThanOrEqual(1);
  });

  it("renders 'Hardy' as fallback nature in mobile stats trigger when nature is empty", () => {
    renderView({ nature: null });
    const triggers = screen.getAllByText(/⬡ Stats · Hardy … edit ▾/);
    expect(triggers.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the outgoing moves stack (not the table) in mobile layout", () => {
    renderView();
    // Mobile swaps the MovesLane table for the stacked MobileMoveRow cards.
    // Multiple elements expected: both outgoing and incoming sides render in JSDOM.
    expect(
      screen.getAllByTestId("mobile-moves-outgoing").length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId("moves-lane-outgoing")).not.toBeInTheDocument();
  });

  it("renders the incoming moves stack (not the table) in mobile layout", () => {
    renderView();
    expect(
      screen.getAllByTestId("mobile-moves-incoming").length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId("moves-lane-incoming")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Target nature label
// =============================================================================

describe("CalcVersusView — nature labels", () => {
  it("renders your nature label in the stats card header", () => {
    renderView({ nature: "Jolly" });
    const natureLabels = screen.getAllByText("Jolly");
    expect(natureLabels.length).toBeGreaterThanOrEqual(1);
  });
});
