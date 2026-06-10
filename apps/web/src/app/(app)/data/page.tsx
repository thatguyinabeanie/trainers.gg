import {
  fetchFormatUsageTimeseries,
  fetchPipelineData,
  fetchFormatEvents,
} from "@/actions/usage";
import { UsageExplorer } from "@/components/data/usage-explorer";
import {
  type UsageFilters,
  coerceFormat,
  coercePeriodType,
  coerceRangeEnd,
  coerceRangeStart,
  coerceSource,
  coerceMinPlayers,
} from "@/components/data/usage-filters";

// =============================================================================
// Cache
// =============================================================================

/**
 * Use on-demand tag invalidation only (via CacheTags.USAGE_STATS). The
 * unstable_cache inside fetchFormatUsageTimeseries manages its own 1h TTL.
 * Setting revalidate=3600 here would redundantly race against that TTL and
 * prevent the tag-based bust from taking effect immediately.
 */
export const revalidate = false;

// =============================================================================
// Page
// =============================================================================

interface DataPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DataPage({ searchParams }: DataPageProps) {
  const params = await searchParams;

  const raw = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;

  const format = coerceFormat(raw("format"));
  const source = coerceSource(raw("source"));
  const periodType = coercePeriodType(raw("periodType"));
  const rangeStart = coerceRangeStart(raw("rangeStart"));
  const rangeEnd = coerceRangeEnd(raw("rangeEnd"));
  const minPlayers = coerceMinPlayers(raw("minPlayers"));

  const initialFilters: UsageFilters = { format, source, periodType };

  const [timeseriesResult, pipelineResult, eventsResult] = await Promise.all([
    fetchFormatUsageTimeseries({
      format,
      source,
      periodType,
      periodStart: rangeStart ?? undefined,
      periodEnd: rangeEnd ?? undefined,
      minPlayers,
    }),
    fetchPipelineData({
      format,
      source,
      periodStart: rangeStart ?? undefined,
      periodEnd: rangeEnd ?? undefined,
      minPlayers,
    }),
    fetchFormatEvents(format),
  ]);

  const initialPoints = timeseriesResult.success ? timeseriesResult.data : [];
  const initialPipelineResult = pipelineResult.success
    ? pipelineResult.data
    : null;
  const initialEvents = eventsResult.success ? eventsResult.data : [];

  return (
    <div className="flex flex-1">
      <UsageExplorer
        initialPoints={initialPoints}
        initialPipelineResult={initialPipelineResult}
        initialEvents={initialEvents}
        initialFilters={initialFilters}
      />
    </div>
  );
}
