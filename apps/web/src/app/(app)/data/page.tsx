import {
  fetchFormatUsageTimeseries,
  fetchPipelineData,
  fetchFormatEvents,
  fetchUsageBySource,
  fetchUsageConversion,
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

  // Fetch all initial datasets in parallel.
  // Source rows and conversion rows are seeded for the default filter params
  // only — the client re-fetches whenever filters change.
  const [
    timeseriesResult,
    pipelineResult,
    eventsResult,
    sourceResult,
    conversionResult,
  ] = await Promise.all([
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
    fetchUsageBySource({
      format,
      periodStart: rangeStart ?? undefined,
      periodEnd: rangeEnd ?? undefined,
      minPlayers,
    }),
    fetchUsageConversion({
      format,
      source,
      periodStart: rangeStart ?? undefined,
      periodEnd: rangeEnd ?? undefined,
      minPlayers,
      // Default topPct matches DEFAULT_TOP_PCT (0.1) so the client's
      // initialData handoff fires on the first Overview/Sources render.
      topPct: 0.1,
    }),
  ]);

  const initialPoints = timeseriesResult.success ? timeseriesResult.data : [];
  const initialPipelineResult = pipelineResult.success
    ? pipelineResult.data
    : null;
  const initialEvents = eventsResult.success ? eventsResult.data : [];
  const initialSourceRows = sourceResult.success ? sourceResult.data : [];
  const initialConversionRows = conversionResult.success
    ? conversionResult.data
    : [];

  return (
    <div className="flex flex-1">
      <UsageExplorer
        initialPoints={initialPoints}
        initialPipelineResult={initialPipelineResult}
        initialEvents={initialEvents}
        initialFilters={initialFilters}
        initialSourceRows={initialSourceRows}
        initialConversionRows={initialConversionRows}
      />
    </div>
  );
}
