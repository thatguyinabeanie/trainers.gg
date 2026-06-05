import { BarChart2 } from "lucide-react";

import { getFormatById } from "@trainers/pokemon";

import { fetchFormatUsageTimeseries } from "@/actions/usage";
import { PageContainer } from "@/components/layout/page-container";
import { UsageExplorer } from "@/components/data/usage-explorer";
import { type UsageFilters } from "@/components/data/usage-controls";

// =============================================================================
// Cache
// =============================================================================

/**
 * Revalidate every hour — matches the server-side unstable_cache window on
 * fetchFormatUsageTimeseries. On-demand invalidation via CacheTags.USAGE_STATS
 * also busts this route.
 */
export const revalidate = 3600;

// =============================================================================
// Page
// =============================================================================

const DEFAULT_FORMAT = "gen9championsvgc2026regma";
const DEFAULT_SOURCE = "all";
const DEFAULT_PERIOD_TYPE = "week";
const DEFAULT_THRESHOLD = 1;

const VALID_PERIOD_TYPES = ["day", "week", "month"] as const;
type PeriodType = (typeof VALID_PERIOD_TYPES)[number];

interface DataPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DataPage({ searchParams }: DataPageProps) {
  const params = await searchParams;

  // Validate + extract searchParams — never pass unvalidated strings to actions.
  const format =
    typeof params.format === "string" && params.format.trim()
      ? params.format.trim()
      : DEFAULT_FORMAT;

  const source =
    typeof params.source === "string" && params.source.trim()
      ? params.source.trim()
      : DEFAULT_SOURCE;

  const rawPeriod = typeof params.periodType === "string" ? params.periodType : DEFAULT_PERIOD_TYPE;
  const periodType: PeriodType = (VALID_PERIOD_TYPES as readonly string[]).includes(rawPeriod)
    ? (rawPeriod as PeriodType)
    : DEFAULT_PERIOD_TYPE;

  const rawThreshold = typeof params.threshold === "string"
    ? parseFloat(params.threshold)
    : DEFAULT_THRESHOLD;
  const threshold = Number.isNaN(rawThreshold) ? DEFAULT_THRESHOLD : rawThreshold;

  const initialFilters: UsageFilters = {
    format,
    source: source as UsageFilters["source"],
    periodType,
    threshold,
  };

  // Fetch initial timeseries on the server — result is ISR-cached for 1 hour.
  const result = await fetchFormatUsageTimeseries({ format, source, periodType });
  const initialPoints = result.success ? result.data : [];

  // Resolve the active format for the page subtitle.
  const activeFormat = getFormatById(format);

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <BarChart2 className="h-8 w-8" />
          Data
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every{" "}
          <strong className="text-foreground">
            {activeFormat?.showdownName ?? "format"}
          </strong>{" "}
          legal Pokemon&apos;s usage across each tournament since launch.
          Changing the format reshapes the legal pool — tune the view with the
          controls below.
        </p>
      </div>

      {/* Main explorer (client shell with TanStack Query + URL state) */}
      <UsageExplorer
        initialPoints={initialPoints}
        initialFilters={initialFilters}
      />
    </PageContainer>
  );
}
