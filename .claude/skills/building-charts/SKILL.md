---
name: building-charts
description: Use when building data visualizations — recharts charts, or usage-over-time lines on /data and dashboards
---

# Building Charts

Data visualizations in the web app: recharts (line, pie, sparkline), hand-rolled SVG, and CSS grid layouts.

> **Note:** The d3-sankey `UsagePipelineChart` was removed in Phase 3. The treemap (Phase 2) is now the primary "meta now" snapshot. Only `recharts` and `d3-sankey` (installed) remain, but no new Sankey surfaces should be added.

## Reference Components

| Component                      | Path                                                              | Library                                       |
| ------------------------------ | ----------------------------------------------------------------- | --------------------------------------------- |
| `UsageLineChart`               | `apps/web/src/components/data/usage-line-chart.tsx`               | recharts `LineChart` + `Brush`                |
| `UsageSparkline`               | `apps/web/src/components/team-builder/usage-sparkline.tsx`        | recharts `LineChart` (no axes)                |
| Admin pie                      | `apps/web/src/app/(app)/admin/page.tsx`                           | recharts `PieChart` + shadcn `ChartContainer` |
| `SpeciesFingerprint`           | `apps/web/src/components/data/species-fingerprint.tsx`            | recharts `PieChart` (donut grid)              |
| `SpeciesTeammateConstellation` | `apps/web/src/components/data/species-teammate-constellation.tsx` | hand-rolled SVG + absolute-positioned bubbles |
| `SpeciesTeammateHeatmap`       | `apps/web/src/components/data/species-teammate-heatmap.tsx`       | CSS grid                                      |
| `SpeciesTimeline`              | `apps/web/src/components/data/species-timeline.tsx`               | recharts `LineChart` (via `UsageLineChart`)   |

## Colors: OKLCH Only — Never Hardcoded Hex

### Series colors — `assignColor()` (deterministic per species name)

```ts
// apps/web/src/components/data/usage-series.ts
function assignColor(species: string): string {
  let sum = 0;
  for (let i = 0; i < species.length; i++) sum += species.charCodeAt(i);
  return `oklch(0.66 0.12 ${sum % 360})`;
}
```

Color is keyed to the species name — toggling filters never shifts existing colors.

### Donut / categorical slice colors — `DONUT_SLICE_COLORS` fixed ramp

```ts
// apps/web/src/components/data/data-shared.ts
export const DONUT_SLICE_COLORS: string[] = [
  "oklch(0.66 0.12 180)",
  "oklch(0.66 0.12 195)",
  "oklch(0.66 0.12 210)",
  "oklch(0.66 0.12 225)",
  "oklch(0.66 0.12 240)",
  "oklch(0.50 0.04 260)", // "Other" gray
];
```

Use for dimension-value slices (items, abilities, tera types, natures) — **not** `assignColor`, which is for species.

### Status / categorical colors — `CHART_COLORS` map

```ts
// apps/web/src/app/(app)/admin/helpers.ts
export const CHART_COLORS = {
  active: "oklch(0.765 0.177 163.22)", // emerald
  upcoming: "oklch(0.623 0.214 259.53)", // blue
  draft: "oklch(0.705 0.015 286.07)", // muted gray
  // ...
};
```

### CSS variables for axes/chrome — adapts to light/dark

```tsx
axisLine={{ stroke: "var(--border)" }}
tick={{ fill: "var(--muted-foreground)" }}
stroke="var(--primary)"   // teal — used in UsageSparkline
fill="var(--muted)"       // Brush background
```

See `design-system` for the full OKLCH token vocabulary.

## ResponsiveContainer

Every recharts chart must be wrapped so it fills its container:

```tsx
<ResponsiveContainer width="100%" height={180}>
  <LineChart
    data={chartData}
    margin={{ top: 4, right: 16, bottom: 20, left: 0 }}
  >
    {/* axes, lines, tooltip, brush */}
  </LineChart>
</ResponsiveContainer>
```

`height` is a fixed number. Never use `"100%"` unless the parent has an explicit height. The Sankey uses a raw `<svg viewBox="...">` with `style={{ height: "clamp(400px, 65vh, 720px)" }}` — no `ResponsiveContainer` needed.

## Tooltip / Legend Style

### Recharts custom tooltip

```tsx
<Tooltip
  content={({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border-border rounded-md border px-2 py-1 text-xs shadow-sm">
        <p className="text-muted-foreground mb-1">{formatAxisLabel(label)}</p>
        {payload.slice(0, 8).map((entry) => (
          <p
            key={entry.dataKey as string}
            style={{ color: entry.color as string }}
          >
            {entry.dataKey}: {Number(entry.value).toFixed(1)}%
          </p>
        ))}
      </div>
    );
  }}
/>
```

Cap at 8 entries — charts can have many series.

### shadcn ChartContainer (simpler categorical charts)

```tsx
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

<ChartContainer config={chartConfig} className="h-48 w-full">
  <PieChart>
    <Pie data={data} dataKey="value" />
    <ChartTooltip content={<ChartTooltipContent />} />
  </PieChart>
</ChartContainer>;
```

### Inline legend (below chart, not inside recharts)

```tsx
<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
  {selectedSpecies.slice(0, 10).map((sp) => (
    <div key={sp} className="flex items-center gap-1">
      <div
        className="h-0.5 w-3 flex-shrink-0 rounded-full"
        style={{ background: series?.color ?? "#94a3b8" }}
      />
      <span className="text-muted-foreground text-xs">{sp}</span>
    </div>
  ))}
</div>
```

## 1% Threshold / Bucketing Convention

`filterByThreshold()` in `usage-series.ts` drops series with `peak < threshold` (default `1`):

```ts
const allSeries = buildUsageSeries(points);
const visibleSeries = filterByThreshold(allSeries, 1); // drop species below 1%
```

The `/data` page applies this before rendering. The sidebar lets users override the threshold.

## RPC-precompute vs Client-side Transform

| Situation              | Approach                                                                      |
| ---------------------- | ----------------------------------------------------------------------------- |
| Large/aggregated data  | SQL RPC — return pre-bucketed shape (e.g. `get_format_usage_timeseries`)      |
| Cosmetic filter / sort | Client JS is fine (`filterByThreshold`, `insideOutOrder`, `buildUsageSeries`) |
| Shape adapter          | Pure helper in `usage-series.ts` (e.g. `detailBucketsToTimeseriesPoints`)     |

See `working-with-usage-data` for the full RPC catalog and `FormatUsageTimeseriesPoint` shape.

## d3-sankey

> **Removed in Phase 3.** `usage-pipeline-chart.tsx` and `usage-pipeline.ts` were deleted. Do not add new Sankey surfaces. The `d3-sankey` package remains installed but is unused; the treemap is now the primary "meta now" snapshot.

## Phase 2 Chart Patterns

New reusable patterns introduced in the Phase 2 Meta Explorer. Reference implementations in `apps/web/src/components/data/usage-*.tsx`.

### Treemap sprite tiles + sub-threshold collapse

`recharts` `<Treemap>` with a custom `content` element (cast `as unknown as ReactElement` to satisfy the recharts typings) that renders a Pokemon sprite via `getPokemonSprite(species).url` centered inside each tile. Species below the 1% threshold are collapsed into a single "Others (N)" tile so the treemap stays readable at any filter level. See `usage-treemap.tsx`.

### Hand-rolled dumbbell (1-D multi-point comparison)

`usage-dumbbell.tsx` is a plain React component — no recharts. Each row is a horizontal track: a line drawn between the lowest and highest value, with a circle per data point. Percentage labels sit on the left (species name) and right (value). Use this for 1-D comparisons like source vs. source or overall vs. Top 10%. No recharts dependency means full layout control and no axis scaling complexity.

### Streamgraph (recharts AreaChart, `stackOffset="silhouette"`)

Streamgraph is a line-chart **mode**, not a separate chart type. Set `stackOffset="silhouette"` on `<AreaChart>` so the stack oscillates around a centered baseline instead of growing from zero. Series ordering matters for readability — apply the existing `insideOutOrder()` helper (largest series in the center) before passing data to recharts. See `usage-stream-chart.tsx`.

### Bump chart (rank trajectories)

`recharts` `<LineChart>` with `<YAxis reversed />` so rank 1 sits at the top. Set `connectNulls={false}` so a species that drops out of the top-N creates a gap rather than a misleading connecting line. Rank arrays are built by `buildRankSeries()` from the timeseries data. End labels render a Pokemon sprite + rank number inline using a custom dot or label component. See `usage-bump-chart.tsx`.

## Phase 3 Chart Patterns

New reusable patterns introduced in the Phase 3 per-Pokemon drill-down. Reference implementations in `apps/web/src/components/data/species-*.tsx`.

### Recharts donut grid with "Other" collapse

`recharts` `PieChart` + `Pie` with `innerRadius` (donut shape), inside a `ResponsiveContainer`. For each dimension (items, abilities, tera, nature/stat-alignment), take the top ~5 entries and collapse the remaining into a single **"Other"** slice (summed pct). Slice fills from `DONUT_SLICE_COLORS` in `data-shared.ts` (gray entry = "Other"). Center label shows the modal value + its %. Grid: `grid-cols-2 sm:grid-cols-4`. See `species-fingerprint.tsx`.

### `detailBucketsToTimeseriesPoints` adapter — single-series `UsageLineChart` reuse

```ts
// apps/web/src/components/data/usage-series.ts
detailBucketsToTimeseriesPoints(detail: SpeciesUsagePeriod[], species: string): FormatUsageTimeseriesPoint[]
```

Converts the per-species trailing-bucket detail into the `FormatUsageTimeseriesPoint[]` shape `UsageLineChart` expects. Produces one point per bucket: `{ periodStart, periodEnd, usage: { [species]: bucket.usagePct } }`. Pass `selectedSpecies={[species]}` to `UsageLineChart` for a single series. See `species-timeline.tsx`.

### Deterministic radial-ring constellation — `computeRingLayout`

```ts
// apps/web/src/components/data/usage-series.ts
computeRingLayout(count: number, opts?: { rings?: number }): { x: number; y: number; angle: number }[]
```

Pure trig, no force-layout dependency. Returns `x`/`y` as percentages (0–100) relative to a square container, starting at 12 o'clock, evenly spaced. For >12 with `rings: 2`, splits across inner/outer radius. The component sets `left: x%`, `top: y%` (inline `style` — percentage positions are fine; not pixel literals). SVG `<line>` layer from center to each bubble with `stroke="var(--border)"`, opacity scaling with `pairPct`. Default top 12 (one ring); toggle to 20 expands to two rings without a refetch. See `species-teammate-constellation.tsx`.

### Co-occurrence heatmap — CSS grid with sorted-key cell lookup

CSS `(N+1) × (N+1)` grid: header row + header column of teammate sprites (`matrix.order`), then cells. Cell key lookup: always order the two slugs lexicographically (`[a, b].sort()[0] + "||" + sort()[1]`) to match the `"a||b" with a < b` convention the RPC emits. Cell background = teal at opacity scaled to co-occurrence pct (inline `backgroundColor: oklch(... / {alpha})`). Mobile cap: slice `matrix.order` to 5 (5×5 grid at phone widths via `useIsMobile()`). See `species-teammate-heatmap.tsx`.

## Mobile Behavior

`ResponsiveContainer width="100%"` adapts naturally. `UsageSparkline` is `h-6 w-12` — embeds in table cells.

See `auditing-mobile-responsiveness` if charts cause horizontal overflow.
