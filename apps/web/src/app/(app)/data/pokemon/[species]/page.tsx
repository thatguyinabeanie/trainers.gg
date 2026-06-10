import { notFound } from "next/navigation";
import { Dex } from "@pkmn/dex";
import { type Metadata } from "next";

import { getFormatLabel, isChampionsFormatId } from "@trainers/pokemon";
import {
  type SpeciesUsagePeriod,
  type MoveComboRow,
  type SpeciesTeammatesResult,
  type FormatEvent,
  type FormatUsageRow,
} from "@trainers/supabase";

import {
  fetchSpeciesUsageDetail,
  fetchSpeciesMoveCombos,
  fetchSpeciesTeammates,
  fetchFormatEvents,
  fetchFormatUsage,
} from "@/actions/usage";
import {
  coerceFormat,
  coerceSource,
  coerceMinPlayers,
  coerceRangeStart,
  coerceRangeEnd,
  coercePeriodType,
} from "@/components/data/usage-filters";
import { SpeciesDrilldown } from "@/components/data/species-drilldown";

// =============================================================================
// Types
// =============================================================================

interface DrilldownPageProps {
  params: Promise<{ species: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// =============================================================================
// Metadata
// =============================================================================

export async function generateMetadata({
  params,
  searchParams,
}: DrilldownPageProps): Promise<Metadata> {
  const { species: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();
  const dexSpecies = Dex.species.get(slug);

  // If invalid, return minimal metadata — notFound() handles the actual 404.
  if (!dexSpecies || !dexSpecies.exists) {
    return { title: "Pokémon not found | trainers.gg" };
  }

  const sp = await searchParams;
  const raw = (key: string) =>
    typeof sp[key] === "string" ? (sp[key] as string) : undefined;
  const format = coerceFormat(raw("format"));
  const formatLabel = getFormatLabel(format);
  const displayName = dexSpecies.name;

  return {
    title: `${displayName} usage — ${formatLabel} | trainers.gg`,
    description: `Item, ability, tera, moveset, and teammate data for ${displayName} in ${formatLabel} across tournament team sheets.`,
    openGraph: {
      title: `${displayName} usage — ${formatLabel} | trainers.gg`,
      description: `Item, ability, tera, moveset, and teammate data for ${displayName} in ${formatLabel} across tournament team sheets.`,
      // Static default site OG card (Decision 4 — per-species dynamic OG is
      // explicitly deferred to a future phase with its own design).
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} usage — ${formatLabel} | trainers.gg`,
      description: `Item, ability, tera, moveset, and teammate data for ${displayName} in ${formatLabel} across tournament team sheets.`,
    },
  };
}

// =============================================================================
// Page
// =============================================================================

export default async function DrilldownPage({
  params,
  searchParams,
}: DrilldownPageProps) {
  // 1. Normalize the slug — slugs in team_slots are lowercase hyphenated.
  const { species: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();

  // 2. Validate before any DB call — invalid slug → 404.
  const dexSpecies = Dex.species.get(slug);
  if (!dexSpecies || !dexSpecies.exists) {
    notFound();
  }
  const displayName = dexSpecies.name;

  // 3. Read + coerce filters from searchParams using the same coercers as /data.
  const sp = await searchParams;
  const raw = (key: string) =>
    typeof sp[key] === "string" ? (sp[key] as string) : undefined;

  const format = coerceFormat(raw("format"));
  const source = coerceSource(raw("source"));
  const minPlayers = coerceMinPlayers(raw("minPlayers"));
  const rangeStart = coerceRangeStart(raw("rangeStart"));
  const rangeEnd = coerceRangeEnd(raw("rangeEnd"));
  const periodType = coercePeriodType(raw("periodType"));

  // 4. Parallel fetch — all five datasets in one Promise.all.
  // fetchTopN: 20 so the constellation "show top 20" toggle never needs a
  // refetch; the constellation defaults to showing 12.
  const [
    detailResult,
    combosResult,
    teammatesResult,
    eventsResult,
    speciesListResult,
  ] = await Promise.all([
    fetchSpeciesUsageDetail({
      format,
      species: slug,
      source,
      periodType,
      limit: 12,
      minPlayers,
    }),
    fetchSpeciesMoveCombos({
      format,
      species: slug,
      source,
      periodStart: rangeStart ?? undefined,
      periodEnd: rangeEnd ?? undefined,
      minPlayers,
      limit: 25,
    }),
    fetchSpeciesTeammates({
      format,
      species: slug,
      source,
      periodStart: rangeStart ?? undefined,
      periodEnd: rangeEnd ?? undefined,
      minPlayers,
      topN: 20,
    }),
    fetchFormatEvents(format),
    fetchFormatUsage({ format }),
  ]);

  // 5. Unwrap results — empty arrays/objects for failures so the page renders.
  const initialDetail: SpeciesUsagePeriod[] = detailResult.success
    ? detailResult.data
    : [];
  const initialCombos: MoveComboRow[] = combosResult.success
    ? combosResult.data
    : [];
  const initialTeammates: SpeciesTeammatesResult = teammatesResult.success
    ? teammatesResult.data
    : { focalPlayers: 0, teammates: [], matrix: { order: [], cells: {} } };
  const initialEvents: FormatEvent[] = eventsResult.success
    ? eventsResult.data
    : [];
  const rawSpeciesList: FormatUsageRow[] = speciesListResult.success
    ? speciesListResult.data
    : [];

  // Map format species list to slug+name pairs for the switcher.
  const initialSpeciesList = rawSpeciesList.map((row) => ({
    slug: row.species,
    name: Dex.species.get(row.species)?.name ?? row.species,
  }));

  // 6. Valid species with no data in this format → empty state (not 404).
  const hasData = initialDetail.length > 0;

  const initialFilters = {
    format,
    source,
    periodType,
    minPlayers,
    rangeStart: rangeStart ?? null,
    rangeEnd: rangeEnd ?? null,
  };

  return (
    <div className="flex flex-1">
      <SpeciesDrilldown
        species={slug}
        displayName={displayName}
        hasData={hasData}
        isChampions={isChampionsFormatId(format)}
        initialFilters={initialFilters}
        initialDetail={initialDetail}
        initialCombos={initialCombos}
        initialTeammates={initialTeammates}
        initialEvents={initialEvents}
        initialSpeciesList={initialSpeciesList}
      />
    </div>
  );
}
