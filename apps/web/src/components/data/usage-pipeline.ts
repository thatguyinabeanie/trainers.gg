import { type PipelineSpeciesData } from "@trainers/supabase";
import { assignColor } from "./usage-series";
import { type PipelineColumn } from "./usage-filters";

// =============================================================================
// Types
// =============================================================================

/** One node in the Sankey graph. */
export interface PipelineNode {
  id: string;
  label: string;
  column: "species" | PipelineColumn;
  color: string;
}

/** One directed flow between two nodes. */
export interface PipelineLink {
  source: string;
  target: string;
  /**
   * Flow value — proportional allocation (independence assumption).
   *
   * species→col[0]:  usagePct × entry.pct / 100
   * col[i]→col[i+1]: usagePct × entryA.pct × entryB.pct / 10000
   *
   * Accumulated across all species when source+target pair is shared.
   */
  value: number;
}

/** Complete Sankey graph ready for d3-sankey layout. */
export interface PipelineGraph {
  nodes: PipelineNode[];
  links: PipelineLink[];
}

// =============================================================================
// Column colors — one teal hue per column
// =============================================================================

export const COLUMN_COLORS: Record<PipelineColumn, string> = {
  ability: "oklch(0.66 0.12 180)",
  item: "oklch(0.66 0.12 195)",
  nature: "oklch(0.66 0.12 210)",
  move: "oklch(0.66 0.12 225)",
};

// Maps PipelineColumn → the field name on PipelineSpeciesData
const COLUMN_DATA_KEY: Record<
  PipelineColumn,
  "abilities" | "items" | "natures" | "moves"
> = {
  ability: "abilities",
  item: "items",
  nature: "natures",
  move: "moves",
};

// =============================================================================
// buildPipelineGraph
// =============================================================================

/**
 * Transform an array of `PipelineSpeciesData` into a `PipelineGraph`.
 *
 * `columns` controls which non-species columns appear and in what order.
 * Columns whose data array is empty for a given species are skipped for that
 * species — so the graph degrades gracefully when a species has no item data.
 *
 * Returns `{ nodes: [], links: [] }` when `species` or `columns` is empty.
 */
export function buildPipelineGraph(
  species: PipelineSpeciesData[],
  columns: PipelineColumn[] = ["ability", "item", "nature", "move"]
): PipelineGraph {
  if (species.length === 0 || columns.length === 0)
    return { nodes: [], links: [] };

  const nodeMap = new Map<string, PipelineNode>();
  const linkMap = new Map<string, PipelineLink>();

  const ensureNode = (
    id: string,
    label: string,
    column: PipelineNode["column"],
    color: string
  ): void => {
    if (!nodeMap.has(id)) nodeMap.set(id, { id, label, column, color });
  };

  const addLink = (source: string, target: string, value: number): void => {
    const key = `${source}→${target}`;
    const existing = linkMap.get(key);
    if (existing) {
      existing.value += value;
    } else {
      linkMap.set(key, { source, target, value });
    }
  };

  for (const s of species) {
    const speciesId = `species:${s.species}`;
    ensureNode(speciesId, s.species, "species", assignColor(s.species));

    // Only include columns that have data for this species
    const activeColumns = columns.filter(
      (col) => s[COLUMN_DATA_KEY[col]].length > 0
    );

    if (activeColumns.length === 0) continue;

    // species → first active column
    const firstCol = activeColumns[0]!;
    for (const entry of s[COLUMN_DATA_KEY[firstCol]]) {
      const nodeId = `${firstCol}:${entry.value}`;
      ensureNode(nodeId, entry.value, firstCol, COLUMN_COLORS[firstCol]);
      addLink(speciesId, nodeId, (s.usagePct * entry.pct) / 100);
    }

    // col[i] → col[i+1] for each adjacent active pair
    for (let i = 0; i < activeColumns.length - 1; i++) {
      const colA = activeColumns[i]!;
      const colB = activeColumns[i + 1]!;
      for (const entryA of s[COLUMN_DATA_KEY[colA]]) {
        const nodeIdA = `${colA}:${entryA.value}`;
        for (const entryB of s[COLUMN_DATA_KEY[colB]]) {
          const nodeIdB = `${colB}:${entryB.value}`;
          ensureNode(nodeIdB, entryB.value, colB, COLUMN_COLORS[colB]);
          addLink(
            nodeIdA,
            nodeIdB,
            (s.usagePct * entryA.pct * entryB.pct) / 10000
          );
        }
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links: Array.from(linkMap.values()),
  };
}
