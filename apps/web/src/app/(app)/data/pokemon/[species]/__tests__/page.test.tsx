/**
 * @jest-environment node
 */

// ---------------------------------------------------------------------------
// Module mocks — hoisted before imports
// ---------------------------------------------------------------------------

const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

jest.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

jest.mock("@pkmn/dex", () => ({
  Dex: {
    species: {
      get: (slug: string) => {
        if (slug === "koraidon" || slug === "calyrex-ice-rider") {
          return {
            exists: true,
            name: slug.charAt(0).toUpperCase() + slug.slice(1),
          };
        }
        return { exists: false, name: "" };
      },
    },
  },
}));

jest.mock("@/actions/usage", () => ({
  fetchSpeciesUsageDetail: jest
    .fn()
    .mockResolvedValue({ success: true, data: [] }),
  fetchSpeciesMoveCombos: jest
    .fn()
    .mockResolvedValue({ success: true, data: [] }),
  fetchSpeciesTeammates: jest.fn().mockResolvedValue({
    success: true,
    data: { focalPlayers: 0, teammates: [], matrix: { order: [], cells: {} } },
  }),
  fetchFormatEvents: jest.fn().mockResolvedValue({ success: true, data: [] }),
  fetchFormatUsage: jest.fn().mockResolvedValue({ success: true, data: [] }),
}));

jest.mock("@trainers/utils", () => ({
  logError: jest.fn(),
  getErrorMessage: jest.fn((e: unknown, fallback: string) => fallback),
}));

jest.mock("@trainers/pokemon", () => ({
  getFormatLabel: (id: string) => `Format:${id}`,
  isChampionsFormatId: (id: string) => id.startsWith("gen9champions"),
}));

// Stub the SpeciesDrilldown client component — server component tests only
// verify the page shell's data-fetching and routing behavior.
jest.mock("@/components/data/species-drilldown", () => ({
  SpeciesDrilldown: () => null,
}));

// Coercers just pass through in tests.
jest.mock("@/components/data/usage-filters", () => ({
  coerceFormat: (v: string | undefined) => v ?? "gen9championsvgc2026regma",
  coerceSource: (v: string | undefined) => v ?? "all",
  coerceMinPlayers: (v: string | undefined) => Number(v ?? 0),
  coerceRangeStart: (v: string | undefined) => v ?? null,
  coerceRangeEnd: (v: string | undefined) => v ?? null,
  coercePeriodType: (v: string | undefined) => v ?? "week",
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  fetchSpeciesUsageDetail,
  fetchSpeciesMoveCombos,
  fetchSpeciesTeammates,
  fetchFormatEvents,
  fetchFormatUsage,
} from "@/actions/usage";
import { logError } from "@trainers/utils";
import DrilldownPage from "../page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProps(
  species: string,
  searchParamsOverride: Record<string, string> = {}
) {
  return {
    params: Promise.resolve({ species }),
    searchParams: Promise.resolve(searchParamsOverride),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  // Reset to default success mocks after clearAllMocks wipes them.
  (fetchSpeciesUsageDetail as jest.Mock).mockResolvedValue({
    success: true,
    data: [],
  });
  (fetchSpeciesMoveCombos as jest.Mock).mockResolvedValue({
    success: true,
    data: [],
  });
  (fetchSpeciesTeammates as jest.Mock).mockResolvedValue({
    success: true,
    data: { focalPlayers: 0, teammates: [], matrix: { order: [], cells: {} } },
  });
  (fetchFormatEvents as jest.Mock).mockResolvedValue({
    success: true,
    data: [],
  });
  (fetchFormatUsage as jest.Mock).mockResolvedValue({
    success: true,
    data: [],
  });
});

describe("DrilldownPage", () => {
  describe("species slug validation", () => {
    it("calls notFound() for an unrecognized species slug", async () => {
      await expect(DrilldownPage(makeProps("notapokemon"))).rejects.toThrow(
        "NEXT_NOT_FOUND"
      );
      expect(mockNotFound).toHaveBeenCalled();
    });

    it("does not call notFound() for a valid species slug", async () => {
      await expect(DrilldownPage(makeProps("koraidon"))).resolves.toBeDefined();
      expect(mockNotFound).not.toHaveBeenCalled();
    });
  });

  describe("action failure logging", () => {
    it("logs an error and renders when fetchSpeciesUsageDetail fails", async () => {
      (fetchSpeciesUsageDetail as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: "Supabase is down",
      });

      await expect(DrilldownPage(makeProps("koraidon"))).resolves.toBeDefined();

      expect(logError).toHaveBeenCalledWith(
        "DrilldownPage.fetchSpeciesUsageDetail",
        expect.any(Error),
        expect.objectContaining({ species: "koraidon" })
      );
    });

    it("logs an error and renders when fetchSpeciesTeammates fails", async () => {
      (fetchSpeciesTeammates as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: "Timeout",
      });

      await expect(DrilldownPage(makeProps("koraidon"))).resolves.toBeDefined();

      expect(logError).toHaveBeenCalledWith(
        "DrilldownPage.fetchSpeciesTeammates",
        expect.any(Error),
        expect.objectContaining({ species: "koraidon" })
      );
    });
  });

  describe("hasData flag", () => {
    it("renders without throwing when all actions return empty data", async () => {
      // All mocks already return empty arrays — just verify no throw.
      await expect(DrilldownPage(makeProps("koraidon"))).resolves.toBeDefined();
    });
  });
});
