"use client";

/**
 * Tests for the Topbar component.
 * Verifies: Import button, Validate popover trigger, error/warning styling,
 * format badge rendering, filledCount display.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type TeamWithPokemon } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

jest.mock("../validation/validation-popover", () => ({
  ValidationPopover: ({
    errors,
    onJumpToPokemon,
  }: {
    errors: unknown[];
    onJumpToPokemon: (id: number) => void;
  }) => (
    <div data-testid="validation-popover">
      <span data-testid="error-count">{errors.length}</span>
      <button
        type="button"
        onClick={() => onJumpToPokemon(99)}
        data-testid="jump-btn"
      >
        Jump
      </button>
    </div>
  ),
}));

jest.mock("@/components/dashboard/page-header", () => ({
  PageHeader: ({ children }: { children: React.ReactNode }) => (
    <header data-testid="page-header">{children}</header>
  ),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { Topbar } from "../topbar";
import { type ValidationError } from "../../validation-hooks";

// =============================================================================
// Fixtures
// =============================================================================

function makeTeam(overrides: Partial<TeamWithPokemon> = {}): TeamWithPokemon {
  return {
    id: 1,
    name: "Test Team",
    created_by: 1,
    format: "gen9vgc2026regi",
    description: null,
    format_legal: null,
    is_public: null,
    notes: null,
    parent_team_id: null,
    tags: null,
    created_at: null,
    updated_at: null,
    team_pokemon: [],
    ...overrides,
  };
}

function makeError(overrides: Partial<ValidationError> = {}): ValidationError {
  return {
    pokemonId: 1,
    pokemonName: "Garchomp",
    field: "ability",
    message: "Must select an ability",
    severity: "error",
    ...overrides,
  };
}

function makeWarning(overrides: Partial<ValidationError> = {}): ValidationError {
  return {
    pokemonId: 2,
    pokemonName: "Incineroar",
    field: "item",
    message: "Duplicate item",
    severity: "warning",
    ...overrides,
  };
}

const DEFAULT_FORMAT = {
  id: "gen9vgc2026regi",
  label: "VGC 2026 Reg I",
  generation: 9,
  isChampions: false,
  isChampionsTeamSize: false,
  legalLevelCap: 50,
};

function renderTopbar(
  props: Partial<{
    filledCount: number;
    format: typeof DEFAULT_FORMAT | undefined;
    validationErrors: ValidationError[];
    exportMenu: React.ReactNode;
  }> = {}
) {
  const onOpenImport = jest.fn();
  const onJumpToPokemon = jest.fn();
  const onValidate = jest.fn();

  const utils = render(
    <Topbar
      team={makeTeam()}
      filledCount={props.filledCount ?? 2}
      format={props.format as ReturnType<typeof makeTeam>["team_pokemon"] extends infer T ? any : any}
      username="ash_ketchum"
      onOpenImport={onOpenImport}
      validationErrors={props.validationErrors ?? []}
      onJumpToPokemon={onJumpToPokemon}
      onValidate={onValidate}
      exportMenu={props.exportMenu}
    />
  );

  return { ...utils, onOpenImport, onJumpToPokemon, onValidate };
}

// =============================================================================
// Tests
// =============================================================================

describe("Topbar — basic render", () => {
  it("renders the team name in the input", () => {
    renderTopbar();
    expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();
  });

  it("renders a link to the teams page with the username", () => {
    renderTopbar();
    const link = screen.getByRole("link", { name: "ash_ketchum" });
    expect(link).toHaveAttribute("href", "/dashboard/alts/ash_ketchum/teams");
  });

  it("renders the filled count stat block", () => {
    renderTopbar({ filledCount: 4 });
    expect(screen.getByText("4/6")).toBeInTheDocument();
  });

  it("renders the Import button", () => {
    renderTopbar();
    expect(screen.getByRole("button", { name: /import/i })).toBeInTheDocument();
  });

  it("renders the Validate button", () => {
    renderTopbar();
    expect(screen.getByRole("button", { name: /validate/i })).toBeInTheDocument();
  });
});

describe("Topbar — format badge", () => {
  it("renders format label badge when format is provided", () => {
    renderTopbar({ format: DEFAULT_FORMAT as any });
    expect(screen.getByText("VGC 2026 Reg I")).toBeInTheDocument();
  });

  it("does not render format badge when format is undefined", () => {
    renderTopbar({ format: undefined });
    expect(screen.queryByText("VGC 2026 Reg I")).not.toBeInTheDocument();
  });
});

describe("Topbar — Import button", () => {
  it("calls onOpenImport when Import button is clicked", async () => {
    const user = userEvent.setup();
    const { onOpenImport } = renderTopbar();
    await user.click(screen.getByRole("button", { name: /import/i }));
    expect(onOpenImport).toHaveBeenCalledTimes(1);
  });
});

describe("Topbar — Validate popover", () => {
  it("calls onValidate when Validate button is clicked to open popover", async () => {
    const user = userEvent.setup();
    const { onValidate } = renderTopbar();
    await user.click(screen.getByRole("button", { name: /validate/i }));
    expect(onValidate).toHaveBeenCalledTimes(1);
  });

  it("shows ValidationPopover when Validate button is clicked", async () => {
    const user = userEvent.setup();
    renderTopbar();
    await user.click(screen.getByRole("button", { name: /validate/i }));
    expect(screen.getByTestId("validation-popover")).toBeInTheDocument();
  });

  it("calls onJumpToPokemon when ValidationPopover emits a jump event", async () => {
    const user = userEvent.setup();
    const { onJumpToPokemon } = renderTopbar({
      validationErrors: [makeError()],
    });
    await user.click(screen.getByRole("button", { name: /validate/i }));
    await user.click(screen.getByTestId("jump-btn"));
    expect(onJumpToPokemon).toHaveBeenCalledWith(99);
  });
});

describe("Topbar — error/warning styling", () => {
  it("Validate button has no error styling with no errors", () => {
    renderTopbar({ validationErrors: [] });
    const btn = screen.getByRole("button", { name: /validate/i });
    expect(btn.className).not.toMatch(/destructive/);
  });

  it("renders error dot when there are error-severity validation errors", () => {
    renderTopbar({ validationErrors: [makeError()] });
    // The dot is aria-hidden but exists as a sibling span inside the button
    const btn = screen.getByRole("button", { name: /validate/i });
    const dot = btn.querySelector("span[aria-hidden]");
    expect(dot).toBeInTheDocument();
  });

  it("renders warning dot (amber) when only warnings exist", () => {
    renderTopbar({ validationErrors: [makeWarning()] });
    const btn = screen.getByRole("button", { name: /validate/i });
    const dot = btn.querySelector("span[aria-hidden]");
    expect(dot).toBeInTheDocument();
    expect(dot?.className).toMatch(/amber/);
  });

  it("renders destructive dot when errors exist alongside warnings", () => {
    renderTopbar({
      validationErrors: [makeError(), makeWarning()],
    });
    const btn = screen.getByRole("button", { name: /validate/i });
    const dot = btn.querySelector("span[aria-hidden]");
    expect(dot?.className).toMatch(/destructive/);
  });
});

describe("Topbar — exportMenu slot", () => {
  it("renders export menu when provided", () => {
    renderTopbar({
      exportMenu: <button data-testid="export-menu">Export</button>,
    });
    expect(screen.getByTestId("export-menu")).toBeInTheDocument();
  });

  it("does not crash when exportMenu is undefined", () => {
    renderTopbar({ exportMenu: undefined });
    expect(screen.getByRole("button", { name: /import/i })).toBeInTheDocument();
  });
});
