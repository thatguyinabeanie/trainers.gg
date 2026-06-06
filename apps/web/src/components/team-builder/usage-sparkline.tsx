"use client";

/**
 * UsageSparkline — tiny inline trend line for move/item/tera usage %.
 *
 * Renders a recharts LineChart in a ResponsiveContainer sized h-6 w-12 using
 * the teal primary token. No axes, grid, legend, or dots — pure signal.
 * Renders nothing when there are fewer than 2 data points (caller shows just
 * the percentage number in that case).
 */

import { Line, LineChart, ResponsiveContainer } from "recharts";

// =============================================================================
// Types
// =============================================================================

interface UsageSparklineProps {
  /** Usage % values, oldest → newest. Must have ≥ 2 entries to render. */
  points: number[];
  /** Accessible label for the chart (defaults to "Usage trend"). */
  ariaLabel?: string;
}

// =============================================================================
// UsageSparkline
// =============================================================================

export function UsageSparkline({
  points,
  ariaLabel = "Usage trend",
}: UsageSparklineProps) {
  // Render nothing when there is not enough data for a trend.
  if (points.length < 2) return null;

  const data = points.map((v, i) => ({ i, v }));

  return (
    <div
      className="h-6 w-12"
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="v"
            // Teal primary token via CSS variable — adapts to light/dark.
            stroke="var(--primary)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
