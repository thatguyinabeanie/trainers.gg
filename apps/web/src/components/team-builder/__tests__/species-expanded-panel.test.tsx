import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Mocks
// =============================================================================

const mockGetLegalMoves = jest.fn();
const mockGetMoveData = jest.fn();

jest.mock("@trainers/pokemon", () => ({
  getLegalMoves: (...args: unknown[]) => mockGetLegalMoves(...args),
  getMoveData: (...args: unknown[]) => mockGetMoveData(...args),
}));

jest.mock("../pickers/role-registry", () => ({
  getRolesForMove: (name: string) => {
    if (name === "Earthquake") return ["spread"];
    if (name === "Flamethrower") return ["burn"];
    return [];
  },
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

jest.mock("../type-symbol-icon", () => ({
  TypeSymbolIcon: ({ type }: { type: string }) => (
    <span data-testid={`type-icon-${type}`}>{type}</span>
  ),
}));

jest.mock("../move-category-ui", () => ({
  CATEGORY_ICON_URLS: {
    Physical: "/physical.png",
    Special: "/special.png",
    Status: "/status.png",
  },
}));

jest.mock("../pickers/role-chip", () => ({
  RoleChip: ({ roleId }: { roleId: string }) => (
    <span data-testid={`role-${roleId}`}>{roleId}</span>
  ),
}));

// Import component after mocks
import { SpeciesExpandedPanel } from "../pickers/species-expanded-panel";

// =============================================================================
// Helpers
// =============================================================================

const MOVE_DATA = {
  Flamethrower: {
    name: "Flamethrower",
    type: "Fire",
    category: "Special",
    basePower: 90,
    accuracy: 100,
    shortDesc: "Burns target",
  },
  Earthquake: {
    name: "Earthquake",
    type: "Ground",
    category: "Physical",
    basePower: 100,
    accuracy: 100,
    shortDesc: "Hits all adjacent",
  },
  Protect: {
    name: "Protect",
    type: "Normal",
    category: "Status",
    basePower: 0,
    accuracy: true,
    shortDesc: "Blocks attacks",
  },
};

function setupMocks() {
  mockGetLegalMoves.mockReturnValue(["Flamethrower", "Earthquake", "Protect"]);
  mockGetMoveData.mockImplementation(
    (name: string) => MOVE_DATA[name as keyof typeof MOVE_DATA] ?? null
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("SpeciesExpandedPanel", () => {
  beforeEach(() => {
    setupMocks();
  });

  it("renders move rows for all legal moves", () => {
    render(
      <SpeciesExpandedPanel
        species="Charizard"
        formatId="gen9vgc2024regg"
        filteredMoves={[]}
        filteredRoles={[]}
      />
    );
    expect(screen.getByText("Flamethrower")).toBeInTheDocument();
    expect(screen.getByText("Earthquake")).toBeInTheDocument();
    expect(screen.getByText("Protect")).toBeInTheDocument();
  });

  it("shows unavailable message when getLegalMoves returns undefined", () => {
    mockGetLegalMoves.mockReturnValue(undefined);
    render(
      <SpeciesExpandedPanel
        species="Charizard"
        formatId="gen9vgc2024regg"
        filteredMoves={[]}
        filteredRoles={[]}
      />
    );
    expect(screen.getByText(/Learnset data unavailable/)).toBeInTheDocument();
  });

  it("shows unavailable message when getLegalMoves returns a Symbol", () => {
    mockGetLegalMoves.mockReturnValue(Symbol("loading"));
    render(
      <SpeciesExpandedPanel
        species="Charizard"
        formatId="gen9vgc2024regg"
        filteredMoves={[]}
        filteredRoles={[]}
      />
    );
    expect(screen.getByText(/Learnset data unavailable/)).toBeInTheDocument();
  });

  it("highlights moves that match filteredMoves", () => {
    render(
      <SpeciesExpandedPanel
        species="Charizard"
        formatId="gen9vgc2024regg"
        filteredMoves={["Earthquake"]}
        filteredRoles={[]}
      />
    );
    // Find the row containing Earthquake text — its parent grid div should have bg-primary/10
    const eqText = screen.getByText("Earthquake");
    const row = eqText.closest("[class*='grid']");
    expect(row?.className).toContain("bg-primary/10");
  });

  it("filters by roles — only matching moves shown", () => {
    render(
      <SpeciesExpandedPanel
        species="Charizard"
        formatId="gen9vgc2024regg"
        filteredMoves={[]}
        filteredRoles={["spread"]}
      />
    );
    expect(screen.getByText("Earthquake")).toBeInTheDocument();
    expect(screen.queryByText("Flamethrower")).not.toBeInTheDocument();
    expect(screen.queryByText("Protect")).not.toBeInTheDocument();
  });

  it("renders sort header with Name, BP, ACC buttons", () => {
    render(
      <SpeciesExpandedPanel
        species="Charizard"
        formatId="gen9vgc2024regg"
        filteredMoves={[]}
        filteredRoles={[]}
      />
    );
    expect(
      screen.getByRole("button", { name: /sort by name/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sort by base power/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sort by accuracy/i })
    ).toBeInTheDocument();
  });

  it("passes id prop to root element", () => {
    const { container } = render(
      <SpeciesExpandedPanel
        id="test-panel"
        species="Charizard"
        formatId="gen9vgc2024regg"
        filteredMoves={[]}
        filteredRoles={[]}
      />
    );
    expect(container.querySelector("#test-panel")).toBeInTheDocument();
  });

  it("renders the resize handle", () => {
    render(
      <SpeciesExpandedPanel
        species="Charizard"
        formatId="gen9vgc2024regg"
        filteredMoves={[]}
        filteredRoles={[]}
      />
    );
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("clicking sort by name triggers sort order change", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesExpandedPanel
        species="Charizard"
        formatId="gen9vgc2024regg"
        filteredMoves={[]}
        filteredRoles={[]}
      />
    );

    const nameBtn = screen.getByRole("button", { name: /sort by name/i });
    await user.click(nameBtn);

    // After clicking name (default was bp desc), moves should be sorted alphabetically
    const moveNames = screen
      .getAllByTitle(/Flamethrower|Earthquake|Protect/)
      .filter((el) => el.tagName === "SPAN" && el.className.includes("font-medium"))
      .map((el) => el.textContent);

    expect(moveNames).toEqual(["Earthquake", "Flamethrower", "Protect"]);
  });

  it("resize handle initiates pointer capture on pointerdown", () => {
    render(
      <SpeciesExpandedPanel
        species="Charizard"
        formatId="gen9vgc2024regg"
        filteredMoves={[]}
        filteredRoles={[]}
      />
    );

    const handle = screen.getByRole("separator");
    const setPointerCapture = jest.fn();
    Object.defineProperty(handle, "setPointerCapture", {
      value: setPointerCapture,
    });

    // Fire pointerdown via fireEvent (triggers React synthetic handler)
    fireEvent.pointerDown(handle, { clientY: 400, pointerId: 1 });

    expect(setPointerCapture).toHaveBeenCalledWith(1);
  });

  it("resize drag updates the panel height", () => {
    const { container } = render(
      <SpeciesExpandedPanel
        species="Charizard"
        formatId="gen9vgc2024regg"
        filteredMoves={[]}
        filteredRoles={[]}
      />
    );

    const handle = screen.getByRole("separator");
    Object.defineProperty(handle, "setPointerCapture", {
      value: jest.fn(),
    });

    // Start drag at Y=400
    fireEvent.pointerDown(handle, { clientY: 400, pointerId: 1 });

    // Move pointer 100px down — height should increase from 320 to 420
    fireEvent(
      document,
      new PointerEvent("pointermove", { clientY: 500, bubbles: true })
    );

    // Check that the scrollable container height changed
    const scrollDiv = container.querySelector('[style*="max-height"]');
    expect(scrollDiv).toHaveStyle({ maxHeight: "420px" });
  });

  it("pointerup ends the drag and removes listeners", () => {
    const { container } = render(
      <SpeciesExpandedPanel
        species="Charizard"
        formatId="gen9vgc2024regg"
        filteredMoves={[]}
        filteredRoles={[]}
      />
    );

    const handle = screen.getByRole("separator");
    Object.defineProperty(handle, "setPointerCapture", {
      value: jest.fn(),
    });

    // Start drag
    fireEvent.pointerDown(handle, { clientY: 400, pointerId: 1 });

    // End drag
    fireEvent(
      document,
      new PointerEvent("pointerup", { bubbles: true })
    );

    // Subsequent pointermove should NOT change height (listener removed)
    fireEvent(
      document,
      new PointerEvent("pointermove", { clientY: 700, bubbles: true })
    );

    // Height should still be 320 (unchanged from initial, since no move happened before up)
    const scrollDiv = container.querySelector('[style*="max-height"]');
    expect(scrollDiv).toHaveStyle({ maxHeight: "320px" });
  });
});
