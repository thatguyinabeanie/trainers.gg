# Sankey Chart: Sprite Labels, Hover Tooltip, Larger Size

## Context

The Meta Pipeline Sankey chart at `/data` currently identifies species with
truncated text labels only. Users can't easily tell which Pokémon they're
looking at. The chart is also modestly sized — not prominent enough for a hero
visualization. This spec covers three coordinated improvements.

---

## Decisions

| Topic | Decision |
|---|---|
| Species identification | Sprite icon only — no persistent text label |
| Hover behavior | Floating HTML tooltip (name + usage % for species; name only for others) |
| Chart height | `clamp(400px, 65vh, 720px)` — significantly taller |
| Chart width | No container change — SVG is already `w-full`; height alone makes it more prominent |

---

## 1 — Sprite Band

**File:** `usage-pipeline-chart.tsx`

### Constants (new/changed)

```typescript
const SPRITE_BAND = 32;   // SVG units reserved on the left for sprites
const SPRITE_GAP  = 4;    // gap between sprite right-edge and species bar
```

### d3-sankey extent (changed)

```typescript
.extent([
  [SPRITE_BAND + SPRITE_GAP, 30],   // was [0, 30]
  [VIEWBOX_WIDTH, VIEWBOX_HEIGHT - 10],
])
```

### Rendering species sprites

For each species node, render an `<image>` element to the left of the bar:

```tsx
{isSpecies && (() => {
  const sprite = getPokemonSprite(node.label);
  const midY = (node.y0 + node.y1) / 2;
  const size = Math.min(SPRITE_BAND, node.y1 - node.y0);
  return (
    <image
      href={sprite.url}
      x={node.x0 - SPRITE_BAND - SPRITE_GAP}
      y={midY - size / 2}
      width={size}
      height={size}
      style={sprite.pixelated ? { imageRendering: "pixelated" } : undefined}
    />
  );
})()}
```

- Sprite size is clamped to the node height so short nodes don't overflow
- Import: `import { getPokemonSprite } from "@trainers/pokemon/sprites"`

### Remove species text labels

The existing `<text>` label block is applied to all nodes when `node.y1 - node.y0 > 14`.
Change to only render the text for non-species nodes:

```tsx
{node.y1 - node.y0 > 14 && !isSpecies && (
  <text ...>...</text>
)}
```

---

## 2 — Floating Tooltip

**File:** `usage-pipeline-chart.tsx`

### State (new)

```typescript
const [tooltipNode, setTooltipNode] = useState<LayoutNode | null>(null);
const [tooltipPos, setTooltipPos]   = useState({ x: 0, y: 0 });
const containerRef = useRef<HTMLDivElement>(null);
```

### Container div

Wrap the `<svg>` in a `<div ref={containerRef} className="relative w-full">`.
The existing `<div className="w-full">` becomes this container.

### Node interaction (updated)

Add tooltip tracking to the `onMouseEnter` handler on each node `<g>`:

```tsx
onMouseEnter={(e) => {
  setHoveredNodeId(node.id);
  if (containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTooltipNode(node);
  }
}}
onMouseLeave={() => {
  setHoveredNodeId(null);
  setTooltipNode(null);
}}
```

### Tooltip element (new)

Rendered as a sibling to `<svg>` inside the container div:

```tsx
{tooltipNode && (
  <div
    className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
    style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 28 }}
  >
    <span className="font-medium">{tooltipNode.label}</span>
    {tooltipNode.column === "species" && (
      <span className="text-muted-foreground ml-1">
        · {Math.round(tooltipNode.value)}%
      </span>
    )}
  </div>
)}
```

**Tooltip content by column:**

| Column | Display |
|---|---|
| species | `Garchomp · 68%` |
| ability | `Rough Skin` |
| nature | `Jolly` |
| move | `Protect` |

Species tooltip shows `Math.round(node.value)` as the usage %. For species nodes,
`node.value` equals `usagePct` (sum of outgoing ability links = usagePct × Σ ability.pct/100 ≈ usagePct).

---

## 3 — Chart Size

**File:** `usage-pipeline-chart.tsx`

```tsx
// Before:
style={{ height: "clamp(260px, 40vh, 460px)" }}

// After:
style={{ height: "clamp(400px, 65vh, 720px)" }}
```

`VIEWBOX_HEIGHT` stays at 420 — the SVG coordinate system doesn't need to
change. At a taller rendered height, d3-sankey distributes the same nodes over
more vertical pixels, giving them more spacing and making the species nodes
taller and easier to click.

---

## Files Changed

| File | Change |
|---|---|
| `apps/web/src/components/data/usage-pipeline-chart.tsx` | Sprite band + tooltip state + height clamp |
| `apps/web/src/components/data/__tests__/usage-pipeline-chart.test.tsx` | Update snapshot / add tooltip render test |

---

## Out of Scope

- Tooltip for the species name on mobile (touch devices have no hover — sprites are the only label)
- Ability/Nature/Move % in tooltip (flow values aren't directly interpretable as per-species percentages)
- Sprite caching or lazy-loading (sprites are already small PNGs from PokeAPI CDN)
