"use client";

/**
 * Tests for IdentityLane — species selection, loadout pickers, gender/shiny
 * toggles, level/tera popovers, format-gating, and validation error display.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type Tables } from "@trainers/supabase";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("../builder.module.css", () => new Proxy({}, { get: (_t, k) => k }));

// Popover: render content inline so it's always queryable
jest.mock("@/components/ui/popover", () => ({
  Popover: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (
    <div data-testid="popover" data-open={String(!!open)}>
      {children}
    </div>
  ),
  PopoverTrigger: ({
    children,
    render: renderProp,
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
  }) => {
    if (renderProp) {
      return (
        <div data-testid="popover-trigger">
          {renderProp}
          {children}
        </div>
      );
    }
    return <div data-testid="popover-trigger">{children}</div>;
  },
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

// Dialog: render content inline so it's always queryable (the species picker
// now mounts inside a DialogContent, which uses a portal in production)
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (
    <div data-testid="dialog" data-open={String(!!open)}>
      {children}
    </div>
  ),
  DialogTrigger: ({
    children,
    render: renderProp,
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
  }) => {
    if (renderProp) {
      return (
        <div data-testid="dialog-trigger">
          {renderProp}
          {children}
        </div>
      );
    }
    return <div data-testid="dialog-trigger">{children}</div>;
  },
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

// Pickers — simple stubs that expose their props via data attrs + call-through
jest.mock("../pickers/species-picker", () => ({
  SpeciesPicker: ({
    value,
    onPick,
    onClose,
  }: {
    value: string | null;
    onPick: (s: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="species-picker" data-value={value ?? ""}>
      <button onClick={() => onPick("Gardevoir")}>pick-gardevoir</button>
      <button onClick={onClose}>close-species</button>
    </div>
  ),
}));

jest.mock("../pickers/ability-picker", () => ({
  AbilityPicker: ({
    value,
    onPick,
    onClose,
  }: {
    value: string | null | undefined;
    onPick: (a: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="ability-picker" data-value={value ?? ""}>
      <button onClick={() => onPick("Telepathy")}>pick-ability</button>
      <button onClick={onClose}>close-ability</button>
    </div>
  ),
}));

jest.mock("../pickers/item-picker", () => ({
  ItemPicker: ({
    value,
    onPick,
    onClose,
  }: {
    value: string | null | undefined;
    onPick: (i: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="item-picker" data-value={value ?? ""}>
      <button onClick={() => onPick("Choice Scarf")}>pick-item</button>
      <button onClick={onClose}>close-item</button>
    </div>
  ),
}));

jest.mock("../pickers/nature-picker", () => ({
  NaturePicker: ({
    value,
    onPick,
    onClose,
  }: {
    value: string;
    onPick: (n: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="nature-picker" data-value={value}>
      <button onClick={() => onPick("Timid")}>pick-nature</button>
      <button onClick={onClose}>close-nature</button>
    </div>
  ),
}));

jest.mock("../pickers/number-picker", () => ({
  NumberPicker: ({
    title,
    value,
    onChange,
    onClose,
  }: {
    title: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
    onClose: () => void;
  }) => (
    <div data-testid="number-picker" data-title={title} data-value={value}>
      <button onClick={() => onChange(42)}>pick-number</button>
      <button onClick={onClose}>close-number</button>
    </div>
  ),
}));

jest.mock("../pickers/type-picker", () => ({
  TypePicker: ({
    value,
    onPick,
    onClose,
  }: {
    value: string | null | undefined;
    onPick: (t: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="type-picker" data-value={value ?? ""}>
      <button onClick={() => onPick("Fairy")}>pick-type</button>
      <button onClick={onClose}>close-type</button>
    </div>
  ),
}));

// Sprite — lightweight stub
jest.mock("../sprite", () => ({
  Sprite: ({ species }: { species: string }) => (
    <div data-testid="sprite" data-species={species} />
  ),
}));

// TypePill + TypeDot — minimal stubs
jest.mock("../type-pill", () => ({
  TypePill: ({ t }: { t: string }) => (
    <span data-testid={`type-pill-${t}`}>{t}</span>
  ),
}));

jest.mock("../type-dot", () => ({
  TypeDot: ({ t }: { t: string }) => <span data-testid={`type-dot-${t}`} />,
}));

// FieldError + FieldErrors — render as simple alert spans
jest.mock("../validation/field-error", () => ({
  FieldError: ({
    message,
    severity,
  }: {
    message: string;
    severity?: string;
  }) => (
    <span role="alert" data-severity={severity ?? "error"}>
      {message}
    </span>
  ),
  FieldErrors: ({
    errors,
  }: {
    errors: ReadonlyArray<{ message: string; severity?: string }>;
  }) => (
    <>
      {errors.map((err, i) => (
        <span key={i} role="alert" data-severity={err.severity ?? "error"}>
          {err.message}
        </span>
      ))}
    </>
  ),
}));

// @trainers/pokemon — mock getSpeciesTypes, NATURE_EFFECTS, and STAT_LABELS
jest.mock("@trainers/pokemon", () => ({
  getSpeciesTypes: jest.fn().mockReturnValue(["Dragon", "Ground"]),
  NATURE_EFFECTS: {
    Adamant: { boost: "attack", reduce: "specialAttack" },
    Modest: { boost: "specialAttack", reduce: "attack" },
    Jolly: { boost: "speed", reduce: "specialAttack" },
    Serious: undefined,
    Timid: { boost: "speed", reduce: "attack" },
  },
  STAT_LABELS: {
    hp: "HP",
    attack: "Atk",
    defense: "Def",
    specialAttack: "SpA",
    specialDefense: "SpD",
    speed: "Spe",
  },
  STAT_KEYS: [
    "hp",
    "attack",
    "defense",
    "specialAttack",
    "specialDefense",
    "speed",
  ],
  formatHasTera: jest.fn().mockReturnValue(true),
  isChampionsFormat: jest.fn().mockReturnValue(false),
  // Form switching — defaults that single-form Pokemon hide chips. Override
  // per test for species with alternate forms.
  speciesHasForms: jest.fn().mockReturnValue(false),
  getFormsForSpecies: jest.fn().mockReturnValue([]),
  getCanonicalBaseSpecies: jest.fn((s: string) => s),
  getMegaStoneForSpecies: jest.fn().mockReturnValue(null),
  getMegaAbilityForSpecies: jest.fn().mockReturnValue(null),
  getAbilityShortDesc: jest.fn().mockReturnValue(null),
}));

// format-gating — real implementation delegates to @trainers/pokemon mocks above
// but let's also allow direct control per test via re-mock
jest.mock("../format-gating", () => ({
  formatSupportsLevel: jest.fn().mockReturnValue(true),
  formatSupportsTera: jest.fn().mockReturnValue(true),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { IdentityLane } from "../lanes/identity-lane";
import { type ValidationError } from "../../validation-hooks";
import * as FormatGating from "../format-gating";
import * as TrainersPokemon from "@trainers/pokemon";

// =============================================================================
// Fixtures
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

// Reserved for upcoming Champions-format identity-lane tests.
const _CHAMPIONS_FORMAT: GameFormat = {
  id: "championsvgc2026regma",
  game: "Pokemon Champions",
  gameShort: "Champions",
  generation: 9,
  category: "VGC",
  year: 2026,
  regulation: "M-A",
  label: "Champions: Reg M-A",
  showdownName: "[Champions] VGC 2026 Reg M-A",
  doubles: true,
  active: true,
};

function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Garchomp",
    ability: "Rough Skin",
    nature: "Adamant",
    move1: "Earthquake",
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

function makeError(
  field: string,
  severity: "error" | "warning" = "error",
  message = `${field} issue`
): ValidationError {
  return { pokemonId: 1, pokemonName: "Garchomp", field, message, severity };
}

function renderLane(
  pokemonOverrides: Partial<Tables<"pokemon">> = {},
  format: GameFormat | undefined = VGC_FORMAT,
  extraProps: Partial<React.ComponentProps<typeof IdentityLane>> = {}
) {
  const onUpdate = jest.fn();
  const result = render(
    <IdentityLane
      pokemon={makePokemon(pokemonOverrides)}
      format={format}
      teamItems={[]}
      onUpdate={onUpdate}
      {...extraProps}
    />
  );
  return { ...result, onUpdate };
}

// =============================================================================
// Tests
// =============================================================================

describe("IdentityLane — basic render", () => {
  it("renders the species name in the trigger button", () => {
    renderLane();
    expect(screen.getByText("Garchomp")).toBeInTheDocument();
  });

  it("renders 'Choose species…' when species is null", () => {
    renderLane({ species: null });
    expect(screen.getByText("Choose species…")).toBeInTheDocument();
  });

  it("renders the sprite", () => {
    renderLane();
    expect(screen.getByTestId("sprite")).toBeInTheDocument();
  });

  it("renders the nickname input with placeholder when no nickname", () => {
    renderLane({ nickname: null });
    const input = screen.getByPlaceholderText("Nickname");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("pre-fills nickname input with existing nickname", () => {
    renderLane({ nickname: "Garchamp" });
    expect(screen.getByDisplayValue("Garchamp")).toBeInTheDocument();
  });
});

describe("IdentityLane — type pills (moved to RibDecorations)", () => {
  it("does NOT render type pills inside identity-lane (they live in the rib now)", () => {
    // mock returns ["Dragon", "Ground"]
    renderLane();
    expect(screen.queryByTestId("type-pill-Dragon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("type-pill-Ground")).not.toBeInTheDocument();
  });
});

describe("IdentityLane — gender toggle", () => {
  it("renders a gender toggle inside identity-lane", () => {
    renderLane({ gender: null });
    expect(screen.getByTitle("Toggle gender")).toBeInTheDocument();
  });

  it("shows '—' when gender is null", () => {
    renderLane({ gender: null });
    expect(screen.getByTitle("Toggle gender")).toHaveTextContent("—");
  });

  it("shows '♂' when gender is Male", () => {
    renderLane({ gender: "Male" });
    expect(screen.getByTitle("Toggle gender")).toHaveTextContent("♂");
  });

  it("shows '♀' when gender is Female", () => {
    renderLane({ gender: "Female" });
    expect(screen.getByTitle("Toggle gender")).toHaveTextContent("♀");
  });

  it("calls onUpdate with Male when gender cycles from null", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderLane({ gender: null });
    await user.click(screen.getByTitle("Toggle gender"));
    expect(onUpdate).toHaveBeenCalledWith({ gender: "Male" });
  });

  it("calls onUpdate with Female when gender cycles from Male", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderLane({ gender: "Male" });
    await user.click(screen.getByTitle("Toggle gender"));
    expect(onUpdate).toHaveBeenCalledWith({ gender: "Female" });
  });

  it("calls onUpdate with null when gender cycles from Female", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderLane({ gender: "Female" });
    await user.click(screen.getByTitle("Toggle gender"));
    expect(onUpdate).toHaveBeenCalledWith({ gender: null });
  });
});

describe("IdentityLane — shiny toggle", () => {
  it("renders a shiny toggle inside identity-lane", () => {
    renderLane({ is_shiny: false });
    expect(screen.getByTitle("Not shiny (click to set)")).toBeInTheDocument();
  });

  it("renders shiny button with aria-pressed=false when not shiny", () => {
    renderLane({ is_shiny: false });
    expect(screen.getByTitle("Not shiny (click to set)")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("renders shiny button with aria-pressed=true when shiny", () => {
    renderLane({ is_shiny: true });
    expect(screen.getByTitle("Shiny (click to clear)")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("calls onUpdate with is_shiny: true when not shiny and clicked", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderLane({ is_shiny: false });
    await user.click(screen.getByTitle("Not shiny (click to set)"));
    expect(onUpdate).toHaveBeenCalledWith({ is_shiny: true });
  });

  it("calls onUpdate with is_shiny: false when shiny and clicked", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderLane({ is_shiny: true });
    await user.click(screen.getByTitle("Shiny (click to clear)"));
    expect(onUpdate).toHaveBeenCalledWith({ is_shiny: false });
  });
});

describe("IdentityLane — nickname input", () => {
  it("calls onUpdate with trimmed value on blur", () => {
    const { onUpdate } = renderLane({ nickname: null });
    const input = screen.getByPlaceholderText("Nickname");
    fireEvent.change(input, { target: { value: "  Sharky  " } });
    fireEvent.blur(input);
    expect(onUpdate).toHaveBeenCalledWith({ nickname: "Sharky" });
  });

  it("calls onUpdate with null when nickname is cleared (empty string)", () => {
    const { onUpdate } = renderLane({ nickname: "Sharky" });
    const input = screen.getByDisplayValue("Sharky");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onUpdate).toHaveBeenCalledWith({ nickname: null });
  });

  it("does not call onUpdate when nickname matches species name and was already null", () => {
    // Typing the species name is treated as "no nickname" (null), same as current state
    // so onUpdate is NOT fired (no change).
    const { onUpdate } = renderLane({ nickname: null, species: "Garchomp" });
    const input = screen.getByPlaceholderText("Nickname");
    fireEvent.change(input, { target: { value: "Garchomp" } });
    fireEvent.blur(input);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("calls onUpdate with null when a non-null nickname is changed to match species name", () => {
    // Start with a real nickname; user overwrites with species name → null
    const { onUpdate } = renderLane({
      nickname: "Sharky",
      species: "Garchomp",
    });
    const input = screen.getByDisplayValue("Sharky");
    fireEvent.change(input, { target: { value: "Garchomp" } });
    fireEvent.blur(input);
    expect(onUpdate).toHaveBeenCalledWith({ nickname: null });
  });

  it("does not call onUpdate when nickname is unchanged on blur", () => {
    const { onUpdate } = renderLane({ nickname: "Sharky" });
    const input = screen.getByDisplayValue("Sharky");
    fireEvent.blur(input);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("blurs input when Enter is pressed", () => {
    renderLane({ nickname: null });
    const input = screen.getByPlaceholderText("Nickname");
    const blurSpy = jest.spyOn(input, "blur");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(blurSpy).toHaveBeenCalled();
  });
});

describe("IdentityLane — species picker", () => {
  it("renders the SpeciesPicker with current value", () => {
    renderLane({ species: "Garchomp" });
    const picker = screen.getByTestId("species-picker");
    expect(picker).toHaveAttribute("data-value", "Garchomp");
  });

  it("calls onUpdate with full reset payload when a new species is picked", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderLane({ species: "Garchomp" });
    await user.click(screen.getByText("pick-gardevoir"));
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        species: "Gardevoir",
        nickname: null,
        held_item: null,
        ability: "",
        nature: "Serious",
        move1: "",
        move2: null,
        move3: null,
        move4: null,
      })
    );
  });

  it("does not call onUpdate when the same species is picked again", async () => {
    const user = userEvent.setup();
    // SpeciesPicker mock always picks "Gardevoir" — start as Gardevoir so it's same
    const { onUpdate } = renderLane({ species: "Gardevoir" });
    await user.click(screen.getByText("pick-gardevoir"));
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe("IdentityLane — item picker", () => {
  it("shows '—' when no item is held", () => {
    renderLane({ held_item: null });
    // Item label is visible in the form row
    expect(screen.getByText("Item")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows the held item name when set", () => {
    renderLane({ held_item: "Leftovers" });
    expect(screen.getByText("Leftovers")).toBeInTheDocument();
  });

  it("calls onUpdate with the picked item", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderLane();
    await user.click(screen.getByText("pick-item"));
    expect(onUpdate).toHaveBeenCalledWith({ held_item: "Choice Scarf" });
  });
});

describe("IdentityLane — ability picker", () => {
  it("shows '—' when ability is empty", () => {
    renderLane({ ability: "" });
    expect(screen.getByText("Abil")).toBeInTheDocument();
  });

  it("shows the ability name when set", () => {
    renderLane({ ability: "Rough Skin" });
    expect(screen.getByText("Rough Skin")).toBeInTheDocument();
  });

  it("calls onUpdate with the picked ability", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderLane();
    await user.click(screen.getByText("pick-ability"));
    expect(onUpdate).toHaveBeenCalledWith({ ability: "Telepathy" });
  });
});

describe("IdentityLane — nature picker", () => {
  it("shows the nature name when set", () => {
    renderLane({ nature: "Adamant" });
    expect(screen.getByText("Adamant")).toBeInTheDocument();
  });

  it("shows nature effect labels for Adamant (+Atk / −SpA)", () => {
    renderLane({ nature: "Adamant" });
    // STAT_LABELS maps "attack" → "Atk", "specialAttack" → "SpA"
    // Check for the effect suffix spans
    expect(screen.getByText(/\+Atk/)).toBeInTheDocument();
    expect(screen.getByText(/−SpA/)).toBeInTheDocument();
  });

  it("calls onUpdate with the picked nature", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderLane();
    await user.click(screen.getByText("pick-nature"));
    expect(onUpdate).toHaveBeenCalledWith({ nature: "Timid" });
  });

  it("does not show nature effect labels for neutral nature", () => {
    renderLane({ nature: "Serious" });
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/−/)).not.toBeInTheDocument();
  });
});

describe("IdentityLane — level field (moved to RibDecorations)", () => {
  beforeEach(() => {
    (FormatGating.formatSupportsLevel as jest.Mock).mockReturnValue(true);
    (FormatGating.formatSupportsTera as jest.Mock).mockReturnValue(false);
  });

  it("does NOT render the level field inside identity-lane", () => {
    renderLane({ level: 50 });
    // Level label "Lv" moved to RibDecorations — should not be in identity-lane
    expect(screen.queryByText("Lv")).not.toBeInTheDocument();
  });
});

describe("IdentityLane — tera field (format-gated)", () => {
  beforeEach(() => {
    (FormatGating.formatSupportsLevel as jest.Mock).mockReturnValue(false);
    (FormatGating.formatSupportsTera as jest.Mock).mockReturnValue(true);
  });

  it("renders tera field when format supports it", () => {
    renderLane();
    expect(screen.getByText("Tera")).toBeInTheDocument();
  });

  it("shows tera type with TypeDot when tera_type is set", () => {
    renderLane({ tera_type: "Fire" });
    expect(screen.getByTestId("type-dot-Fire")).toBeInTheDocument();
    expect(screen.getByText("Fire")).toBeInTheDocument();
  });

  it("shows '—' when tera_type is null", () => {
    renderLane({ tera_type: null });
    expect(screen.getByText("Tera")).toBeInTheDocument();
    // — is shown in the tera row
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("calls onUpdate with the picked tera type", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderLane({ tera_type: null });
    await user.click(screen.getByText("pick-type"));
    expect(onUpdate).toHaveBeenCalledWith({ tera_type: "Fairy" });
  });

  it("hides tera field when format does not support it", () => {
    (FormatGating.formatSupportsTera as jest.Mock).mockReturnValue(false);
    renderLane({}, VGC_FORMAT);
    expect(screen.queryByText("Tera")).not.toBeInTheDocument();
  });
});

describe("IdentityLane — validation errors", () => {
  it("renders a FieldError for nickname errors", () => {
    renderLane({}, VGC_FORMAT, {
      fieldErrors: [makeError("nickname", "error", "Nickname too long")],
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Nickname too long");
  });

  it("renders FieldError for species errors", () => {
    renderLane({}, VGC_FORMAT, {
      fieldErrors: [makeError("species", "error", "Species not in dex")],
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Species not in dex");
  });

  it("renders FieldError for ability errors", () => {
    renderLane({}, VGC_FORMAT, {
      fieldErrors: [makeError("ability", "error", "Ability not legal")],
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Ability not legal");
  });

  it("renders FieldError for item errors", () => {
    renderLane({}, VGC_FORMAT, {
      fieldErrors: [makeError("item", "error", "Item not allowed")],
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Item not allowed");
  });

  it("renders FieldError for heldItem errors (alias field)", () => {
    renderLane({}, VGC_FORMAT, {
      fieldErrors: [makeError("heldItem", "error", "Duplicate item")],
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Duplicate item");
  });

  it("renders FieldError for nature errors", () => {
    renderLane({}, VGC_FORMAT, {
      fieldErrors: [makeError("nature", "warning", "Nature advisory")],
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Nature advisory");
    expect(alert).toHaveAttribute("data-severity", "warning");
  });

  it("renders FieldError for gender errors", () => {
    renderLane({}, VGC_FORMAT, {
      fieldErrors: [makeError("gender", "error", "Gender mismatch")],
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Gender mismatch");
  });

  it("renders multiple errors when multiple fields have issues", () => {
    renderLane({}, VGC_FORMAT, {
      fieldErrors: [
        makeError("ability", "error", "Bad ability"),
        makeError("nature", "warning", "Odd nature"),
      ],
    });
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(2);
  });
});

// =============================================================================
// Ghost mode (pokemon: null)
// =============================================================================

describe("IdentityLane — ghost mode (pokemon: null)", () => {
  function renderGhost() {
    return render(<IdentityLane pokemon={null} />);
  }

  it("renders without crashing when pokemon is null", () => {
    expect(() => renderGhost()).not.toThrow();
  });

  it("shows '+ Add Pokémon' placeholder text", () => {
    renderGhost();
    expect(screen.getByText("+ Add Pokémon")).toBeInTheDocument();
  });

  it("shows 'Nickname' italic placeholder text", () => {
    renderGhost();
    expect(screen.getByText("Nickname")).toBeInTheDocument();
  });

  it("shows three loadout rows with labels Item, Abil, Nat", () => {
    renderGhost();
    expect(screen.getByText("Item")).toBeInTheDocument();
    expect(screen.getByText("Abil")).toBeInTheDocument();
    expect(screen.getByText("Nat")).toBeInTheDocument();
  });

  it("renders zero interactive elements — no buttons, inputs, or comboboxes", () => {
    renderGhost();
    expect(screen.queryAllByRole("button").length).toBe(0);
    expect(screen.queryAllByRole("textbox").length).toBe(0);
    expect(screen.queryAllByRole("combobox").length).toBe(0);
  });
});

// =============================================================================
// FormChips (form switching)
// =============================================================================

describe("IdentityLane — form chips", () => {
  beforeEach(() => {
    (TrainersPokemon.speciesHasForms as jest.Mock).mockReturnValue(false);
    (TrainersPokemon.getFormsForSpecies as jest.Mock).mockReturnValue([]);
    (TrainersPokemon.getCanonicalBaseSpecies as jest.Mock).mockImplementation(
      (s: string) => s
    );
    (TrainersPokemon.getMegaStoneForSpecies as jest.Mock).mockReturnValue(null);
  });

  // Helper — install Charizard X/Y mocks the cluster of tests below all use.
  function setupCharizardForms() {
    (TrainersPokemon.speciesHasForms as jest.Mock).mockReturnValue(true);
    (TrainersPokemon.getFormsForSpecies as jest.Mock).mockReturnValue([
      "Charizard",
      "Charizard-Mega-X",
      "Charizard-Mega-Y",
    ]);
    (TrainersPokemon.getCanonicalBaseSpecies as jest.Mock).mockReturnValue(
      "Charizard"
    );
    (TrainersPokemon.getMegaStoneForSpecies as jest.Mock).mockImplementation(
      (s: string) =>
        s === "Charizard-Mega-X"
          ? "Charizardite X"
          : s === "Charizard-Mega-Y"
            ? "Charizardite Y"
            : null
    );
  }

  it("renders no form chips for a species without alternate forms", () => {
    render(
      <IdentityLane
        pokemon={{ ...makePokemon(), species: "Pikachu" }}
        format={VGC_FORMAT}
        teamItems={[]}
        onUpdate={jest.fn()}
      />
    );
    expect(screen.queryByText("Mega X")).toBeNull();
  });

  it("renders one chip per alternate form (no 'Regular' chip)", () => {
    setupCharizardForms();
    render(
      <IdentityLane
        pokemon={{ ...makePokemon(), species: "Charizard" }}
        format={VGC_FORMAT}
        teamItems={[]}
        onUpdate={jest.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: "Regular" })).toBeNull();
    expect(screen.getByRole("button", { name: "Mega X" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mega Y" })).toBeInTheDocument();
  });

  it("disables every mega chip when no mega stone is held", () => {
    setupCharizardForms();
    render(
      <IdentityLane
        pokemon={{ ...makePokemon(), species: "Charizard", held_item: null }}
        format={VGC_FORMAT}
        teamItems={[]}
        onUpdate={jest.fn()}
      />
    );
    const x = screen.getByRole("button", { name: "Mega X" });
    const y = screen.getByRole("button", { name: "Mega Y" });
    expect(x).toBeDisabled();
    expect(y).toBeDisabled();
    expect(x).toHaveAttribute("title", "Hold Charizardite X to use this form");
    expect(y).toHaveAttribute("title", "Hold Charizardite Y to use this form");
  });

  it("disables Mega Y when Charizardite X is held; Mega X is enabled", () => {
    setupCharizardForms();
    render(
      <IdentityLane
        pokemon={{
          ...makePokemon(),
          species: "Charizard",
          held_item: "Charizardite X",
        }}
        format={VGC_FORMAT}
        teamItems={[]}
        onUpdate={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Mega X" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Mega Y" })).toBeDisabled();
  });

  it("dimmed mega chip click is a no-op (does not call onUpdate)", async () => {
    setupCharizardForms();
    const onUpdate = jest.fn();
    render(
      <IdentityLane
        pokemon={{
          ...makePokemon(),
          species: "Charizard",
          held_item: "Choice Band",
        }}
        format={VGC_FORMAT}
        teamItems={[]}
        onUpdate={onUpdate}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Mega Y" }));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("clicking an enabled inactive mega chip switches species (no item change)", async () => {
    setupCharizardForms();
    const onUpdate = jest.fn();
    render(
      <IdentityLane
        pokemon={{
          ...makePokemon(),
          species: "Charizard",
          held_item: "Charizardite Y",
        }}
        format={VGC_FORMAT}
        teamItems={[]}
        onUpdate={onUpdate}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Mega Y" }));
    expect(onUpdate).toHaveBeenCalledWith({ species: "Charizard-Mega-Y" });
  });

  it("clicking the active mega chip toggles back to base (item kept)", async () => {
    setupCharizardForms();
    const onUpdate = jest.fn();
    render(
      <IdentityLane
        pokemon={{
          ...makePokemon(),
          species: "Charizard-Mega-Y",
          held_item: "Charizardite Y",
        }}
        format={VGC_FORMAT}
        teamItems={[]}
        onUpdate={onUpdate}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Mega Y" }));
    expect(onUpdate).toHaveBeenCalledWith({ species: "Charizard" });
  });

  it("renders 'Mega' chip for Floette-Eternal even though base differs from form prefix", () => {
    // Regression: Floette-Eternal → Floette-Mega doesn't share a "<base>-"
    // prefix with the canonical base "Floette-Eternal" (15 chars vs 12).
    // Earlier impl produced an empty label and the chip appeared invisible.
    (TrainersPokemon.speciesHasForms as jest.Mock).mockReturnValue(true);
    (TrainersPokemon.getFormsForSpecies as jest.Mock).mockReturnValue([
      "Floette-Eternal",
      "Floette-Mega",
    ]);
    (TrainersPokemon.getCanonicalBaseSpecies as jest.Mock).mockReturnValue(
      "Floette-Eternal"
    );
    (TrainersPokemon.getMegaStoneForSpecies as jest.Mock).mockImplementation(
      (s: string) => (s === "Floette-Mega" ? "Floettite" : null)
    );

    render(
      <IdentityLane
        pokemon={{
          ...makePokemon(),
          species: "Floette-Eternal",
          held_item: "Floettite",
        }}
        format={VGC_FORMAT}
        teamItems={[]}
        onUpdate={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Mega" })).toBeInTheDocument();
  });

  it("clicking a different enabled mega while one is active swaps species", async () => {
    setupCharizardForms();
    const onUpdate = jest.fn();
    // Mega X active, Mega X stone held → both chips enabled (X active, Y disabled
    // because Y stone not held). Swap to Y by FIRST holding Charizardite Y, but
    // here we exercise the simpler swap: hold both stones can't happen, so
    // verify with a state where Y is enabled (item changed externally first).
    render(
      <IdentityLane
        pokemon={{
          ...makePokemon(),
          species: "Charizard-Mega-X",
          // User just swapped item to Charizardite Y manually; Mega Y is now
          // enabled (matches stone), Mega X is dimmed (stone gone). Click Y.
          held_item: "Charizardite Y",
        }}
        format={VGC_FORMAT}
        teamItems={[]}
        onUpdate={onUpdate}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Mega Y" }));
    expect(onUpdate).toHaveBeenCalledWith({ species: "Charizard-Mega-Y" });
  });
});
