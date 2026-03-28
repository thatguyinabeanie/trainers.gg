// ── Label maps ──────────────────────────────────────────────────────

export const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORG_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  active: "Active",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const ORG_TIER_LABELS: Record<string, string> = {
  regular: "Regular",
  verified: "Verified",
  partner: "Partner",
};

// ── Chart color map (hex values for recharts fills) ─────────────────

export const CHART_COLORS: Record<string, string> = {
  active: "oklch(0.765 0.177 163.22)",
  upcoming: "oklch(0.623 0.214 259.53)",
  draft: "oklch(0.705 0.015 286.07)",
  paused: "oklch(0.769 0.188 70.08)",
  completed: "oklch(0.705 0.015 286.07)",
  cancelled: "oklch(0.637 0.237 25.33)",
  pending: "oklch(0.769 0.188 70.08)",
  rejected: "oklch(0.637 0.237 25.33)",
  suspended: "oklch(0.637 0.237 25.33)",
  regular: "oklch(0.705 0.015 286.07)",
  verified: "oklch(0.623 0.214 259.53)",
  partner: "oklch(0.765 0.177 163.22)",
};

// Default fill color used when a key is not found in CHART_COLORS
export const DEFAULT_FILL = "oklch(0.705 0.015 286.07)";

// ── Helpers ─────────────────────────────────────────────────────────

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function relativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export function humanLabel(
  key: string,
  labels: Record<string, string>
): string {
  return (
    labels[key] ??
    key
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

// ── Chart data builder (extracted from DonutBreakdownCard useMemo) ──

export interface ChartDataEntry {
  name: string;
  value: number;
  fill: string;
}

export interface ChartConfigEntry {
  label: string;
  color: string;
}

export function buildChartData(
  data: Record<string, number> | undefined,
  labels: Record<string, string>
): {
  chartData: ChartDataEntry[];
  chartConfig: Record<string, ChartConfigEntry>;
  total: number;
} {
  const entries = data ? Object.entries(data) : [];
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  const chartData = entries.map(([key, value]) => ({
    name: key,
    value,
    fill: CHART_COLORS[key] ?? DEFAULT_FILL,
  }));

  const chartConfig: Record<string, ChartConfigEntry> = {};
  for (const [key] of entries) {
    chartConfig[key] = {
      label: humanLabel(key, labels),
      color: CHART_COLORS[key] ?? DEFAULT_FILL,
    };
  }

  return { chartData, chartConfig, total };
}
