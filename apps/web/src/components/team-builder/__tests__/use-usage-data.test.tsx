import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import type { GameFormat } from "@trainers/pokemon";

// =============================================================================
// Mock the server action before the hook is imported
// =============================================================================

const mockFetchSpeciesUsageDetail = jest.fn();
jest.mock("@/actions/usage", () => ({
  fetchSpeciesUsageDetail: (...args: unknown[]) =>
    mockFetchSpeciesUsageDetail(...args),
}));

import { useUsageData, usageQueryKeys } from "../use-usage-data";

// =============================================================================
// Helpers
// =============================================================================

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function makeWrapper() {
  const queryClient = makeQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

function makeFormat(id = "gen9vgc2025regg"): GameFormat {
  return {
    id,
    label: "VGC 2025 Reg G",
    generation: 9,
    isChampions: false,
    isChampionsTeamSize: false,
    legalLevelCap: 50,
  } as unknown as GameFormat;
}

/** Minimal SpeciesUsagePeriod row shape. */
function makePeriod(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    format_id: "gen9vgc2025regg",
    species: "koraidon",
    usage_pct: 52.3,
    source: "all",
    period_type: "week",
    period_start: "2025-01-01",
    period_end: "2025-01-07",
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("useUsageData", () => {
  beforeEach(() => {
    mockFetchSpeciesUsageDetail.mockReset();
  });

  // ---------------------------------------------------------------------------
  // Disabled states — query must not fire without both required params
  // ---------------------------------------------------------------------------

  it("does not call fetchSpeciesUsageDetail when species is undefined", () => {
    renderHook(() => useUsageData(undefined, makeFormat()), {
      wrapper: makeWrapper(),
    });
    expect(mockFetchSpeciesUsageDetail).not.toHaveBeenCalled();
  });

  it("does not call fetchSpeciesUsageDetail when format is undefined", () => {
    renderHook(() => useUsageData("koraidon", undefined), {
      wrapper: makeWrapper(),
    });
    expect(mockFetchSpeciesUsageDetail).not.toHaveBeenCalled();
  });

  it("does not call fetchSpeciesUsageDetail when both species and format are undefined", () => {
    renderHook(() => useUsageData(undefined, undefined), {
      wrapper: makeWrapper(),
    });
    expect(mockFetchSpeciesUsageDetail).not.toHaveBeenCalled();
  });

  it("returns undefined data while query is disabled (species missing)", () => {
    const { result } = renderHook(
      () => useUsageData(undefined, makeFormat()),
      { wrapper: makeWrapper() }
    );
    expect(result.current.data).toBeUndefined();
  });

  it("returns undefined data while query is disabled (format missing)", () => {
    const { result } = renderHook(
      () => useUsageData("koraidon", undefined),
      { wrapper: makeWrapper() }
    );
    expect(result.current.data).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Happy path — query runs and returns data
  // ---------------------------------------------------------------------------

  it("calls fetchSpeciesUsageDetail and returns data when both params are present", async () => {
    const periods = [makePeriod(), makePeriod({ period_start: "2025-01-08" })];
    mockFetchSpeciesUsageDetail.mockResolvedValue({
      success: true,
      data: periods,
    });

    const { result } = renderHook(
      () => useUsageData("koraidon", makeFormat()),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(2);
    expect(mockFetchSpeciesUsageDetail).toHaveBeenCalledTimes(1);
    expect(mockFetchSpeciesUsageDetail).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "gen9vgc2025regg",
        species: "koraidon",
        source: "all",
      })
    );
  });

  it("passes a custom source to fetchSpeciesUsageDetail", async () => {
    mockFetchSpeciesUsageDetail.mockResolvedValue({ success: true, data: [] });

    renderHook(() => useUsageData("koraidon", makeFormat(), "rk9"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() =>
      expect(mockFetchSpeciesUsageDetail).toHaveBeenCalledTimes(1)
    );
    expect(mockFetchSpeciesUsageDetail).toHaveBeenCalledWith(
      expect.objectContaining({ source: "rk9" })
    );
  });

  it("defaults to source='all' when no source argument is provided", async () => {
    mockFetchSpeciesUsageDetail.mockResolvedValue({ success: true, data: [] });

    renderHook(() => useUsageData("koraidon", makeFormat()), {
      wrapper: makeWrapper(),
    });

    await waitFor(() =>
      expect(mockFetchSpeciesUsageDetail).toHaveBeenCalledTimes(1)
    );
    expect(mockFetchSpeciesUsageDetail).toHaveBeenCalledWith(
      expect.objectContaining({ source: "all" })
    );
  });

  // ---------------------------------------------------------------------------
  // Error path — action returns { success: false }
  // ---------------------------------------------------------------------------

  it("puts the query in error state and returns undefined data when action returns error", async () => {
    mockFetchSpeciesUsageDetail.mockResolvedValue({
      success: false,
      error: "Not found",
    });

    const { result } = renderHook(
      () => useUsageData("missingmon", makeFormat()),
      { wrapper: makeWrapper() }
    );

    // Wait until React Query has fully transitioned to error state —
    // not just until the action was called, since isError flips after
    // the throw is caught and the state update flushes.
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
  });
});

// =============================================================================
// usageQueryKeys factory
// =============================================================================

describe("usageQueryKeys", () => {
  it(".all returns the base tuple", () => {
    expect(usageQueryKeys.all).toEqual(["usage"]);
  });

  it(".detail() with all params produces the correct key", () => {
    const key = usageQueryKeys.detail({
      source: "rk9",
      formatId: "gen9vgc2025regg",
      species: "koraidon",
    });
    expect(key).toEqual(["usage", "rk9", "gen9vgc2025regg", "koraidon"]);
  });

  it(".detail() defaults source to 'all' when omitted", () => {
    const key = usageQueryKeys.detail({
      formatId: "gen9vgc2025regg",
      species: "koraidon",
    });
    expect(key).toEqual(["usage", "all", "gen9vgc2025regg", "koraidon"]);
  });

  it(".detail() defaults formatId to null when omitted", () => {
    const key = usageQueryKeys.detail({ species: "koraidon" });
    expect(key).toEqual(["usage", "all", null, "koraidon"]);
  });

  it(".detail() defaults species to null when omitted", () => {
    const key = usageQueryKeys.detail({ formatId: "gen9vgc2025regg" });
    expect(key).toEqual(["usage", "all", "gen9vgc2025regg", null]);
  });

  it(".detail() returns nulls for all optional fields when called with empty params", () => {
    const key = usageQueryKeys.detail({});
    expect(key).toEqual(["usage", "all", null, null]);
  });

  it(".detail() produces the correct key for limitless source", () => {
    const key = usageQueryKeys.detail({
      source: "limitless",
      formatId: "gen9vgc2025regs",
      species: "flutter-mane",
    });
    expect(key).toEqual([
      "usage",
      "limitless",
      "gen9vgc2025regs",
      "flutter-mane",
    ]);
  });
});
