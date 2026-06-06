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
    abilities: [{ value: "Unburden", count: 80, pct: 80 }],
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
    const result = buildPipelineGraph([makeSpecies()]);
    const speciesNodes = result.nodes.filter(
      (n: PipelineNode) => n.column === "species"
    );
    expect(speciesNodes).toHaveLength(1);
    expect(speciesNodes[0]!.id).toBe("species:Sneasler");
    expect(speciesNodes[0]!.label).toBe("Sneasler");
  });

  it("creates one ability node per distinct ability", () => {
    const result = buildPipelineGraph([makeSpecies()]);
    const abilityNodes = result.nodes.filter(
      (n: PipelineNode) => n.column === "ability"
    );
    expect(abilityNodes).toHaveLength(1);
    expect(abilityNodes[0]!.id).toBe("ability:Unburden");
  });

  it("creates species→ability link with correct value", () => {
    const result = buildPipelineGraph([makeSpecies()]);
    const link = result.links.find(
      (l: PipelineLink) =>
        l.source === "species:Sneasler" && l.target === "ability:Unburden"
    );
    expect(link).toBeDefined();
    // value = usagePct * ability.pct / 100 = 20 * 80 / 100 = 16
    expect(link!.value).toBeCloseTo(16);
  });

  it("creates ability→nature link with proportionally allocated value", () => {
    const result = buildPipelineGraph([makeSpecies()]);
    const link = result.links.find(
      (l: PipelineLink) =>
        l.source === "ability:Unburden" && l.target === "nature:Jolly"
    );
    expect(link).toBeDefined();
    // value = usagePct * ability.pct/100 * nature.pct/100 = 20 * 0.8 * 0.75 = 12
    expect(link!.value).toBeCloseTo(12);
  });

  it("creates nature→move link with proportionally allocated value", () => {
    const result = buildPipelineGraph([makeSpecies()]);
    const link = result.links.find(
      (l: PipelineLink) =>
        l.source === "nature:Jolly" && l.target === "move:Fake Out"
    );
    expect(link).toBeDefined();
    // value = usagePct * nature.pct/100 * move.pct/100 = 20 * 0.75 * 0.90 = 13.5
    expect(link!.value).toBeCloseTo(13.5);
  });
});

// =============================================================================
// buildPipelineGraph — multi-ability does not inflate nature→move
// =============================================================================

describe("buildPipelineGraph — multi-ability does not inflate nature→move", () => {
  it("nature→move value is independent of ability count", () => {
    const oneAbility = buildPipelineGraph([makeSpecies()]); // single ability (Unburden)
    const twoAbility = buildPipelineGraph([
      makeSpecies({
        abilities: [
          { value: "Unburden", count: 50, pct: 50 },
          { value: "Pickpocket", count: 50, pct: 50 },
        ],
      }),
    ]);

    const nm1 = oneAbility.links.find(
      (l) => l.source === "nature:Jolly" && l.target === "move:Fake Out"
    );
    const nm2 = twoAbility.links.find(
      (l) => l.source === "nature:Jolly" && l.target === "move:Fake Out"
    );

    expect(nm2!.value).toBeCloseTo(nm1!.value);
    // = usagePct * nature.pct/100 * move.pct/100 = 20 * 0.75 * 0.90 = 13.5
    expect(nm2!.value).toBeCloseTo(13.5);
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

    const result = buildPipelineGraph([sneasler, koraidon]);

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
