# Sankey Sprite Labels, Tooltip, and Size — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Meta Pipeline Sankey chart on `/data` more readable and prominent — species bars show Pokémon sprite thumbnails, hovering any node shows a floating tooltip, and the chart is significantly taller.

**Architecture:** All changes are confined to `usage-pipeline-chart.tsx` (the client SVG component) and its co-located test file. Sprites are rendered as SVG `<image>` elements inside the existing SVG viewBox. The tooltip is an HTML `<div>` overlay inside a `relative`-positioned container div; it's positioned absolutely using mouse coordinates captured on `mouseEnter`. No new files or packages are needed.

**Tech Stack:** React 19, d3-sankey, `@trainers/pokemon/sprites` (already in workspace), Tailwind CSS 4, JSDOM for tests.

---

## File Map

| File | Change |
|---|---|
| `apps/web/src/components/data/usage-pipeline-chart.tsx` | All three features: height clamp, sprite band, tooltip |
| `apps/web/src/components/data/__tests__/usage-pipeline-chart.test.tsx` | Mock `getPokemonSprite`, replace label-truncation tests with sprite tests, add tooltip tests |

---

## Task 1: Increase chart height

**Files:**
- Modify: `apps/web/src/components/data/usage-pipeline-chart.tsx` (line 189)

This is a visual-only change — no new tests needed.

- [ ] **Step 1: Update the SVG height clamp**

In `usage-pipeline-chart.tsx`, find the inline style on the `<svg>` element (currently at line ~189):

```tsx
// Before
style={{ height: "clamp(260px, 40vh, 460px)" }}

// After
style={{ height: "clamp(400px, 65vh, 720px)" }}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/data/usage-pipeline-chart.tsx
git commit -m "feat(data): increase Sankey chart height to clamp(400px, 65vh, 720px)"
```

---

## Task 2: Species sprite band (TDD)

**Files:**
- Modify: `apps/web/src/components/data/__tests__/usage-pipeline-chart.test.tsx`
- Modify: `apps/web/src/components/data/usage-pipeline-chart.tsx`

### Context

The current d3-sankey extent starts at x=0, leaving no left margin. Species nodes currently show a `<text>` label to their right. This task:
1. Reserves a 32-unit band on the left of the SVG for sprite `<image>` elements
2. Pushes the layout extent right to make room
3. Removes `<text>` labels from species nodes (sprites replace them)
4. Renders `<image>` elements vertically centered on each species node

- [ ] **Step 3: Add mock for `getPokemonSprite` at the top of the test file**

Open `apps/web/src/components/data/__tests__/usage-pipeline-chart.test.tsx`. Add this mock directly below the existing imports (before any `describe` blocks):

```tsx
jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: (species: string) => ({
    url: `https://sprites.test/${species}.png`,
    pixelated: true,
  }),
}));
```

- [ ] **Step 4: Write failing tests for sprite rendering**

Replace the entire `describe("UsagePipelineChart — label truncation", ...)` block (lines 287–319) with:

```tsx
// =============================================================================
// Species sprite labels
// =============================================================================

describe("UsagePipelineChart — species sprite labels", () => {
  it("renders a sprite <image> element for each species node", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler" })],
      }),
    });
    const images = container.querySelectorAll("image");
    expect(images.length).toBeGreaterThan(0);
    const spriteImg = Array.from(images).find((img) =>
      img.getAttribute("href")?.includes("Sneasler")
    );
    expect(spriteImg).toBeTruthy();
  });

  it("does NOT render species name as a <text> label", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler" })],
      }),
    });
    const speciesTexts = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.textContent === "Sneasler"
    );
    expect(speciesTexts.length).toBe(0);
  });
});
```

- [ ] **Step 5: Run failing tests to verify they fail**

```bash
pnpm --filter @trainers/web test -- --testPathPattern="usage-pipeline-chart" 2>&1 | tail -30
```

Expected: both new tests FAIL ("Expected: > 0 / Received: 0" for images, and the species-text test may pass or fail depending on current behavior).

- [ ] **Step 6: Implement sprite band in `usage-pipeline-chart.tsx`**

**6a — Add constants** (after the existing constants block, around line 53):

```tsx
const SPRITE_BAND = 32;  // SVG units reserved on the left for species sprites
const SPRITE_GAP = 4;    // gap between sprite right-edge and species bar
```

**6b — Add `getPokemonSprite` import** (in the imports section, after the existing imports):

```tsx
import { getPokemonSprite } from "@trainers/pokemon/sprites";
```

**6c — Update `LayoutNode` type** to include d3-sankey's computed `value` (needed by tooltip in Task 3, add now):

```tsx
interface LayoutNode extends PipelineNode {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  value: number;   // d3-sankey: sum of outgoing link values (≈ usagePct for species)
  index?: number;
}
```

**6d — Update the d3-sankey extent** (currently `[[0, 30], ...]`, around line 134):

```tsx
.extent([
  [SPRITE_BAND + SPRITE_GAP, 30],   // was [0, 30] — reserve left band for sprites
  [VIEWBOX_WIDTH, VIEWBOX_HEIGHT - 10],
])
```

**6e — Replace species text label with sprite `<image>`** in the node render block.

Find this existing `<text>` block (around line 266):

```tsx
{/* Label — show if tall enough */}
{node.y1 - node.y0 > 14 && (
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
)}
```

Replace it with:

```tsx
{/* Species: sprite icon in the left band. Others: text label to the right. */}
{isSpecies ? (
  (() => {
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
  })()
) : (
  node.y1 - node.y0 > 14 && (
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
  )
)}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
pnpm --filter @trainers/web test -- --testPathPattern="usage-pipeline-chart" 2>&1 | tail -30
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/data/usage-pipeline-chart.tsx \
        apps/web/src/components/data/__tests__/usage-pipeline-chart.test.tsx
git commit -m "feat(data): species sprite icons in Sankey left band, replace text labels"
```

---

## Task 3: Floating tooltip (TDD)

**Files:**
- Modify: `apps/web/src/components/data/__tests__/usage-pipeline-chart.test.tsx`
- Modify: `apps/web/src/components/data/usage-pipeline-chart.tsx`

### Context

The tooltip is an HTML `<div>` overlay rendered as a sibling to the `<svg>` inside a `relative`-positioned container `<div>`. A `useRef` on the container converts mouse client coordinates to container-relative coordinates. A `onMouseLeave` on the `<svg>` (not the node `<g>`) clears the tooltip — this prevents flicker as the mouse moves between adjacent nodes.

The tooltip content:
- Species nodes: `"Sneasler"` + `" · 30%"` (usage percentage from `node.value`)
- All other nodes: label only (ability/nature/move flow values aren't clean percentages)

- [ ] **Step 9: Write failing tooltip tests**

Append this `describe` block to `usage-pipeline-chart.test.tsx`:

```tsx
// =============================================================================
// Tooltip
// =============================================================================

describe("UsagePipelineChart — tooltip", () => {
  it("shows a tooltip with the species name when mouseEnter fires on a species node", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler", usagePct: 30 })],
      }),
    });
    const groups = Array.from(container.querySelectorAll("g"));
    const speciesGroup = groups.find((g) => g.style.cursor === "pointer");
    expect(speciesGroup).toBeTruthy();

    fireEvent.mouseEnter(speciesGroup!);

    expect(screen.getByText("Sneasler")).toBeInTheDocument();
  });

  it("shows usage percentage for species tooltip", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler", usagePct: 30 })],
      }),
    });
    const groups = Array.from(container.querySelectorAll("g"));
    const speciesGroup = groups.find((g) => g.style.cursor === "pointer");
    fireEvent.mouseEnter(speciesGroup!);
    // Tooltip shows "· 30%" alongside the name
    expect(screen.getByText(/30%/)).toBeInTheDocument();
  });

  it("hides the tooltip when mouse leaves the SVG", () => {
    const { container } = renderChart({
      pipelineResult: makePipelineResult({
        data: [makePipelineSpecies({ species: "Sneasler", usagePct: 30 })],
      }),
    });
    const groups = Array.from(container.querySelectorAll("g"));
    const speciesGroup = groups.find((g) => g.style.cursor === "pointer");
    fireEvent.mouseEnter(speciesGroup!);
    expect(screen.getByText("Sneasler")).toBeInTheDocument();

    const svg = container.querySelector("svg")!;
    fireEvent.mouseLeave(svg);
    expect(screen.queryByText("Sneasler")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run failing tests to verify they fail**

```bash
pnpm --filter @trainers/web test -- --testPathPattern="usage-pipeline-chart" 2>&1 | tail -30
```

Expected: three new tooltip tests FAIL.

- [ ] **Step 11: Implement tooltip in `usage-pipeline-chart.tsx`**

**11a — Update imports** to add `useRef`:

```tsx
import { useState, useRef } from "react";
```

**11b — Add tooltip state** directly after the existing `hoveredNodeId` state (around line 72):

```tsx
const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
const [tooltipNode, setTooltipNode] = useState<LayoutNode | null>(null);
const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
const containerRef = useRef<HTMLDivElement>(null);
```

**11c — Update the outer return `<div>` wrapper** to add `ref` and `relative` positioning:

```tsx
// Before:
return (
  <div className="w-full">
    <svg ...

// After:
return (
  <div ref={containerRef} className="relative w-full">
    <svg ...
```

**11d — Add `onMouseLeave` to the `<svg>` element** to clear tooltip when the cursor leaves the chart area entirely:

```tsx
<svg
  viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
  className="w-full"
  style={{ height: "clamp(400px, 65vh, 720px)" }}
  aria-label="Meta Pipeline Sankey diagram"
  onMouseLeave={() => setTooltipNode(null)}
>
```

**11e — Update each node `<g>`'s `onMouseEnter`** to also capture tooltip state:

```tsx
// Before:
onMouseEnter={() => setHoveredNodeId(node.id)}
onMouseLeave={() => setHoveredNodeId(null)}

// After:
onMouseEnter={(e) => {
  setHoveredNodeId(node.id);
  if (containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTooltipNode(node);
  }
}}
onMouseLeave={() => setHoveredNodeId(null)}
```

**11f — Add tooltip div** as a sibling to `<svg>`, inside the container div, just before the closing `</div>` of the outer wrapper:

```tsx
      </svg>

      {/* Floating tooltip */}
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

      {/* Period label */}
      <p className="text-muted-foreground mt-1 text-right text-xs">
```

- [ ] **Step 12: Run all tests to verify they pass**

```bash
pnpm --filter @trainers/web test -- --testPathPattern="usage-pipeline-chart" 2>&1 | tail -30
```

Expected: all tests PASS, including the three new tooltip tests.

- [ ] **Step 13: Commit**

```bash
git add apps/web/src/components/data/usage-pipeline-chart.tsx \
        apps/web/src/components/data/__tests__/usage-pipeline-chart.test.tsx
git commit -m "feat(data): floating tooltip on Sankey node hover (name + usage% for species)"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Sprite-only species labels → Task 2
- ✅ Floating tooltip (name + % for species, name for others) → Task 3
- ✅ Chart height `clamp(400px, 65vh, 720px)` → Task 1
- ✅ No text labels for species → Task 2 (Step 6e removes them)
- ✅ `SPRITE_BAND + SPRITE_GAP` extent shift → Task 2 (Step 6d)
- ✅ `LayoutNode.value` typed → Task 2 (Step 6c)

**Type consistency:**
- `LayoutNode.value` added in Task 2 Step 6c, consumed in Task 3 Step 11f — consistent
- `SPRITE_BAND` and `SPRITE_GAP` defined in Task 2 Step 6a, used in Steps 6d and 6e — consistent
- `tooltipNode`, `tooltipPos`, `containerRef` defined in Task 3 Step 11b, used in Steps 11e and 11f — consistent

**No placeholders:** All code blocks are complete and concrete.
