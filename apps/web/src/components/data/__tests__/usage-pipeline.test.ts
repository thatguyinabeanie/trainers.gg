import {
  buildPipelineGraph,
  type PipelineNode,
  type PipelineLink,
} from "../usage-pipeline";
import type { PipelineSpeciesData } from "@trainers/supabase";

// =============================================================================
// Test data factories
// =============================================================================

function makeSpecies(
  overrides?: Partial<PipelineSpeciesData>
): PipelineSpeciesData {
  return {
    species: "Sneasler",
    usagePct: 20,
    rank: 1,
    abilities: [{ value: "Unburden", count: 100, pct: 100 }],
    items: [],
    natures: [{ value: "Jolly", count: 75, pct: 75 }],
    moves: [{ value: "Fake Out", count: 90, pct: 90 }],
    ...overrides,
  };
}

// =============================================================================
// buildPipelineGraph — empty input
// =============================================================================

describe("buildPipelineGraph — empty", () => {
  it("returns empty nodes and links for empty input", () => {
    const result = buildPipelineGraph([]);
    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
  });
});

// =============================================================================
// buildPipelineGraph — single species
// =============================================================================

describe("buildPipelineGraph — single species", () => {
  it("creates one species node per species", () => {
    const result = buildPipelineGraph(
      [makeSpecies()],
      ["ability", "nature", "move"]
    );
    const speciesNodes = result.nodes.filter(
      (n: PipelineNode) => n.column === "species"
    );
    expect(speciesNodes).toHaveLength(1);
    expect(speciesNodes[0]!.id).toBe("species:Sneasler");
    expect(speciesNodes[0]!.label).toBe("Sneasler");
  });

  it("creates one ability node per distinct ability", () => {
    const result = buildPipelineGraph(
      [makeSpecies()],
      ["ability", "nature", "move"]
    );
    const abilityNodes = result.nodes.filter(
      (n: PipelineNode) => n.column === "ability"
    );
    expect(abilityNodes).toHaveLength(1);
    expect(abilityNodes[0]!.id).toBe("ability:Unburden");
  });

  it("creates species→ability link with correct value", () => {
    const result = buildPipelineGraph(
      [makeSpecies()],
      ["ability", "nature", "move"]
    );
    const link = result.links.find(
      (l: PipelineLink) =>
        l.source === "species:Sneasler" && l.target === "ability:Unburden"
    );
    expect(link).toBeDefined();
    // value = usagePct * ability.pct / 100 = 20 * 100 / 100 = 20
    expect(link!.value).toBeCloseTo(20);
  });

  it("creates ability→nature link with proportionally allocated value", () => {
    const result = buildPipelineGraph(
      [makeSpecies()],
      ["ability", "nature", "move"]
    );
    const link = result.links.find(
      (l: PipelineLink) =>
        l.source === "ability:Unburden" && l.target === "nature:Jolly"
    );
    expect(link).toBeDefined();
    // value = usagePct * ability.pct/100 * nature.pct/100 = 20 * 1.0 * 0.75 = 15
    expect(link!.value).toBeCloseTo(15);
  });

  it("creates nature→move link with proportionally allocated value", () => {
    const result = buildPipelineGraph(
      [makeSpecies()],
      ["ability", "nature", "move"]
    );
    const link = result.links.find(
      (l: PipelineLink) =>
        l.source === "nature:Jolly" && l.target === "move:Fake Out"
    );
    expect(link).toBeDefined();
    // value = usagePct * ability.pct/100 * nature.pct/100 * move.pct/100 = 20 * 1.0 * 0.75 * 0.90 = 13.5
    expect(link!.value).toBeCloseTo(13.5);
  });
});

// =============================================================================
// buildPipelineGraph — multi-ability conserves nature→move total
// =============================================================================

describe("buildPipelineGraph — multi-ability conserves nature→move total", () => {
  // Invariant: splitting ability mass 50/50 across two abilities yields the same
  // total nature→move flow as a single 100% ability, because addLink() aggregates
  // by source+target key and the two abilities' contributions sum to the same value.
  it("nature→move total is the same regardless of ability count", () => {
    const oneAbility = buildPipelineGraph(
      [makeSpecies()],
      ["ability", "nature", "move"]
    ); // pct=100 (Unburden)
    const twoAbility = buildPipelineGraph(
      [
        makeSpecies({
          abilities: [
            { value: "Unburden", count: 50, pct: 50 },
            { value: "Pickpocket", count: 50, pct: 50 },
          ],
        }),
      ],
      ["ability", "nature", "move"]
    );

    const nm1 = oneAbility.links.find(
      (l) => l.source === "nature:Jolly" && l.target === "move:Fake Out"
    );
    const nm2 = twoAbility.links.find(
      (l) => l.source === "nature:Jolly" && l.target === "move:Fake Out"
    );

    // Both must equal 13.5 = 20 * 1.0 * 0.75 * 0.90 (single ability)
    //                    = 20 * (0.5 + 0.5) * 0.75 * 0.90 (two abilities, aggregated)
    expect(nm1!.value).toBeCloseTo(13.5);
    expect(nm2!.value).toBeCloseTo(nm1!.value);
    expect(nm2!.value).toBeCloseTo(13.5);
  });
});

// =============================================================================
// buildPipelineGraph — empty abilities (graceful skip)
// =============================================================================

describe("buildPipelineGraph — empty abilities", () => {
  // With the new configurable-column algorithm, empty columns are skipped per
  // species. With columns=["ability","nature","move"] and abilities=[]:
  //   activeColumns = ["nature","move"] (ability skipped)
  //   → species→nature and nature→move links are produced
  it("skips ability column and links species→nature when abilities is empty", () => {
    const result = buildPipelineGraph(
      [makeSpecies({ abilities: [] })],
      ["ability", "nature", "move"]
    );

    // No ability nodes
    expect(
      result.nodes.filter((n: PipelineNode) => n.column === "ability")
    ).toHaveLength(0);

    // Species node still exists
    expect(
      result.nodes.some((n: PipelineNode) => n.id === "species:Sneasler")
    ).toBe(true);

    // Nature and move nodes exist
    expect(
      result.nodes.filter((n: PipelineNode) => n.column === "nature")
    ).toHaveLength(1);
    expect(
      result.nodes.filter((n: PipelineNode) => n.column === "move")
    ).toHaveLength(1);

    // Every link endpoint references an existing node id
    const ids = new Set(result.nodes.map((n: PipelineNode) => n.id));
    for (const l of result.links) {
      expect(ids.has(l.source)).toBe(true);
      expect(ids.has(l.target)).toBe(true);
    }
  });

  it("produces species→nature link with correct value when abilities is empty", () => {
    const result = buildPipelineGraph(
      [makeSpecies({ abilities: [] })],
      ["ability", "nature", "move"]
    );
    const link = result.links.find(
      (l: PipelineLink) =>
        l.source === "species:Sneasler" && l.target === "nature:Jolly"
    );
    expect(link).toBeDefined();
    // value = usagePct * nature.pct / 100 = 20 * 75 / 100 = 15
    expect(link!.value).toBeCloseTo(15);
  });

  it("produces zero links when all columns are empty", () => {
    const result = buildPipelineGraph(
      [makeSpecies({ abilities: [], natures: [], moves: [] })],
      ["ability", "nature", "move"]
    );
    // activeColumns is empty → species floats with no outgoing links
    expect(result.links).toHaveLength(0);
    // Species node still exists
    expect(
      result.nodes.some((n: PipelineNode) => n.id === "species:Sneasler")
    ).toBe(true);
  });
});

// =============================================================================
// buildPipelineGraph — no natures (ability directly connects to move)
// =============================================================================

describe("buildPipelineGraph — no natures (2-column fallback)", () => {
  it("creates ability→move link when natures is empty", () => {
    const species = makeSpecies({ natures: [] });
    const result = buildPipelineGraph([species], ["ability", "nature", "move"]);

    // No nature nodes (empty natures skipped)
    expect(
      result.nodes.filter((n: PipelineNode) => n.column === "nature")
    ).toHaveLength(0);

    // Move node exists
    expect(
      result.nodes.filter((n: PipelineNode) => n.column === "move")
    ).toHaveLength(1);

    // Ability → Move link exists
    const link = result.links.find(
      (l: PipelineLink) =>
        l.source === "ability:Unburden" && l.target === "move:Fake Out"
    );
    expect(link).toBeDefined();
    // value = usagePct * ability.pct * move.pct / 10000 = 20 * 100 * 90 / 10000 = 18
    expect(link!.value).toBeCloseTo(18);
  });

  it("creates no move nodes when both natures and moves are empty", () => {
    const species = makeSpecies({ natures: [], moves: [] });
    const result = buildPipelineGraph([species], ["ability", "nature", "move"]);

    expect(
      result.nodes.filter((n: PipelineNode) => n.column === "nature")
    ).toHaveLength(0);
    expect(
      result.nodes.filter((n: PipelineNode) => n.column === "move")
    ).toHaveLength(0);
    // Only species + ability nodes
    expect(
      result.nodes.filter((n: PipelineNode) => n.column === "species")
    ).toHaveLength(1);
    expect(
      result.nodes.filter((n: PipelineNode) => n.column === "ability")
    ).toHaveLength(1);
  });
});

// =============================================================================
// buildPipelineGraph — multiple species sharing an ability node
// =============================================================================

describe("buildPipelineGraph — shared ability node", () => {
  it("aggregates species→ability links into shared ability node", () => {
    const sneasler = makeSpecies({ species: "Sneasler", usagePct: 20 });
    const koraidon = makeSpecies({
      species: "Koraidon",
      usagePct: 18,
      abilities: [{ value: "Unburden", count: 100, pct: 100 }], // same ability
      natures: [{ value: "Jolly", count: 100, pct: 100 }],
      moves: [{ value: "Fake Out", count: 100, pct: 100 }],
    });

    const result = buildPipelineGraph(
      [sneasler, koraidon],
      ["ability", "nature", "move"]
    );

    // Only one "Unburden" ability node
    const abilityNodes = result.nodes.filter(
      (n: PipelineNode) => n.id === "ability:Unburden"
    );
    expect(abilityNodes).toHaveLength(1);

    // Two species→Unburden links (one per species)
    const linksToUnburden = result.links.filter(
      (l: PipelineLink) => l.target === "ability:Unburden"
    );
    expect(linksToUnburden).toHaveLength(2);
  });
});

// =============================================================================
// buildPipelineGraph — configurable columns
// =============================================================================

describe("buildPipelineGraph — configurable columns", () => {
  it("includes item nodes when items data is present", () => {
    const species = makeSpecies({
      items: [{ value: "Life Orb", count: 80, pct: 80 }],
    });
    const result = buildPipelineGraph(
      [species],
      ["ability", "item", "nature", "move"]
    );

    const itemNodes = result.nodes.filter(
      (n: PipelineNode) => n.column === "item"
    );
    expect(itemNodes).toHaveLength(1);
    expect(itemNodes[0]!.id).toBe("item:Life Orb");
  });

  it("creates ability→item link with correct value", () => {
    const species = makeSpecies({
      items: [{ value: "Life Orb", count: 80, pct: 80 }],
    });
    const result = buildPipelineGraph(
      [species],
      ["ability", "item", "nature", "move"]
    );

    const link = result.links.find(
      (l: PipelineLink) =>
        l.source === "ability:Unburden" && l.target === "item:Life Orb"
    );
    expect(link).toBeDefined();
    // value = usagePct * ability.pct * item.pct / 10000 = 20 * 100 * 80 / 10000 = 16
    expect(link!.value).toBeCloseTo(16);
  });

  it("skips item column when items array is empty", () => {
    const result = buildPipelineGraph(
      [makeSpecies({ items: [] })],
      ["ability", "item", "nature", "move"]
    );

    expect(
      result.nodes.filter((n: PipelineNode) => n.column === "item")
    ).toHaveLength(0);
    // ability→nature link should still exist (item is skipped)
    const link = result.links.find(
      (l: PipelineLink) =>
        l.source === "ability:Unburden" && l.target === "nature:Jolly"
    );
    expect(link).toBeDefined();
  });

  it("returns empty graph when columns is empty array", () => {
    const result = buildPipelineGraph([makeSpecies()], []);
    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it("respects custom column order (move before nature)", () => {
    const species = makeSpecies();
    const result = buildPipelineGraph([species], ["ability", "move", "nature"]);

    // ability→move link should exist
    const abToMove = result.links.find(
      (l: PipelineLink) =>
        l.source === "ability:Unburden" && l.target === "move:Fake Out"
    );
    expect(abToMove).toBeDefined();

    // move→nature link should exist
    const moveToNat = result.links.find(
      (l: PipelineLink) =>
        l.source === "move:Fake Out" && l.target === "nature:Jolly"
    );
    expect(moveToNat).toBeDefined();

    // ability→nature link should NOT exist (nature is after move now)
    const abToNat = result.links.find(
      (l: PipelineLink) =>
        l.source === "ability:Unburden" && l.target === "nature:Jolly"
    );
    expect(abToNat).toBeUndefined();
  });
});
