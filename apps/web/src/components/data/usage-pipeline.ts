import { type PipelineSpeciesData } from "@trainers/supabase";
import { assignColor } from "./usage-series";

// =============================================================================
// Types
// =============================================================================

/** One node in the Sankey graph — a species, ability, nature, or move. */
export interface PipelineNode {
  /** Unique identifier, e.g. "species:Sneasler" or "ability:Unburden". */
  id: string;
  /** Human-readable label. */
  label: string;
  /** Which column this node belongs to. */
  column: "species" | "ability" | "nature" | "move";
  /** Color — species nodes use assignColor(); others use the teal palette. */
  color: string;
}

/** One directed flow between two nodes. */
export interface PipelineLink {
  /** Source node id. */
  source: string;
  /** Target node id. */
  target: string;
  /**
   * Flow value — proportionally allocated usage % contribution.
   *
   * Computed using independence assumption (Phase 1):
   *   species→ability:  usagePct × ability.pct / 100
   *   ability→nature:   usagePct × ability.pct/100 × nature.pct/100
   *   nature→move:      usagePct × nature.pct/100 × move.pct/100
   */
  value: number;
}

/** Complete Sankey graph ready for d3-sankey layout. */
export interface PipelineGraph {
  nodes: PipelineNode[];
  links: PipelineLink[];
}

// =============================================================================
// Column colors
// =============================================================================

const COLUMN_COLORS: Record<"ability" | "nature" | "move", string> = {
  ability: "oklch(0.66 0.12 180)",
  nature: "oklch(0.66 0.12 200)",
  move: "oklch(0.66 0.12 220)",
};

// =============================================================================
// buildPipelineGraph
// =============================================================================

/**
 * Transform an array of `PipelineSpeciesData` into a `PipelineGraph` ready for
 * d3-sankey layout.
 *
 * Link widths use proportional allocation (independence assumption): flows are
 * distributed by multiplying marginal percentages. For Phase 2 (true joint
 * distributions), this function can be replaced without changing consumers.
 *
 * Returns `{ nodes: [], links: [] }` when `species` is empty.
 */
export function buildPipelineGraph(
  species: PipelineSpeciesData[]
): PipelineGraph {
  if (species.length === 0) return { nodes: [], links: [] };

  // ── Accumulate nodes (deduplicated by id) ──────────────────────────────────
  const nodeMap = new Map<string, PipelineNode>();

  const ensureNode = (
    id: string,
    label: string,
    column: PipelineNode["column"],
    color: string
  ): void => {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, { id, label, column, color });
    }
  };

  // ── Accumulate links (aggregated by source+target key) ─────────────────────
  const linkMap = new Map<string, PipelineLink>();

  const addLink = (source: string, target: string, value: number): void => {
    const key = `${source}→${target}`;
    const existing = linkMap.get(key);
    if (existing) {
      existing.value += value;
    } else {
      linkMap.set(key, { source, target, value });
    }
  };

  // ── Process each species ───────────────────────────────────────────────────
  // Note: a species with an empty `abilities` array produces a species node with
  // no outgoing links. d3-sankey can place such a floating node oddly, but real
  // Phase-1 data always has histograms, so this is acceptable; revisit if empty
  // histograms appear in practice.
  for (const s of species) {
    const speciesId = `species:${s.species}`;
    ensureNode(speciesId, s.species, "species", assignColor(s.species));

    for (const ability of s.abilities) {
      const abilityId = `ability:${ability.value}`;
      ensureNode(abilityId, ability.value, "ability", COLUMN_COLORS.ability);

      // species → ability
      addLink(speciesId, abilityId, (s.usagePct * ability.pct) / 100);

      for (const nature of s.natures) {
        const natureId = `nature:${nature.value}`;
        ensureNode(natureId, nature.value, "nature", COLUMN_COLORS.nature);

        // ability → nature (proportional allocation)
        addLink(
          abilityId,
          natureId,
          (s.usagePct * ability.pct * nature.pct) / 10000
        );
      }
    }

    // nature → move is independent of ability — allocate once per species,
    // NOT once per ability (otherwise multi-ability species inflate the move column).
    for (const nature of s.natures) {
      const natureId = `nature:${nature.value}`;
      for (const move of s.moves) {
        const moveId = `move:${move.value}`;
        ensureNode(moveId, move.value, "move", COLUMN_COLORS.move);

        // nature → move (proportional allocation)
        addLink(natureId, moveId, (s.usagePct * nature.pct * move.pct) / 10000);
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links: Array.from(linkMap.values()),
  };
}
