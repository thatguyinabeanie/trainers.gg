"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  type SpeciesUsagePeriod,
  type MoveComboRow,
  type SpeciesTeammatesResult,
  type FormatEvent,
} from "@trainers/supabase";
import { isChampionsFormatId } from "@trainers/pokemon";

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
  coercePeriodType,
  coerceRangeStart,
  coerceRangeEnd,
  DEFAULT_MIN_PLAYERS,
} from "./usage-filters";
import { SpeciesHero } from "./species-hero";
import { SpeciesFingerprint } from "./species-fingerprint";
import { SpeciesMoveCombos } from "./species-move-combos";
import { SpeciesTimeline } from "./species-timeline";
import { SpeciesTeammateConstellation } from "./species-teammate-constellation";
import { SpeciesTeammateHeatmap } from "./species-teammate-heatmap";
import { PageContainer } from "@/components/layout/page-container";
import { EmptyState } from "@/components/ui/empty-state";

// =============================================================================
// Types
// =============================================================================

interface InitialFilters {
  format: string;
  source: string;
  periodType: "day" | "week" | "month";
  minPlayers: number;
  rangeStart: string | null;
  rangeEnd: string | null;
}

interface SpeciesDrilldownProps {
  species: string;
  displayName: string;
  /** True when the server fetch returned detail buckets. */
  hasData: boolean;
  /** Whether this is a Champions format (drives nature→"Stat Alignment" relabel). */
  isChampions: boolean;
  initialFilters: InitialFilters;
  initialDetail: SpeciesUsagePeriod[];
  initialCombos: MoveComboRow[];
  initialTeammates: SpeciesTeammatesResult;
  initialEvents: FormatEvent[];
  initialSpeciesList: { slug: string; name: string }[];
}

// =============================================================================
// URL param key constants — must match /data for round-trip links.
// =============================================================================

const PARAM_FORMAT = "format";
const PARAM_SOURCE = "source";
const PARAM_MIN_PLAYERS = "minPlayers";
const PARAM_RANGE_START = "rangeStart";
const PARAM_RANGE_END = "rangeEnd";
const PARAM_PERIOD_TYPE = "periodType";
const DEFAULT_PERIOD_TYPE = "week";
const DEFAULT_SOURCE = "all";

// =============================================================================
// SpeciesDrilldown
// =============================================================================

/**
 * Client shell for the /data/pokemon/[species] drill-down.
 *
 * Manages URL filter state, 5 TanStack Query hooks, species navigation, and
 * Option A section layout with labelled mount markers for Tasks 5–8.
 */
export function SpeciesDrilldown({
  species,
  displayName,
  hasData,
  isChampions: isChampionsInitial,
  initialFilters,
  initialDetail,
  initialCombos,
  initialTeammates,
  initialEvents,
  initialSpeciesList,
}: SpeciesDrilldownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // ── URL-derived filter state ─────────────────────────────────────────────

  const format = coerceFormat(
    searchParams.get(PARAM_FORMAT) ?? initialFilters.format
  );
  const source = coerceSource(
    searchParams.get(PARAM_SOURCE) ?? initialFilters.source
  );
  const minPlayers = coerceMinPlayers(
    searchParams.get(PARAM_MIN_PLAYERS) ?? String(initialFilters.minPlayers)
  );
  const rangeStart = coerceRangeStart(
    searchParams.get(PARAM_RANGE_START) ?? initialFilters.rangeStart
  );
  const rangeEnd = coerceRangeEnd(
    searchParams.get(PARAM_RANGE_END) ?? initialFilters.rangeEnd
  );
  const periodType = coercePeriodType(
    searchParams.get(PARAM_PERIOD_TYPE) ?? initialFilters.periodType
  );

  // isChampions is derived from the current format (not the server prop).
  const isChampions = isChampionsFormatId(format) ?? isChampionsInitial;

  // ── Stable initial key (for initialData seeding) ─────────────────────────

  // Captured once at mount — matches the server-side fetch params.
  const [initialKey] = useState(() => ({
    format: initialFilters.format,
    source: initialFilters.source,
    minPlayers: initialFilters.minPlayers,
    rangeStart: initialFilters.rangeStart,
    rangeEnd: initialFilters.rangeEnd,
    periodType: initialFilters.periodType,
  }));

  // True when current URL filters match what the server pre-fetched.
  const keyMatchesInitial =
    format === initialKey.format &&
    source === initialKey.source &&
    minPlayers === initialKey.minPlayers &&
    rangeStart === initialKey.rangeStart &&
    rangeEnd === initialKey.rangeEnd &&
    periodType === initialKey.periodType;

  // ── TanStack Query hooks ─────────────────────────────────────────────────

  const { data: detail = [] } = useQuery<SpeciesUsagePeriod[]>({
    queryKey: [
      "species-detail",
      format,
      species,
      source,
      periodType,
      rangeStart,
      rangeEnd,
      minPlayers,
    ],
    queryFn: async () => {
      const result = await fetchSpeciesUsageDetail({
        format,
        species,
        source,
        periodType,
        limit: 12,
        minPlayers,
      });
      return result.success ? result.data : [];
    },
    initialData: keyMatchesInitial ? initialDetail : undefined,
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });

  const { data: combos = [] } = useQuery<MoveComboRow[]>({
    queryKey: [
      "species-combos",
      format,
      species,
      source,
      rangeStart,
      rangeEnd,
      minPlayers,
    ],
    queryFn: async () => {
      const result = await fetchSpeciesMoveCombos({
        format,
        species,
        source,
        periodStart: rangeStart ?? undefined,
        periodEnd: rangeEnd ?? undefined,
        minPlayers,
        limit: 25,
      });
      return result.success ? result.data : [];
    },
    initialData: keyMatchesInitial ? initialCombos : undefined,
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });

  const emptyTeammates: SpeciesTeammatesResult = {
    focalPlayers: 0,
    teammates: [],
    matrix: { order: [], cells: {} },
  };

  const { data: teammates = emptyTeammates } = useQuery<SpeciesTeammatesResult>(
    {
      queryKey: [
        "species-teammates",
        format,
        species,
        source,
        rangeStart,
        rangeEnd,
        minPlayers,
      ],
      queryFn: async () => {
        const result = await fetchSpeciesTeammates({
          format,
          species,
          source,
          periodStart: rangeStart ?? undefined,
          periodEnd: rangeEnd ?? undefined,
          minPlayers,
          topN: 20,
        });
        return result.success ? result.data : emptyTeammates;
      },
      initialData: keyMatchesInitial ? initialTeammates : undefined,
      placeholderData: (prev) => prev,
      staleTime: 5 * 60 * 1000,
    }
  );

  const { data: events = [] } = useQuery<FormatEvent[]>({
    queryKey: ["format-events", format],
    queryFn: async () => {
      const result = await fetchFormatEvents(format);
      return result.success ? result.data : [];
    },
    initialData: format === initialKey.format ? initialEvents : undefined,
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });

  const { data: speciesList = initialSpeciesList } = useQuery<
    { slug: string; name: string }[]
  >({
    queryKey: ["format-species", format],
    queryFn: async () => {
      const result = await fetchFormatUsage({ format });
      if (!result.success) return initialSpeciesList;
      const { Dex } = await import("@pkmn/dex");
      return result.data.map((row) => ({
        slug: row.species,
        name: Dex.species.get(row.species)?.name ?? row.species,
      }));
    },
    // The species list is format-wide and rarely changes — treat as nearly static.
    initialData: format === initialKey.format ? initialSpeciesList : undefined,
    placeholderData: (prev) => prev,
    staleTime: 60 * 60 * 1000,
  });

  // ── Latest bucket ────────────────────────────────────────────────────────

  // detail is oldest→newest; take the last element.
  const latestDetail = detail.length > 0 ? detail[detail.length - 1]! : null;

  // ── URL helpers ──────────────────────────────────────────────────────────

  /**
   * Builds the current filter query string — used by breadcrumbs and
   * species/teammate navigation to preserve active filters.
   * Omits params at their defaults to keep URLs clean.
   */
  function buildFilterQuery(overrides: Partial<InitialFilters> = {}): string {
    const f = overrides.format ?? format;
    const s = overrides.source ?? source;
    const mp = overrides.minPlayers ?? minPlayers;
    const rs =
      overrides.rangeStart !== undefined ? overrides.rangeStart : rangeStart;
    const re = overrides.rangeEnd !== undefined ? overrides.rangeEnd : rangeEnd;
    const pt = overrides.periodType ?? periodType;

    const params = new URLSearchParams();

    // Always include format — it's part of the page's identity.
    params.set(PARAM_FORMAT, f);

    if (s !== DEFAULT_SOURCE) params.set(PARAM_SOURCE, s);
    if (mp !== DEFAULT_MIN_PLAYERS) params.set(PARAM_MIN_PLAYERS, String(mp));
    if (rs) params.set(PARAM_RANGE_START, rs);
    if (re) params.set(PARAM_RANGE_END, re);
    if (pt !== DEFAULT_PERIOD_TYPE) params.set(PARAM_PERIOD_TYPE, pt);

    return params.toString();
  }

  /**
   * Updates the URL with new filter values.
   * The species is the path segment — never written to query params.
   */
  function updateUrl(overrides: Partial<InitialFilters>) {
    const qs = buildFilterQuery(overrides);
    startTransition(() => {
      router.replace(`?${qs}`, { scroll: false });
    });
  }

  /**
   * Returns the full path to a species drill-down preserving active filters.
   */
  function speciesPath(slug: string): string {
    const qs = buildFilterQuery();
    return `/data/pokemon/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`;
  }

  // Species switcher navigation.
  function handleSpeciesSelect(slug: string) {
    router.push(speciesPath(slug));
  }

  // Filter bar callbacks.
  const filterBarProps = {
    format,
    source,
    minPlayers,
    onFormatChange: (f: string) => updateUrl({ format: f }),
    onSourceChange: (s: string) =>
      updateUrl({
        source: s as InitialFilters["source"],
      }),
    onMinPlayersChange: (mp: number) => updateUrl({ minPlayers: mp }),
  };

  const filterQuery = buildFilterQuery();

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <SpeciesHero
        species={species}
        displayName={displayName}
        latestDetail={latestDetail}
        format={format}
        source={source}
        minPlayers={minPlayers}
        speciesOptions={speciesList}
        filterQuery={filterQuery}
        onSpeciesSelect={handleSpeciesSelect}
        filterBarProps={filterBarProps}
      />

      {!hasData && detail.length === 0 ? (
        <EmptyState
          variant="minimal"
          title={`No usage data for ${displayName} in this format yet.`}
          description="Try selecting a different format or checking back after more tournament data has been imported."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {/* ── Feature 1: Build Fingerprint ─────────────────────────────── */}
          <SpeciesFingerprint detail={latestDetail} isChampions={isChampions} />

          {/* ── Features 2 + 5: Move Combos + Timeline (2-up) ───────────── */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <SpeciesMoveCombos combos={combos} />
            <SpeciesTimeline
              detail={detail}
              species={species}
              events={events}
            />
          </div>

          {/* ── Features 3 + 4: Teammates (2-up) ────────────────────────── */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <SpeciesTeammateConstellation
              focalSpecies={species}
              focalDisplayName={displayName}
              teammates={teammates.teammates}
              onTeammateHref={speciesPath}
            />
            <SpeciesTeammateHeatmap
              focalSpecies={species}
              teammates={teammates.teammates}
              matrix={teammates.matrix}
              onTeammateHref={speciesPath}
            />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
