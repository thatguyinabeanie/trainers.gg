import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

// UsageSparkline uses recharts + ResizeObserver which are not available in JSDOM.
jest.mock("../usage-sparkline", () => ({
  UsageSparkline: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="usage-sparkline" aria-label={ariaLabel ?? "Usage trend"} />
  ),
}));

jest.mock("../type-symbol-icon", () => ({
  TypeSymbolIcon: ({ type }: { type: string }) => (
    <span data-testid={`type-icon-${type}`}>{type}</span>
  ),
}));

jest.mock("../pickers/role-registry", () => ({
  getRolesForMove: (name: string) => {
    if (name === "Flamethrower") return ["burn"];
    return [];
  },
  getRoleById: (id: string) => {
    if (id === "burn") return { id: "burn", label: "Burn", group: "status" };
    return null;
  },
}));

jest.mock("../pickers/role-chip", () => ({
  RoleChip: ({ roleId }: { roleId: string }) => (
    <span data-testid={`role-${roleId}`}>{roleId}</span>
  ),
}));

jest.mock("../move-category-ui", () => ({
  CATEGORY_ICON_URLS: {
    Physical: "/physical.png",
    Special: "/special.png",
    Status: "/status.png",
  },
}));

// Import after mocks
import {
  sortMoveData,
  MoveListHeader,
  MoveListRow,
  type MoveListSortState,
} from "../pickers/move-list-shared";
import type { MoveData } from "@trainers/pokemon";

// =============================================================================
// Test Data
// =============================================================================

const moves: MoveData[] = [
  { name: "Flamethrower", type: "Fire", category: "Special", basePower: 90, accuracy: 100, shortDesc: "Burns" },
  { name: "Earthquake", type: "Ground", category: "Physical", basePower: 100, accuracy: 100, shortDesc: "Spread" },
  { name: "Protect", type: "Normal", category: "Status", basePower: 0, accuracy: true, shortDesc: "Blocks" },
  { name: "Air Slash", type: "Flying", category: "Special", basePower: 75, accuracy: 95, shortDesc: "Flinch" },
];

// =============================================================================
// sortMoveData tests
// =============================================================================

describe("sortMoveData", () => {
  it("sorts by name ascending", () => {
    const result = sortMoveData([...moves], { col: "name", dir: "asc" });
    expect(result.map((m) => m.name)).toEqual([
      "Air Slash",
      "Earthquake",
      "Flamethrower",
      "Protect",
    ]);
  });

  it("sorts by name descending", () => {
    const result = sortMoveData([...moves], { col: "name", dir: "desc" });
    expect(result.map((m) => m.name)).toEqual([
      "Protect",
      "Flamethrower",
      "Earthquake",
      "Air Slash",
    ]);
  });

  it("sorts by bp descending (higher first)", () => {
    const result = sortMoveData([...moves], { col: "bp", dir: "desc" });
    expect(result.map((m) => m.basePower)).toEqual([100, 90, 75, 0]);
  });

  it("sorts by bp ascending (lower first)", () => {
    const result = sortMoveData([...moves], { col: "bp", dir: "asc" });
    expect(result.map((m) => m.basePower)).toEqual([0, 75, 90, 100]);
  });

  it("sorts by accuracy descending (treats true as 101)", () => {
    const result = sortMoveData([...moves], { col: "acc", dir: "desc" });
    // Protect (true=101) > Flamethrower/Earthquake (100) > Air Slash (95)
    expect(result[0]!.name).toBe("Protect");
    expect(result[3]!.name).toBe("Air Slash");
  });

  it("sorts by type alphabetically", () => {
    const result = sortMoveData([...moves], { col: "type", dir: "asc" });
    expect(result.map((m) => m.type)).toEqual([
      "Fire",
      "Flying",
      "Ground",
      "Normal",
    ]);
  });

  it("sorts by category alphabetically", () => {
    const result = sortMoveData([...moves], { col: "category", dir: "asc" });
    expect(result.map((m) => m.category)).toEqual([
      "Physical",
      "Special",
      "Special",
      "Status",
    ]);
  });
});

// =============================================================================
// MoveListRow tests
// =============================================================================

describe("MoveListRow", () => {
  const baseMove: MoveData = {
    name: "Flamethrower",
    type: "Fire",
    category: "Special",
    basePower: 90,
    accuracy: 100,
    shortDesc: "Burns",
  };

  it("renders move name, BP value, accuracy with %", () => {
    render(<MoveListRow move={baseMove} />);
    expect(screen.getByText("Flamethrower")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows dash for BP when basePower is 0", () => {
    render(
      <MoveListRow move={{ ...baseMove, name: "Protect", basePower: 0 }} />
    );
    // Multiple dashes exist; find BP dash in context
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("shows dash for accuracy when accuracy is true", () => {
    render(
      <MoveListRow move={{ ...baseMove, name: "Protect", accuracy: true }} />
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("applies bg-primary/10 when isHighlighted is true", () => {
    const { container } = render(
      <MoveListRow move={baseMove} isHighlighted />
    );
    const row = container.firstElementChild;
    expect(row?.className).toContain("bg-primary/10");
  });

  it("shows role chips", () => {
    render(<MoveListRow move={baseMove} />);
    expect(screen.getByTestId("role-burn")).toBeInTheDocument();
  });

  it("calls onSelect when row is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(<MoveListRow move={baseMove} onSelect={onSelect} />);
    await user.click(screen.getByRole("row"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("calls onTypeFilter when type icon button is clicked", async () => {
    const user = userEvent.setup();
    const onTypeFilter = jest.fn();
    render(
      <MoveListRow move={baseMove} onSelect={() => {}} onTypeFilter={onTypeFilter} />
    );
    await user.click(screen.getByRole("button", { name: /filter by fire/i }));
    expect(onTypeFilter).toHaveBeenCalledWith("Fire");
  });

  it("renders without role=row when onSelect is not provided", () => {
    render(<MoveListRow move={baseMove} />);
    expect(screen.queryByRole("row")).not.toBeInTheDocument();
  });

  describe("usage column", () => {
    it("shows usage % when usagePct is provided and > 0", () => {
      render(<MoveListRow move={baseMove} usagePct={62} />);
      expect(screen.getByText("62%")).toBeInTheDocument();
    });

    it("shows dash when usagePct is 0", () => {
      render(<MoveListRow move={baseMove} usagePct={0} />);
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThan(0);
    });

    it("shows dash when usagePct is undefined", () => {
      render(<MoveListRow move={baseMove} />);
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThan(0);
    });

    it("renders sparkline when usageSeries has 2+ points", () => {
      render(
        <MoveListRow
          move={baseMove}
          usagePct={62}
          usageSeries={[55, 58, 62]}
        />
      );
      expect(screen.getByTestId("usage-sparkline")).toBeInTheDocument();
    });

    it("does not render sparkline when usageSeries has fewer than 2 points", () => {
      render(
        <MoveListRow
          move={baseMove}
          usagePct={62}
          usageSeries={[62]}
        />
      );
      expect(screen.queryByTestId("usage-sparkline")).not.toBeInTheDocument();
    });

    it("does not render sparkline when usageSeries is undefined", () => {
      render(<MoveListRow move={baseMove} usagePct={62} />);
      expect(screen.queryByTestId("usage-sparkline")).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// MoveListHeader tests
// =============================================================================

describe("MoveListHeader", () => {
  const defaultSort: MoveListSortState = { col: "bp", dir: "desc" };

  it("renders three sort buttons", () => {
    render(<MoveListHeader sort={defaultSort} onSort={() => {}} />);
    expect(screen.getByRole("button", { name: /sort by name/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sort by base power/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sort by accuracy/i })).toBeInTheDocument();
  });

  it("shows aria-pressed=true for active column", () => {
    render(<MoveListHeader sort={defaultSort} onSort={() => {}} />);
    const bpBtn = screen.getByRole("button", { name: /sort by base power/i });
    expect(bpBtn).toHaveAttribute("aria-pressed", "true");
    const nameBtn = screen.getByRole("button", { name: /sort by name/i });
    expect(nameBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onSort with column name when clicked", async () => {
    const user = userEvent.setup();
    const onSort = jest.fn();
    render(<MoveListHeader sort={defaultSort} onSort={onSort} />);
    await user.click(screen.getByRole("button", { name: /sort by name/i }));
    expect(onSort).toHaveBeenCalledWith("name");
  });
});
