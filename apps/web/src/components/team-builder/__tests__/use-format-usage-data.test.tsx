import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import type { GameFormat } from "@trainers/pokemon";

// =============================================================================
// Mock the server action before the hook is imported
// =============================================================================

const mockFetchFormatUsage = jest.fn();
jest.mock("@/actions/usage", () => ({
  fetchFormatUsage: (...args: unknown[]) => mockFetchFormatUsage(...args),
}));

import { useFormatUsageData } from "../use-format-usage-data";

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

// =============================================================================
// Tests
// =============================================================================

describe("useFormatUsageData", () => {
  beforeEach(() => {
    mockFetchFormatUsage.mockReset();
  });

  // ---------------------------------------------------------------------------
  // Return value shape — Map<normalizedSlug, FormatUsageRow>
  // ---------------------------------------------------------------------------

  it("returns an empty Map when format is undefined", () => {
    const { result } = renderHook(
      () => useFormatUsageData(undefined),
      { wrapper: makeWrapper() }
    );
    expect(result.current).toBeInstanceOf(Map);
    expect(result.current.size).toBe(0);
  });

  it("returns a populated Map after the query resolves", async () => {
    mockFetchFormatUsage.mockResolvedValue({
      success: true,
      data: [
        { species: "koraidon", usagePct: 52.3, rank: 1, usageChange7d: null },
        {
          species: "ogerpon-hearthflame",
          usagePct: 48.1,
          rank: 2,
          usageChange7d: 1.2,
        },
      ],
    });

    const { result } = renderHook(
      () => useFormatUsageData(makeFormat()),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current.size).toBeGreaterThan(0));

    expect(result.current.has("koraidon")).toBe(true);
    expect(result.current.has("ogerpon-hearthflame")).toBe(true);
    expect(result.current.get("koraidon")?.usagePct).toBeCloseTo(52.3);
  });

  it("normalizes DB species slugs as Map keys", async () => {
    // DB stores "ogerpon-hearthflame"; picker uses "Ogerpon-Hearthflame".
    // Both must map to the same key so the picker lookup hits.
    mockFetchFormatUsage.mockResolvedValue({
      success: true,
      data: [
        {
          species: "ogerpon-hearthflame",
          usagePct: 40.0,
          rank: 3,
          usageChange7d: null,
        },
      ],
    });

    const { result } = renderHook(
      () => useFormatUsageData(makeFormat()),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current.size).toBeGreaterThan(0));

    // The picker looks up by normalizeSpeciesSlug("Ogerpon-Hearthflame")
    // which equals "ogerpon-hearthflame" — the same key the Map uses.
    expect(result.current.has("ogerpon-hearthflame")).toBe(true);
    expect(result.current.get("ogerpon-hearthflame")?.usagePct).toBeCloseTo(
      40.0
    );
  });

  it("returns empty Map when the action returns an error", async () => {
    mockFetchFormatUsage.mockResolvedValue({
      success: false,
      error: "Not found",
    });

    const { result } = renderHook(
      () => useFormatUsageData(makeFormat()),
      { wrapper: makeWrapper() }
    );

    // The query will fail (throws), TanStack Query puts it in error state.
    // The hook returns an empty Map rather than throwing.
    // Wait for the fetch to run (not just for Map to exist, which is trivially true on first render).
    await waitFor(() => expect(mockFetchFormatUsage).toHaveBeenCalledTimes(1));
    // After retry:false the query transitions to error state and the hook still returns a stable empty Map.
    expect(result.current).toBeInstanceOf(Map);
    expect(result.current.size).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Query key — enabled only when format?.id is set
  // ---------------------------------------------------------------------------

  it("does NOT call fetchFormatUsage when format is undefined", () => {
    renderHook(
      () => useFormatUsageData(undefined),
      { wrapper: makeWrapper() }
    );
    expect(mockFetchFormatUsage).not.toHaveBeenCalled();
  });

  it("calls fetchFormatUsage with the correct format id", async () => {
    mockFetchFormatUsage.mockResolvedValue({ success: true, data: [] });

    renderHook(
      () => useFormatUsageData(makeFormat("gen9vgc2025regg")),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(mockFetchFormatUsage).toHaveBeenCalledTimes(1));
    expect(mockFetchFormatUsage).toHaveBeenCalledWith(
      expect.objectContaining({ format: "gen9vgc2025regg" })
    );
  });

  it("passes a custom source to fetchFormatUsage", async () => {
    mockFetchFormatUsage.mockResolvedValue({ success: true, data: [] });

    renderHook(
      () => useFormatUsageData(makeFormat(), "rk9"),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(mockFetchFormatUsage).toHaveBeenCalledTimes(1));
    expect(mockFetchFormatUsage).toHaveBeenCalledWith(
      expect.objectContaining({ source: "rk9" })
    );
  });

  it("defaults to source='all' when no source is provided", async () => {
    mockFetchFormatUsage.mockResolvedValue({ success: true, data: [] });

    renderHook(
      () => useFormatUsageData(makeFormat()),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(mockFetchFormatUsage).toHaveBeenCalledTimes(1));
    expect(mockFetchFormatUsage).toHaveBeenCalledWith(
      expect.objectContaining({ source: "all" })
    );
  });
});
