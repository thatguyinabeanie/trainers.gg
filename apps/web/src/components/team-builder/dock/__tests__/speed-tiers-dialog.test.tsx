"use client";

/**
 * Behavioral tests for SpeedTiersDialog.
 *
 * Strategy: stub `./speed-tiers-content` (four exports used by the dialog) and
 * `@/components/ui/dialog` / `@/components/ui/drawer` with thin wrappers so the
 * dialog's own logic — null-return, desktop/mobile branch, button callbacks,
 * mobile tab switch, search input — can be tested without real pokemon calc or
 * portal plumbing.
 *
 * `isChampionsFormat` from `@trainers/pokemon` runs real against the fixture.
 * No pokemon calc functions are called by the dialog itself.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Mock: use-mobile
// =============================================================================

const mockUseIsMobile = jest.fn<boolean, []>();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

// =============================================================================
// Mock: speed-tiers-content (heavy pokemon calc lives here)
// =============================================================================

jest.mock("../speed-tiers-content", () => ({
  SpeedTiersFieldControls: () => <div data-testid="field-controls">FIELD</div>,
  SpeedTiersModifiers: () => <div data-testid="modifiers">MODS</div>,
  SpeedTiersTable: () => <div data-testid="tiers-table">TABLE</div>,
  parseExternalWeather: jest.fn(() => "none"),
}));

// =============================================================================
// Mock: Dialog — render children when open=true, nothing when open=false
// =============================================================================

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

// =============================================================================
// Mock: Drawer — render children when open=true, nothing when open=false
// =============================================================================

jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div data-testid="drawer">{children}</div> : null),
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drawer-content">{children}</div>
  ),
  DrawerTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

// =============================================================================
// Import AFTER mocks
// =============================================================================

import { SpeedTiersDialog } from "../speed-tiers-dialog";
import { DEFAULT_TOGGLE } from "../speed-tiers-state";

// =============================================================================
// Fixtures
// =============================================================================

const TEST_FORMAT: GameFormat = {
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

const CHAMPIONS_FORMAT: GameFormat = {
  ...TEST_FORMAT,
  id: "gen9champions2025",
  category: "Champions",
};

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof SpeedTiersDialog>> = {}
) {
  const onOpenChange = jest.fn();
  const onCollapseToSidepane = jest.fn();
  const setToggle = jest.fn();
  render(
    <SpeedTiersDialog
      open
      onOpenChange={onOpenChange}
      format={TEST_FORMAT}
      team={[]}
      toggle={DEFAULT_TOGGLE}
      setToggle={setToggle}
      onCollapseToSidepane={onCollapseToSidepane}
      {...overrides}
    />
  );
  return { onOpenChange, onCollapseToSidepane, setToggle };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  // Default to desktop
  mockUseIsMobile.mockReturnValue(false);
});

// =============================================================================
// Null guard
// =============================================================================

describe("SpeedTiersDialog — null guard", () => {
  it("returns null when format is undefined", () => {
    const { container } = render(
      <SpeedTiersDialog
        open
        onOpenChange={jest.fn()}
        format={undefined}
        team={[]}
        toggle={DEFAULT_TOGGLE}
        setToggle={jest.fn()}
        onCollapseToSidepane={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when open=false even with a valid format", () => {
    const { container } = render(
      <SpeedTiersDialog
        open={false}
        onOpenChange={jest.fn()}
        format={TEST_FORMAT}
        team={[]}
        toggle={DEFAULT_TOGGLE}
        setToggle={jest.fn()}
        onCollapseToSidepane={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});

// =============================================================================
// Desktop path
// =============================================================================

describe("SpeedTiersDialog — desktop (Dialog)", () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(false);
  });

  it("renders the dialog wrapper when open", () => {
    renderDialog();
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("renders the FilterDialogShell with data-testid='speed-tiers-dialog'", () => {
    renderDialog();
    expect(screen.getByTestId("speed-tiers-dialog")).toBeInTheDocument();
  });

  it("renders the name-filter search input with data-testid='speed-tiers-name-filter'", () => {
    renderDialog();
    expect(screen.getByTestId("speed-tiers-name-filter")).toBeInTheDocument();
  });

  it("the name-filter input has the correct aria-label", () => {
    renderDialog();
    expect(
      screen.getByRole("textbox", { name: "Filter Pokémon by name" })
    ).toBeInTheDocument();
  });

  it("renders the tiers table content", () => {
    renderDialog();
    expect(screen.getByTestId("tiers-table")).toBeInTheDocument();
  });

  it("renders field controls in the rail", () => {
    renderDialog();
    expect(screen.getByTestId("field-controls")).toBeInTheDocument();
  });

  it("renders modifiers in the rail", () => {
    renderDialog();
    expect(screen.getByTestId("modifiers")).toBeInTheDocument();
  });

  it("calls onCollapseToSidepane when 'Collapse to sidepane' button is clicked", async () => {
    const user = userEvent.setup();
    const { onCollapseToSidepane } = renderDialog();
    await user.click(
      screen.getByRole("button", { name: /Collapse to sidepane/i })
    );
    expect(onCollapseToSidepane).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange(false) when the close button (×) is clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();
    await user.click(
      screen.getByRole("button", { name: "Close speed tiers" })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does NOT render the mobile drawer", () => {
    renderDialog();
    expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Mobile path
// =============================================================================

describe("SpeedTiersDialog — mobile (Drawer)", () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(true);
  });

  it("renders the drawer wrapper when open on mobile", () => {
    renderDialog();
    expect(screen.getByTestId("drawer")).toBeInTheDocument();
  });

  it("does NOT render the desktop dialog on mobile", () => {
    renderDialog();
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("shows the 'tiers' tab button", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: /tiers/i })).toBeInTheDocument();
  });

  it("shows the 'filters' tab button", () => {
    renderDialog();
    expect(
      screen.getByRole("button", { name: /filters/i })
    ).toBeInTheDocument();
  });

  it("shows the tiers table by default (initial view = tiers)", () => {
    renderDialog();
    expect(screen.getByTestId("tiers-table")).toBeInTheDocument();
  });

  it("does NOT show field controls on initial 'tiers' view", () => {
    renderDialog();
    expect(screen.queryByTestId("field-controls")).not.toBeInTheDocument();
  });

  it("clicking 'filters' tab shows field controls and modifiers", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByTestId("field-controls")).toBeInTheDocument();
    expect(screen.getByTestId("modifiers")).toBeInTheDocument();
  });

  it("clicking 'filters' tab hides the tiers table", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.queryByTestId("tiers-table")).not.toBeInTheDocument();
  });

  it("clicking 'tiers' tab after 'filters' restores the table", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /filters/i }));
    await user.click(screen.getByRole("button", { name: /tiers/i }));
    expect(screen.getByTestId("tiers-table")).toBeInTheDocument();
    expect(screen.queryByTestId("field-controls")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Externally controlled weather
// =============================================================================

describe("SpeedTiersDialog — external weather prop", () => {
  it("renders without error when weather prop is provided (isExternallyControlled branch)", () => {
    mockUseIsMobile.mockReturnValue(false);
    renderDialog({ weather: "sun", setWeather: jest.fn() });
    // Both dialog and tiers table should still render
    expect(screen.getByTestId("speed-tiers-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("tiers-table")).toBeInTheDocument();
  });
});
