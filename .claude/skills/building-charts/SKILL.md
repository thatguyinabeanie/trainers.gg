---
name: building-charts
description: Use when building data visualizations — recharts charts, d3-sankey flows, or usage-over-time lines on /data and dashboards
---

# Building Charts

Data visualizations in the web app: recharts (line, pie, sparkline) and d3-sankey flows.

## Reference Components

| Component            | Path                                                       | Library                                       |
| -------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| `UsageLineChart`     | `apps/web/src/components/data/usage-line-chart.tsx`        | recharts `LineChart` + `Brush`                |
| `UsagePipelineChart` | `apps/web/src/components/data/usage-pipeline-chart.tsx`    | d3-sankey (raw SVG)                           |
| `UsageSparkline`     | `apps/web/src/components/team-builder/usage-sparkline.tsx` | recharts `LineChart` (no axes)                |
| Admin pie            | `apps/web/src/app/(app)/admin/page.tsx`                    | recharts `PieChart` + shadcn `ChartContainer` |

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

### Sankey column colors — fixed hue ramp

```ts
// apps/web/src/components/data/usage-pipeline.ts
export const COLUMN_COLORS = {
  ability: "oklch(0.66 0.12 180)",
  item: "oklch(0.66 0.12 195)",
  nature: "oklch(0.66 0.12 210)",
  move: "oklch(0.66 0.12 225)",
};
```

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

| Situation                 | Approach                                                                      |
| ------------------------- | ----------------------------------------------------------------------------- |
| Large/aggregated data     | SQL RPC — return pre-bucketed shape (e.g. `get_format_usage_timeseries`)      |
| Cosmetic filter / sort    | Client JS is fine (`filterByThreshold`, `insideOutOrder`, `buildUsageSeries`) |
| Sankey graph construction | Client `buildPipelineGraph()` — data already bucketed by RPC                  |

See `working-with-usage-data` for the full RPC catalog and `FormatUsageTimeseriesPoint` shape.

## d3-sankey Specifics

Renders as raw `<svg>` — no recharts. Key API points:

```ts
import { sankey, sankeyLinkHorizontal, type SankeyGraph } from "d3-sankey";

const layout = sankey<D3Node, D3Link>()
  .nodeId((d) => d.id) // required — resolves string refs in links
  .nodeWidth(18)
  .nodePadding(12)
  .nodeAlign((node) => columnIndex) // species=0, then active columns in order
  .extent([
    [leftBand, topPad],
    [width - labelMargin, height - botPad],
  ]);

const { nodes, links } = layout(input);
const linkPath = sankeyLinkHorizontal<D3Node, D3Link>(); // SVG path generator
```

After layout: nodes gain `x0, x1, y0, y1`; links gain `source/target` (node objects), `width`, `y0`, `y1`. Hover uses `opacity` on `<g>` and `strokeOpacity` on `<path>` with `transition: opacity 0.15s`. Species nodes render a Pokemon sprite via `getPokemonSprite(label).url` as `<image>` (see `parsing-pokemon`).

Full implementation: `apps/web/src/components/data/usage-pipeline-chart.tsx`.

## Mobile Behavior

`ResponsiveContainer width="100%"` adapts naturally. The Sankey `clamp(400px, 65vh, 720px)` compresses on small screens — no separate mobile layout. `UsageSparkline` is `h-6 w-12` — embeds in table cells.

See `auditing-mobile-responsiveness` if charts cause horizontal overflow.
