"use client";

/**
 * Tests for the BuilderTopbar component.
 * Verifies: editable name, File dropdown, Validate popover, save button,
 * load team popover, and export actions.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type TeamWithPokemon } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@trainers/pokemon", () => ({
  exportTeamToShowdown: jest.fn(() => "Pikachu @ Light Ball\nAbility: Static"),
  getFormatById: jest.fn((id: string) => ({
    id,
    label: "VGC 2026 Reg I",
  })),
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

jest.mock("../pokemon-utils", () => ({
  dbPokemonToFlat: jest.fn((p) => p),
}));

// Mock dropdown menu (Base UI doesn't render portaled content in jsdom)
jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    render,
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
  }) => (
    <div data-testid="dropdown-trigger">
      {render ? React.cloneElement(render, {}, children) : children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick} data-testid="dropdown-item">
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-group">{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

// Mock Popover (Base UI portals)
jest.mock("@/components/ui/popover", () => ({
  Popover: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div
      data-testid="popover"
      data-open={open}
      onClick={() => onOpenChange?.(true)}
    >
      {children}
    </div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
  PopoverTrigger: ({
    children,
    render,
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
  }) => (
    <div data-testid="popover-trigger">
      {render ?? null}
      {children}
    </div>
  ),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { BuilderTopbar } from "../builder-topbar";
import { type ValidationError } from "../validation-hooks";

// =============================================================================
// Fixtures
// =============================================================================

function makeTeam(overrides: Partial<TeamWithPokemon> = {}): TeamWithPokemon {
  return {
    id: -1,
    name: "Test Team",
    created_by: -1,
    format: "gen9vgc2026regi",
    description: null,
    format_legal: null,
    is_public: null,
    notes: null,
    parent_team_id: null,
    tags: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
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

function makeWarning(
  overrides: Partial<ValidationError> = {}
): ValidationError {
  return {
    pokemonId: 2,
    pokemonName: "Incineroar",
    field: "item",
    message: "Duplicate item",
    severity: "warning",
    ...overrides,
  };
}

interface RenderProps {
  validationErrors?: ValidationError[];
  onSaveToAccount?: () => void;
  isSaving?: boolean;
  userTeams?: Array<{
    id: number;
    name: string;
    alt_username: string;
    format: string | null;
    team_pokemon: Array<{ pokemon: unknown }>;
  }>;
  teamsLoading?: boolean;
  onLoadTeam?: (teamId: number) => void;
}

function renderTopbar(props: RenderProps = {}) {
  const onOpenImport = jest.fn();
  const onJumpToPokemon = jest.fn();
  const onValidate = jest.fn();
  const onNameChange = jest.fn().mockResolvedValue(undefined);

  const utils = render(
    <BuilderTopbar
      team={makeTeam()}
      onOpenImport={onOpenImport}
      validationErrors={props.validationErrors ?? []}
      onJumpToPokemon={onJumpToPokemon}
      onValidate={onValidate}
      onNameChange={onNameChange}
      onSaveToAccount={props.onSaveToAccount}
      isSaving={props.isSaving}
      userTeams={props.userTeams as never}
      teamsLoading={props.teamsLoading}
      onLoadTeam={props.onLoadTeam}
    />
  );

  return {
    ...utils,
    onOpenImport,
    onJumpToPokemon,
    onValidate,
    onNameChange,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("BuilderTopbar — basic render", () => {
  it("renders the team name as an editable button", () => {
    renderTopbar();
    expect(
      screen.getByRole("button", { name: "Edit team name" })
    ).toBeInTheDocument();
    expect(screen.getByText("Test Team")).toBeInTheDocument();
  });

  it("renders File button", () => {
    renderTopbar();
    expect(screen.getByText("File")).toBeInTheDocument();
  });

  it("renders Validate button text", () => {
    renderTopbar();
    expect(screen.getByText("Validate")).toBeInTheDocument();
  });

  it("renders sign-in link when onSaveToAccount is not provided", () => {
    renderTopbar();
    expect(
      screen.getByRole("link", { name: "Sign in to save" })
    ).toHaveAttribute("href", expect.stringContaining("/sign-in"));
  });

  it("renders save button when onSaveToAccount is provided", () => {
    const onSave = jest.fn();
    renderTopbar({ onSaveToAccount: onSave });
    expect(
      screen.getByRole("button", { name: "Save to account" })
    ).toBeInTheDocument();
  });

  it("disables save button when isSaving is true", () => {
    const onSave = jest.fn();
    renderTopbar({ onSaveToAccount: onSave, isSaving: true });
    // The save button has aria-label "Saving…" when isSaving
    const btn = screen.getByLabelText(/Saving/);
    expect(btn).toBeDisabled();
  });
});

describe("BuilderTopbar — editable name", () => {
  it("enters edit mode on click", async () => {
    const user = userEvent.setup();
    renderTopbar();

    await user.click(screen.getByRole("button", { name: "Edit team name" }));
    expect(
      screen.getByRole("textbox", { name: "Team name" })
    ).toBeInTheDocument();
  });

  it("calls onNameChange on Enter and exits edit mode", async () => {
    const user = userEvent.setup();
    const { onNameChange } = renderTopbar();

    await user.click(screen.getByRole("button", { name: "Edit team name" }));
    const input = screen.getByRole("textbox", { name: "Team name" });

    await user.clear(input);
    await user.type(input, "New Name{Enter}");

    await waitFor(() => {
      expect(onNameChange).toHaveBeenCalledWith("New Name");
    });
  });

  it("reverts on Escape without calling onNameChange", async () => {
    const user = userEvent.setup();
    const { onNameChange } = renderTopbar();

    await user.click(screen.getByRole("button", { name: "Edit team name" }));
    const input = screen.getByRole("textbox", { name: "Team name" });

    await user.clear(input);
    await user.type(input, "Garbage{Escape}");

    expect(onNameChange).not.toHaveBeenCalled();
    // Should be back to showing the button
    expect(
      screen.getByRole("button", { name: "Edit team name" })
    ).toBeInTheDocument();
  });

  it("does not call onNameChange if value is unchanged", async () => {
    const user = userEvent.setup();
    const { onNameChange } = renderTopbar();

    await user.click(screen.getByRole("button", { name: "Edit team name" }));
    const input = screen.getByRole("textbox", { name: "Team name" });

    // Just press Enter without changing
    await user.type(input, "{Enter}");

    expect(onNameChange).not.toHaveBeenCalled();
  });
});

describe("BuilderTopbar — validate", () => {
  it("renders the validate button with correct text", () => {
    renderTopbar();
    expect(screen.getByText("Validate")).toBeInTheDocument();
  });

  it("shows a destructive border when there are errors", () => {
    renderTopbar({ validationErrors: [makeError()] });
    const btn = screen.getByText("Validate").closest("button")!;
    expect(btn.className).toContain("destructive");
  });

  it("shows an amber border when there are only warnings", () => {
    renderTopbar({ validationErrors: [makeWarning()] });
    const btn = screen.getByText("Validate").closest("button")!;
    expect(btn.className).toContain("amber");
  });

  it("shows no error/warning styling when there are no issues", () => {
    renderTopbar({ validationErrors: [] });
    const btn = screen.getByText("Validate").closest("button")!;
    expect(btn.className).not.toContain("destructive");
    expect(btn.className).not.toContain("amber");
  });
});

describe("BuilderTopbar — File menu", () => {
  it("shows Import paste option", () => {
    renderTopbar();
    // With mocked dropdown, menu items render immediately
    expect(screen.getByText("Import paste")).toBeInTheDocument();
  });

  it("calls onOpenImport when Import paste is clicked", async () => {
    const user = userEvent.setup();
    const { onOpenImport } = renderTopbar();

    await user.click(screen.getByText("Import paste"));
    expect(onOpenImport).toHaveBeenCalledTimes(1);
  });

  it("shows export options", () => {
    renderTopbar();
    expect(screen.getByText("Copy as Showdown text")).toBeInTheDocument();
    expect(screen.getByText("Open in Pokepaste")).toBeInTheDocument();
  });

  it("shows Load team option when onLoadTeam is provided", () => {
    const onLoadTeam = jest.fn();
    renderTopbar({ onLoadTeam });
    expect(screen.getByText("Load team...")).toBeInTheDocument();
  });

  it("does not show Load team option when onLoadTeam is not provided", () => {
    renderTopbar();
    expect(screen.queryByText("Load team...")).not.toBeInTheDocument();
  });
});

describe("BuilderTopbar — save", () => {
  it("calls onSaveToAccount when save button is clicked", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    renderTopbar({ onSaveToAccount: onSave });

    await user.click(screen.getByRole("button", { name: "Save to account" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
