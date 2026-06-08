"use client";

import { useState, useRef } from "react";
import { sankey, sankeyLinkHorizontal, type SankeyGraph } from "d3-sankey";

import { type PipelineDataResult } from "@trainers/supabase";
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { buildPipelineGraph, type PipelineNode } from "./usage-pipeline";

// =============================================================================
// Types
// =============================================================================

interface UsagePipelineChartProps {
  /** Pipeline data from server. Null when no period data exists. */
  pipelineResult: PipelineDataResult | null;
  /** Species names to show. Sidebar presets always provide an explicit list. */
  selectedSpecies: string[];
  /** Called when user clicks a species node to select/deselect it. */
  onSpeciesClick: (species: string) => void;
}

// d3-sankey extended node shape (after layout, nodes gain positional props)
interface LayoutNode extends PipelineNode {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  value: number; // d3-sankey: sum of outgoing link values (≈ usagePct for species)
  index?: number;
}

interface LayoutLink {
  source: LayoutNode;
  target: LayoutNode;
  value: number;
  width: number;
  y0: number;
  y1: number;
  // Carry original IDs for highlight logic
  sourceId: string;
  targetId: string;
}

// =============================================================================
// Constants
// =============================================================================

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 420;
const NODE_WIDTH = 18;
const NODE_PADDING = 12;
const SPRITE_BAND = 32; // SVG units reserved on the left for species sprites
const SPRITE_GAP = 4; // gap between sprite right-edge and species bar

const COLUMN_LABELS: Record<string, string> = {
  species: "Species",
  ability: "Ability",
  nature: "Nature",
  move: "Move",
};

// =============================================================================
// UsagePipelineChart
// =============================================================================

export function UsagePipelineChart({
  pipelineResult,
  selectedSpecies,
  onSpeciesClick,
}: UsagePipelineChartProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltipNode, setTooltipNode] = useState<LayoutNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({
    x: 0,
    y: 0,
    containerWidth: 400,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  if (!pipelineResult || pipelineResult.data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        No pipeline data for this period.
      </div>
    );
  }

  // Filter to only the explicitly selected species
  const visibleSpecies = pipelineResult.data.filter((s) =>
    selectedSpecies.includes(s.species)
  );

  if (visibleSpecies.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        No Pokémon selected. Use the sidebar to choose species.
      </div>
    );
  }

  const graph = buildPipelineGraph(visibleSpecies);

  if (graph.nodes.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        No pipeline data available.
      </div>
    );
  }

  // ── d3-sankey layout ─────────────────────────────────────────────────────
  // Cast to the shape d3-sankey expects (it will mutate nodes/links with layout info)
  type D3Node = PipelineNode & { index?: number };
  type D3Link = {
    source: string | D3Node;
    target: string | D3Node;
    value: number;
  };

  const layoutInput: SankeyGraph<D3Node, D3Link> = {
    nodes: graph.nodes.map((n) => ({ ...n })),
    links: graph.links.map((l) => ({ ...l })),
  };

  const sankeyLayout = sankey<D3Node, D3Link>()
    .nodeId((d) => d.id)
    .nodeWidth(NODE_WIDTH)
    .nodePadding(NODE_PADDING)
    .nodeAlign((node) => {
      // Align by column: species=0, ability=1, nature=2, move=3
      const order: Record<string, number> = {
        species: 0,
        ability: 1,
        nature: 2,
        move: 3,
      };
      return order[(node as D3Node).column] ?? 0;
    })
    .extent([
      [SPRITE_BAND + SPRITE_GAP, 30], // was [0, 30] — reserve left band for sprites
      [VIEWBOX_WIDTH, VIEWBOX_HEIGHT - 10],
    ]);

  const { nodes: layoutNodes, links: layoutLinks } = sankeyLayout(layoutInput);

  // Typed path generator — d3-sankey's factory takes no arguments; the returned
  // function accepts each laid-out link and returns its SVG path string.
  const linkPath = sankeyLinkHorizontal<D3Node, D3Link>();

  // ── Highlight logic ───────────────────────────────────────────────────────
  // When a node is hovered, highlight all links connected to it (directly or transitively).
  // Phase 1: highlight direct links only. Dimmed = opacity 0.15.
  const connectedNodeIds = hoveredNodeId
    ? new Set<string>([
        hoveredNodeId,
        ...(layoutLinks as unknown as LayoutLink[]).flatMap((l) => {
          const sId = (l.source as unknown as LayoutNode).id;
          const tId = (l.target as unknown as LayoutNode).id;
          if (sId === hoveredNodeId || tId === hoveredNodeId) return [sId, tId];
          return [];
        }),
      ])
    : null;

  const nodeOpacity = (nodeId: string) => {
    if (!connectedNodeIds) return 1;
    return connectedNodeIds.has(nodeId) ? 1 : 0.15;
  };

  const linkOpacity = (link: LayoutLink) => {
    if (!connectedNodeIds) return 0.4;
    return connectedNodeIds.has(link.sourceId) &&
      connectedNodeIds.has(link.targetId)
      ? 0.7
      : 0.08;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const typedNodes = layoutNodes as unknown as LayoutNode[];

  // Extract column header x-positions from first node in each column
  const columnHeaderX: Record<string, number> = {};
  for (const node of typedNodes) {
    if (!(node.column in columnHeaderX)) {
      columnHeaderX[node.column] = (node.x0 + node.x1) / 2;
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="w-full"
        style={{ height: "clamp(400px, 65vh, 720px)" }}
        aria-label="Meta Pipeline Sankey diagram"
        onMouseLeave={() => setTooltipNode(null)}
      >
        {/* Column headers */}
        {Object.entries(columnHeaderX).map(([col, cx]) => (
          <text
            key={col}
            x={cx}
            y={18}
            textAnchor="middle"
            className="fill-muted-foreground text-xs font-semibold tracking-widest uppercase"
            style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}
          >
            {COLUMN_LABELS[col] ?? col}
          </text>
        ))}

        {/* Links — map the laid-out links (correctly typed for linkPath) */}
        {layoutLinks.map((link) => {
          // After layout, source/target are node objects; reconstruct ids for
          // the highlight logic.
          const sourceNode = link.source as unknown as LayoutNode;
          const targetNode = link.target as unknown as LayoutNode;
          const enrichedLink: LayoutLink = {
            ...(link as unknown as LayoutLink),
            sourceId: sourceNode.id,
            targetId: targetNode.id,
          };
          return (
            <path
              key={`${enrichedLink.sourceId}-${enrichedLink.targetId}`}
              d={linkPath(link) ?? ""}
              fill="none"
              stroke={sourceNode.color}
              strokeWidth={Math.max(1, link.width ?? 0)}
              strokeOpacity={linkOpacity(enrichedLink)}
              style={{ transition: "stroke-opacity 0.15s" }}
            />
          );
        })}

        {/* Nodes */}
        {typedNodes.map((node) => {
          const isSpecies = node.column === "species";
          const isSelected = isSpecies && selectedSpecies.includes(node.label);
          const sprite = isSpecies ? getPokemonSprite(node.label) : null;
          const midY = (node.y0 + node.y1) / 2;
          const spriteSize = Math.min(SPRITE_BAND, node.y1 - node.y0);
          return (
            <g
              key={node.id}
              role={isSpecies ? "button" : undefined}
              tabIndex={isSpecies ? 0 : undefined}
              aria-label={
                isSpecies
                  ? `${isSelected ? "Deselect" : "Select"} ${node.label}`
                  : undefined
              }
              aria-pressed={isSpecies ? isSelected : undefined}
              opacity={nodeOpacity(node.id)}
              onMouseEnter={(e) => {
                setHoveredNodeId(node.id);
                if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect();
                  setTooltipPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    containerWidth: containerRef.current.offsetWidth,
                  });
                  setTooltipNode(node);
                }
              }}
              onMouseLeave={() => {
                setHoveredNodeId(null);
                setTooltipNode(null);
              }}
              onClick={() => isSpecies && onSpeciesClick(node.label)}
              onKeyDown={(e) => {
                if (isSpecies && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSpeciesClick(node.label);
                }
              }}
              style={{
                cursor: isSpecies ? "pointer" : "default",
                transition: "opacity 0.15s",
              }}
            >
              <rect
                x={node.x0}
                y={node.y0}
                width={node.x1 - node.x0}
                height={Math.max(1, node.y1 - node.y0)}
                fill={node.color}
                rx={3}
                stroke={isSelected ? "white" : "transparent"}
                strokeWidth={isSelected ? 2 : 0}
              />
              {/* Species: sprite icon in the left band. Others: text label to the right. */}
              {isSpecies && sprite ? (
                <image
                  href={sprite.url}
                  x={node.x0 - SPRITE_BAND - SPRITE_GAP}
                  y={midY - spriteSize / 2}
                  width={spriteSize}
                  height={spriteSize}
                  aria-hidden="true"
                  style={
                    sprite.pixelated
                      ? { imageRendering: "pixelated" }
                      : undefined
                  }
                />
              ) : node.y1 - node.y0 > 14 ? (
                <text
                  x={node.x1 + 6}
                  y={(node.y0 + node.y1) / 2}
                  dominantBaseline="middle"
                  style={{ fontSize: 10, fill: "var(--foreground)" }}
                >
                  {node.label.length > 12
                    ? node.label.slice(0, 11) + "…"
                    : node.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* Floating tooltip */}
      {tooltipNode && (
        <div
          className="bg-popover pointer-events-none absolute z-10 rounded-md border px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: Math.min(tooltipPos.x + 14, tooltipPos.containerWidth - 120),
            top: Math.max(4, tooltipPos.y - 28),
          }}
        >
          <span className="font-medium">{tooltipNode.label}</span>
          {tooltipNode.column === "species" && (
            <span className="text-muted-foreground ml-1">
              · {Math.round(tooltipNode.value)}%
            </span>
          )}
        </div>
      )}

      {/* Period label */}
      <p className="text-muted-foreground mt-1 text-right text-xs">
        {formatPeriodRange(
          pipelineResult.periodStart,
          pipelineResult.periodEnd
        )}
      </p>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatPeriodRange(start: string, end: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}
