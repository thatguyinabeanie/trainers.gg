/**
 * Tests for useImportConfig.
 *
 * Coverage targets (the 10 uncovered lines):
 * - Toggle handlers: rollback on failure + toast.error
 * - Toggle handlers: timer reset when enabling (setSiteConfig called for last_run_at)
 * - Save handlers: rollback on failure + toast.error; commit update on success
 * - Change handlers: parseInt/isNaN guard (invalid string → no-op; valid → updates)
 */

import { renderHook, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Module mocks — before imports
// ---------------------------------------------------------------------------

const mockGetSiteConfig = jest.fn();
const mockSetSiteConfig = jest.fn();

jest.mock("@/actions/site-config", () => ({
  getSiteConfig: (...args: unknown[]) => mockGetSiteConfig(...args),
  setSiteConfig: (...args: unknown[]) => mockSetSiteConfig(...args),
}));

const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { useImportConfig } from "../use-import-config";

// ---------------------------------------------------------------------------
// Default getSiteConfig response — every key returns success:true with null
// so none of the state setters fire and the hook settles with defaults.
// ---------------------------------------------------------------------------

function mockAllConfigNull() {
  mockGetSiteConfig.mockResolvedValue({ success: true, data: null });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useImportConfig", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAllConfigNull();
  });

  // -------------------------------------------------------------------------
  // Load
  // -------------------------------------------------------------------------
  describe("initial load", () => {
    it("loads config on mount and sets configLoading to false after", async () => {
      const { result } = renderHook(() => useImportConfig());

      // Before load completes the hook is still loading
      expect(result.current.configLoading).toBe(true);

      // Wait for the effect to complete
      await act(async () => {});

      expect(result.current.configLoading).toBe(false);
      expect(mockGetSiteConfig).toHaveBeenCalledTimes(9);
    });

    it("applies loaded config values when getSiteConfig returns data", async () => {
      mockGetSiteConfig.mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          rk9_backend_auto_import: true,
          limitless_backend_auto_import: false,
          rk9_max_teams_per_tick: 50,
          limitless_batch_size: 10,
          rk9_team_concurrency: 2,
          rk9_cron_interval_seconds: 120,
          limitless_cron_interval_seconds: 600,
          rk9_last_run_at: "2024-01-01T00:00:00Z",
          limitless_last_run_at: null,
        };
        return Promise.resolve({ success: true, data: values[key] ?? null });
      });

      const { result } = renderHook(() => useImportConfig());
      await act(async () => {});

      expect(result.current.rk9BackendAutoImport).toBe(true);
      expect(result.current.rk9TeamsPerTick).toBe(50);
      expect(result.current.rk9TeamConcurrency).toBe(2);
      expect(result.current.rk9CronInterval).toBe(120);
      expect(result.current.limitlessCronInterval).toBe(600);
      expect(result.current.limitlessBatchSize).toBe(10);
      expect(result.current.rk9LastRunAt).toBe("2024-01-01T00:00:00Z");
    });
  });

  // -------------------------------------------------------------------------
  // Toggle handlers
  // -------------------------------------------------------------------------
  describe("handleToggleRk9Backend", () => {
    it("rolls back state and shows toast.error when setSiteConfig fails", async () => {
      mockSetSiteConfig.mockResolvedValueOnce({ success: false, error: "err" });

      const { result } = renderHook(() => useImportConfig());
      await act(async () => {});

      // Start with default false; try to enable
      await act(async () => {
        await result.current.handleToggleRk9Backend(true);
      });

      // State should have been rolled back to false (the previous value)
      expect(result.current.rk9BackendAutoImport).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith(
        "Failed to update RK9 backend setting"
      );
    });

    it("does NOT reset the last_run_at timer when enabling fails", async () => {
      mockSetSiteConfig.mockResolvedValueOnce({ success: false, error: "err" });

      const { result } = renderHook(() => useImportConfig());
      await act(async () => {});

      await act(async () => {
        await result.current.handleToggleRk9Backend(true);
      });

      // Only the failed setSiteConfig call (once) — no rk9_last_run_at reset
      expect(mockSetSiteConfig).toHaveBeenCalledTimes(1);
    });

    it("resets the rk9_last_run_at timer when enabling succeeds", async () => {
      mockSetSiteConfig.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useImportConfig());
      await act(async () => {});

      await act(async () => {
        await result.current.handleToggleRk9Backend(true);
      });

      // First call: the toggle; second call: timer reset
      expect(mockSetSiteConfig).toHaveBeenCalledWith("rk9_last_run_at", null);
    });

    it("does NOT reset the last_run_at timer when disabling succeeds", async () => {
      // Prime state to true first
      mockGetSiteConfig.mockImplementation((key: string) => {
        if (key === "rk9_backend_auto_import")
          return Promise.resolve({ success: true, data: true });
        return Promise.resolve({ success: true, data: null });
      });
      mockSetSiteConfig.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useImportConfig());
      await act(async () => {});

      await act(async () => {
        await result.current.handleToggleRk9Backend(false);
      });

      // Only the toggle setSiteConfig — no rk9_last_run_at call
      expect(mockSetSiteConfig).not.toHaveBeenCalledWith(
        "rk9_last_run_at",
        expect.anything()
      );
    });
  });

  describe("handleToggleLimitlessBackend", () => {
    it("rolls back state and shows toast.error when setSiteConfig fails", async () => {
      mockSetSiteConfig.mockResolvedValueOnce({ success: false, error: "err" });

      const { result } = renderHook(() => useImportConfig());
      await act(async () => {});

      await act(async () => {
        await result.current.handleToggleLimitlessBackend(true);
      });

      expect(result.current.limitlessBackendAutoImport).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith(
        "Failed to update Limitless backend setting"
      );
    });

    it("resets the limitless_last_run_at timer when enabling succeeds", async () => {
      mockSetSiteConfig.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useImportConfig());
      await act(async () => {});

      await act(async () => {
        await result.current.handleToggleLimitlessBackend(true);
      });

      expect(mockSetSiteConfig).toHaveBeenCalledWith(
        "limitless_last_run_at",
        null
      );
    });
  });

  // -------------------------------------------------------------------------
  // Change handlers — parseInt / isNaN guard
  // -------------------------------------------------------------------------
  describe("change handlers", () => {
    it.each([
      ["handleRk9TeamsPerTickChange", "rk9TeamsPerTick", 100] as const,
      ["handleRk9TeamConcurrencyChange", "rk9TeamConcurrency", 3] as const,
      ["handleRk9CronIntervalChange", "rk9CronInterval", 60] as const,
      [
        "handleLimitlessCronIntervalChange",
        "limitlessCronInterval",
        300,
      ] as const,
      ["handleLimitlessBatchSizeChange", "limitlessBatchSize", 20] as const,
    ])(
      "%s: ignores non-numeric input and keeps the previous state value",
      async (handler, stateKey, defaultVal) => {
        const { result } = renderHook(() => useImportConfig());
        await act(async () => {});

        act(() => {
          // Type-safe indexing via handler name
          (result.current[handler] as (v: string) => void)("abc");
        });

        expect(result.current[stateKey]).toBe(defaultVal);
      }
    );

    it.each([
      ["handleRk9TeamsPerTickChange", "rk9TeamsPerTick"] as const,
      ["handleRk9TeamConcurrencyChange", "rk9TeamConcurrency"] as const,
      ["handleRk9CronIntervalChange", "rk9CronInterval"] as const,
      ["handleLimitlessCronIntervalChange", "limitlessCronInterval"] as const,
      ["handleLimitlessBatchSizeChange", "limitlessBatchSize"] as const,
    ])(
      "%s: updates state when given a valid integer string",
      async (handler, stateKey) => {
        const { result } = renderHook(() => useImportConfig());
        await act(async () => {});

        act(() => {
          (result.current[handler] as (v: string) => void)("42");
        });

        expect(result.current[stateKey]).toBe(42);
      }
    );

    it.each([
      ["handleRk9TeamsPerTickChange", "rk9TeamsPerTick", 100] as const,
      ["handleRk9TeamConcurrencyChange", "rk9TeamConcurrency", 3] as const,
      ["handleRk9CronIntervalChange", "rk9CronInterval", 60] as const,
      [
        "handleLimitlessCronIntervalChange",
        "limitlessCronInterval",
        300,
      ] as const,
      ["handleLimitlessBatchSizeChange", "limitlessBatchSize", 20] as const,
    ])(
      "%s: ignores values less than 1 and keeps previous state",
      async (handler, stateKey, defaultVal) => {
        const { result } = renderHook(() => useImportConfig());
        await act(async () => {});

        act(() => {
          (result.current[handler] as (v: string) => void)("0");
        });

        expect(result.current[stateKey]).toBe(defaultVal);
      }
    );
  });

  // -------------------------------------------------------------------------
  // Save handlers (blur handlers that call setSiteConfig)
  // -------------------------------------------------------------------------
  describe("save handlers", () => {
    it("saveRk9TeamsPerTick: rolls back state and shows toast.error on failure", async () => {
      mockSetSiteConfig.mockResolvedValueOnce({ success: false, error: "err" });

      const { result } = renderHook(() => useImportConfig());
      await act(async () => {});

      // Change the value first
      act(() => {
        result.current.handleRk9TeamsPerTickChange("75");
      });
      expect(result.current.rk9TeamsPerTick).toBe(75);

      // Now try to save → failure → rollback to default (100)
      await act(async () => {
        await result.current.saveRk9TeamsPerTick();
      });

      expect(result.current.rk9TeamsPerTick).toBe(100);
      expect(mockToastError).toHaveBeenCalledWith("Failed to save setting");
    });

    it("saveRk9TeamsPerTick: commits the value on success", async () => {
      mockSetSiteConfig.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useImportConfig());
      await act(async () => {});

      act(() => {
        result.current.handleRk9TeamsPerTickChange("75");
      });

      await act(async () => {
        await result.current.saveRk9TeamsPerTick();
      });

      // Value should remain at 75 (committed)
      expect(result.current.rk9TeamsPerTick).toBe(75);
      expect(mockToastError).not.toHaveBeenCalled();

      // Subsequent failure should now rollback to 75 (not 100)
      mockSetSiteConfig.mockResolvedValueOnce({ success: false, error: "err" });
      act(() => {
        result.current.handleRk9TeamsPerTickChange("200");
      });
      await act(async () => {
        await result.current.saveRk9TeamsPerTick();
      });
      expect(result.current.rk9TeamsPerTick).toBe(75);
    });

    it("saveLimitlessBatchSize: rolls back state and shows toast.error on failure", async () => {
      mockSetSiteConfig.mockResolvedValueOnce({ success: false, error: "err" });

      const { result } = renderHook(() => useImportConfig());
      await act(async () => {});

      act(() => {
        result.current.handleLimitlessBatchSizeChange("5");
      });

      await act(async () => {
        await result.current.saveLimitlessBatchSize();
      });

      expect(result.current.limitlessBatchSize).toBe(20);
      expect(mockToastError).toHaveBeenCalledWith("Failed to save setting");
    });

    it("saveRk9CronInterval: rolls back on failure", async () => {
      mockSetSiteConfig.mockResolvedValueOnce({ success: false, error: "err" });

      const { result } = renderHook(() => useImportConfig());
      await act(async () => {});

      act(() => {
        result.current.handleRk9CronIntervalChange("30");
      });

      await act(async () => {
        await result.current.saveRk9CronInterval();
      });

      expect(result.current.rk9CronInterval).toBe(60);
    });

    it("saveLimitlessCronInterval: rolls back on failure", async () => {
      mockSetSiteConfig.mockResolvedValueOnce({ success: false, error: "err" });

      const { result } = renderHook(() => useImportConfig());
      await act(async () => {});

      act(() => {
        result.current.handleLimitlessCronIntervalChange("120");
      });

      await act(async () => {
        await result.current.saveLimitlessCronInterval();
      });

      expect(result.current.limitlessCronInterval).toBe(300);
    });

    it("saveRk9TeamConcurrency: rolls back on failure", async () => {
      mockSetSiteConfig.mockResolvedValueOnce({ success: false, error: "err" });

      const { result } = renderHook(() => useImportConfig());
      await act(async () => {});

      act(() => {
        result.current.handleRk9TeamConcurrencyChange("8");
      });

      await act(async () => {
        await result.current.saveRk9TeamConcurrency();
      });

      expect(result.current.rk9TeamConcurrency).toBe(3);
    });
  });
});
