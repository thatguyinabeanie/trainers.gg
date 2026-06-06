import { BarChart2 } from "lucide-react";

import { getFormatById } from "@trainers/pokemon";

import { fetchFormatUsageTimeseries } from "@/actions/usage";
import { PageContainer } from "@/components/layout/page-container";
import { UsageExplorer } from "@/components/data/usage-explorer";
import { type UsageFilters } from "@/components/data/usage-controls";
import {
  coerceFormat,
  coercePeriodType,
  coerceSource,
  coerceThreshold,
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

  // Validate + extract searchParams via shared coercers — never pass unvalidated
  // strings to actions. Each coercer returns a safe default on invalid input.
  const raw = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;

  const format = coerceFormat(raw("format"));
  const source = coerceSource(raw("source"));
  const periodType = coercePeriodType(raw("periodType"));
  const threshold = coerceThreshold(raw("threshold"));

  const initialFilters: UsageFilters = {
    format,
    source,
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
