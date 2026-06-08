/**
 * Tests the inline slider handlers in ExternalData that persist values to
 * site_config. The component is large; this file mocks the surrounding
 * environment and focuses on verifying setSiteConfig is invoked with the
 * correct key/value combinations when the user changes a numeric input.
 */
import type * as LimitlessModule from "@/lib/limitless";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetSiteConfig = jest.fn();
const mockSetSiteConfig = jest.fn();

jest.mock("@/actions/site-config", () => ({
  getSiteConfig: (...args: unknown[]) => mockGetSiteConfig(...args),
  setSiteConfig: (...args: unknown[]) => mockSetSiteConfig(...args),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/actions/rk9", () => ({
  discoverRk9Events: jest.fn(),
  scrapeRk9Roster: jest.fn(),
  scrapeRk9TeamsBatch: jest.fn(),
  resetRk9EventData: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/actions/limitless", () => ({
  queueTournamentForImport: jest.fn(),
  batchQueueTournaments: jest.fn(),
  triggerLimitlessSync: jest.fn(),
  triggerImportQueue: jest.fn(),
}));

// Per-table data returned by the useSupabaseQuery mock. The component calls
// useSupabaseQuery three times (rk9 events, limitless tournaments, rk9 players).
// To return the right shape per call without coupling to call order, the mock
// probes which table the passed query function targets by running it against a
// chainable Proxy that records the .from("<table>") argument synchronously
// (before the first await). Tests set the tables they need; everything else
// defaults to [] so the existing slider tests are unaffected.
let mockSupabaseData: Record<string, unknown[]> = {};

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: (queryFn: (sb: unknown) => Promise<unknown>) => {
    let table: string | null = null;
    const probe: unknown = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === "then") return undefined; // not thenable
          if (prop === "from")
            return (t: string) => {
              table = t;
              return probe;
            };
          return () => probe;
        },
      }
    );
    try {
      // Runs the synchronous portion (incl. .from()) before the first await.
      // The query body may throw after awaiting the probe — swallow it; we only
      // need the captured table name.
      const p = queryFn(probe);
      if (p && typeof (p as Promise<unknown>).catch === "function") {
        (p as Promise<unknown>).catch(() => {});
      }
    } catch {
      // Ignore — table is captured synchronously regardless.
    }
    const data = (table && mockSupabaseData[table]) || [];
    return { data, error: null, isLoading: false, isFetching: false };
  },
}));

// Preserve ALL_VALID_FORMATS from the real module so deriveLimitlessDisplayStatus
// can distinguish mapped format ids (e.g. "gen9championsvgc2026regma") from
// unmappable ones (e.g. "CUSTOM") without throwing on undefined.has().
jest.mock("@/lib/limitless", () => ({
  ...jest.requireActual<typeof LimitlessModule>("@/lib/limitless"),
  LIMITLESS_TO_FORMAT: { svg: "fmt-svg" },
}));

// Stub the row-detail children — they have their own test suites and run their
// own Supabase queries. Stubbing keeps the parent row-render tests stable and
// focused on ExternalData's own conditional-render branches.
jest.mock("../expanded-row-data", () => ({
  ExpandedRowData: () => <div data-testid="expanded-row" />,
}));
jest.mock("../player-expanded-data", () => ({
  PlayerExpandedData: () => <div data-testid="player-expanded-row" />,
}));

jest.mock("@tanstack/react-virtual", () => ({
  // Render every row: derive the item count from the options passed by the
  // component (count: currentRows.length / sortedPlayers.length) so the
  // virtualized row-render JSX actually executes in tests.
  useVirtualizer: (opts: { count?: number }) => {
    const count = opts?.count ?? 0;
    return {
      getVirtualItems: () =>
        Array.from({ length: count }, (_, i) => ({
          index: i,
          start: i * 56,
          size: 56,
          key: i,
        })),
      getTotalSize: () => count * 56,
      measureElement: () => {},
      measure: () => {},
      scrollToIndex: () => {},
    };
  },
}));

// Stub useIsMobile + useIsClient so tests stay on the desktop/hydrated path
jest.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
jest.mock("@/hooks/use-is-client", () => ({ useIsClient: () => true }));

// Stub ExternalDataSettings to render its inputs/switch inline (no popover)
// so the existing toggle + slider tests can still find them in the DOM.
jest.mock("../external-data-settings", () => ({
  ExternalDataSettings: ({
    loading,
    backendOn,
    onToggleBackend,
    teamsPerTick,
    onTeamsPerTickChange,
    onTeamsPerTickBlur,
    concurrency,
    onConcurrencyChange,
    onConcurrencyBlur,
    batchSize,
    onBatchSizeChange,
    onBatchSizeBlur,
    intervalSeconds,
    onIntervalChange,
    onIntervalBlur,
    tab,
  }: {
    loading: boolean;
    backendOn: boolean;
    onToggleBackend: (c: boolean) => void;
    teamsPerTick?: number;
    onTeamsPerTickChange?: (v: string) => void;
    onTeamsPerTickBlur?: () => void;
    concurrency?: number;
    onConcurrencyChange?: (v: string) => void;
    onConcurrencyBlur?: () => void;
    batchSize?: number;
    onBatchSizeChange?: (v: string) => void;
    onBatchSizeBlur?: () => void;
    intervalSeconds: number;
    onIntervalChange: (v: string) => void;
    onIntervalBlur: () => void;
    tab: string;
  }) => {
    if (loading) return null;
    return (
      <div data-testid="settings-stub">
        <button
          role="switch"
          aria-checked={backendOn}
          onClick={() => onToggleBackend(!backendOn)}
        />
        {tab === "rk9" ? (
          <>
            <input
              type="number"
              role="spinbutton"
              value={teamsPerTick}
              onChange={(e) => onTeamsPerTickChange?.(e.target.value)}
              onBlur={onTeamsPerTickBlur}
              readOnly={false}
            />
            <input
              type="number"
              role="spinbutton"
              value={concurrency}
              onChange={(e) => onConcurrencyChange?.(e.target.value)}
              onBlur={onConcurrencyBlur}
              readOnly={false}
            />
          </>
        ) : (
          <input
            type="number"
            role="spinbutton"
            value={batchSize}
            onChange={(e) => onBatchSizeChange?.(e.target.value)}
            onBlur={onBatchSizeBlur}
            readOnly={false}
          />
        )}
        <input
          type="number"
          role="spinbutton"
          value={intervalSeconds}
          onChange={(e) => onIntervalChange(e.target.value)}
          onBlur={onIntervalBlur}
          readOnly={false}
        />
      </div>
    );
  },
}));

// Stub ExternalDataToolbar to render StatusChips + the settings stub inline
jest.mock("../external-data-toolbar", () => ({
  ExternalDataToolbar: ({
    settings,
    chips,
    isFetching,
    onRefresh,
    onSync,
    syncing,
    onImportMatching,
    importMatchingCount,
    onImportAll,
    importAllCount,
    bulkProcessing,
  }: {
    settings: Record<string, unknown>;
    chips?: Array<{ label: string; count: number; tone: string }>;
    isFetching?: boolean;
    onRefresh?: () => void;
    onSync?: () => void;
    syncing?: boolean;
    onImportMatching?: () => void;
    importMatchingCount?: number;
    onImportAll?: () => void;
    importAllCount?: number;
    bulkProcessing?: boolean;
  }) => {
    // Lazy-require the settings stub so it participates in jest mocking
    const { ExternalDataSettings } = jest.requireMock(
      "../external-data-settings"
    ) as {
      ExternalDataSettings: React.ComponentType<Record<string, unknown>>;
    };
    return (
      <div data-testid="toolbar">
        {/* Render chips so stat-strip tests can assert on count pills */}
        {chips?.map((c) => (
          <span key={c.label} data-testid={`chip-${c.label}`}>
            {c.count} {c.label}
          </span>
        ))}
        <ExternalDataSettings {...(settings as Record<string, unknown>)} />
        <button onClick={onSync} disabled={syncing}>
          Sync
        </button>
        <button
          onClick={onImportMatching}
          disabled={bulkProcessing || importMatchingCount === 0}
        >
          Import matching ({importMatchingCount ?? 0})
        </button>
        <button onClick={onImportAll}>
          Import all ({importAllCount ?? 0})
        </button>
        <button onClick={onRefresh} disabled={isFetching}>
          Refresh
        </button>
      </div>
    );
  },
}));

// Stub SelectionBar + EventList — their own test suites cover their behaviour
jest.mock("../external-data-selection-bar", () => ({
  SelectionBar: () => <div data-testid="selection-bar-stub" />,
}));
jest.mock("../external-data-cards", () => ({
  EventList: () => <div data-testid="event-list-stub" />,
}));

// Stub QueueStrip — renders a sentinel + Run Import button so drain-loop tests can
// trigger it; it has its own unit tests in external-data-queue-strip.test.tsx.
jest.mock("../external-data-queue-strip", () => ({
  QueueStrip: ({
    onRunImport,
    draining,
    queuedCount,
  }: {
    onRunImport: () => void;
    draining: boolean;
    queuedCount: number;
  }) => (
    <div data-testid="queue-strip-stub">
      {queuedCount > 0 && (
        <button onClick={onRunImport} disabled={draining}>
          Run Import
        </button>
      )}
    </div>
  ),
}));

// Stub ExternalDataFilters — expose source buttons so tests can switch source
// without coupling to the real filter component's internal UI (popover, selects).
jest.mock("../external-data-filters", () => ({
  ExternalDataFilters: ({
    onChange,
  }: {
    onChange: (patch: { source: string }) => void;
  }) => (
    <div data-testid="external-data-filters-stub">
      <button onClick={() => onChange({ source: "all" })}>Source: All</button>
      <button onClick={() => onChange({ source: "rk9" })}>Source: RK9</button>
      <button onClick={() => onChange({ source: "limitless" })}>
        Source: Limitless
      </button>
    </div>
  ),
}));

import React from "react";
import { ExternalData } from "../external-data";

describe("ExternalData slider handlers", () => {
  beforeEach(() => {
    mockGetSiteConfig.mockImplementation(async (key: string) => {
      // Return sensible defaults so loading skeletons resolve and inputs render
      if (key.endsWith("_auto_import")) {
        return { success: true, data: false };
      }
      return { success: true, data: 10 };
    });
    mockSetSiteConfig.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to wait for all initial loading promises to resolve and inputs to appear
  async function renderAndWaitForInputs(expectedCount = 3) {
    render(<ExternalData />);
    // Wait for all skeleton states to resolve and number inputs to render.
    // We need to wait for the full count because the initial wait sometimes
    // resolves after the first input renders, before the second/third arrive.
    await waitFor(() => {
      expect(screen.getAllByRole("spinbutton").length).toBeGreaterThanOrEqual(
        expectedCount
      );
    });
    return screen.getAllByRole("spinbutton") as HTMLInputElement[];
  }

  it("persists rk9_max_teams_per_tick when the teams-per-tick input changes", async () => {
    // Switch to RK9 source so the RK9 inputs render
    await renderAndWaitForInputs();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Source: RK9/i }));
    });

    const inputs = await waitFor(() => {
      const els = screen.getAllByRole("spinbutton") as HTMLInputElement[];
      // RK9 tab renders 3 number inputs: teams/tick, concurrency, cron interval
      expect(els.length).toBeGreaterThanOrEqual(3);
      return els;
    });

    await act(async () => {
      fireEvent.change(inputs[0], { target: { value: "42" } });
      fireEvent.blur(inputs[0]);
    });

    await waitFor(() => {
      expect(mockSetSiteConfig).toHaveBeenCalledWith(
        "rk9_max_teams_per_tick",
        42
      );
    });
  });

  it("persists rk9_team_concurrency when the concurrency input changes", async () => {
    await renderAndWaitForInputs();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Source: RK9/i }));
    });

    const inputs = await waitFor(() => {
      const els = screen.getAllByRole("spinbutton") as HTMLInputElement[];
      expect(els.length).toBeGreaterThanOrEqual(3);
      return els;
    });

    await act(async () => {
      fireEvent.change(inputs[1], { target: { value: "5" } });
      fireEvent.blur(inputs[1]);
    });

    await waitFor(() => {
      expect(mockSetSiteConfig).toHaveBeenCalledWith("rk9_team_concurrency", 5);
    });
  });

  it("persists rk9_cron_interval_seconds when the cron-interval input changes", async () => {
    await renderAndWaitForInputs();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Source: RK9/i }));
    });

    const inputs = await waitFor(() => {
      const els = screen.getAllByRole("spinbutton") as HTMLInputElement[];
      expect(els.length).toBeGreaterThanOrEqual(3);
      return els;
    });

    await act(async () => {
      fireEvent.change(inputs[2], { target: { value: "120" } });
      fireEvent.blur(inputs[2]);
    });

    await waitFor(() => {
      expect(mockSetSiteConfig).toHaveBeenCalledWith(
        "rk9_cron_interval_seconds",
        120
      );
    });
  });

  it("persists limitless_batch_size when the batch-size input changes", async () => {
    await renderAndWaitForInputs();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Source: Limitless/i })
      );
    });

    // Limitless tab renders 2 inputs: batch size, then cron interval
    const inputs = await waitFor(() => {
      const els = screen.getAllByRole("spinbutton") as HTMLInputElement[];
      expect(els.length).toBeGreaterThanOrEqual(2);
      return els;
    });

    await act(async () => {
      fireEvent.change(inputs[0], { target: { value: "25" } });
      fireEvent.blur(inputs[0]);
    });

    await waitFor(() => {
      expect(mockSetSiteConfig).toHaveBeenCalledWith(
        "limitless_batch_size",
        25
      );
    });
  });

  it("persists limitless_cron_interval_seconds when the limitless cron input changes", async () => {
    await renderAndWaitForInputs();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Source: Limitless/i })
      );
    });

    const inputs = await waitFor(() => {
      const els = screen.getAllByRole("spinbutton") as HTMLInputElement[];
      expect(els.length).toBeGreaterThanOrEqual(2);
      return els;
    });

    await act(async () => {
      fireEvent.change(inputs[1], { target: { value: "600" } });
      fireEvent.blur(inputs[1]);
    });

    await waitFor(() => {
      expect(mockSetSiteConfig).toHaveBeenCalledWith(
        "limitless_cron_interval_seconds",
        600
      );
    });
  });

  it("ignores invalid numeric input (NaN) on all handlers", async () => {
    const inputs = await renderAndWaitForInputs();

    await act(async () => {
      fireEvent.change(inputs[0], { target: { value: "not-a-number" } });
    });

    // setSiteConfig should NOT have been called with the limitless_batch_size key
    // for this invalid value — early-return guard catches NaN
    const calls = mockSetSiteConfig.mock.calls.filter(
      (c) => c[0] === "limitless_batch_size"
    );
    expect(calls).toHaveLength(0);
  });

  it("ignores out-of-range input (< 1) on all handlers", async () => {
    const inputs = await renderAndWaitForInputs();

    await act(async () => {
      fireEvent.change(inputs[0], { target: { value: "0" } });
    });

    const calls = mockSetSiteConfig.mock.calls.filter(
      (c) => c[0] === "limitless_batch_size"
    );
    expect(calls).toHaveLength(0);
  });
});

// =============================================================================
// Shared setup helpers (module-scope so all describe blocks below can use them)
// =============================================================================

function setupSiteConfigMocks() {
  mockGetSiteConfig.mockImplementation(async (key: string) => {
    if (key.endsWith("_auto_import")) {
      return { success: true, data: false };
    }
    return { success: true, data: 10 };
  });
  mockSetSiteConfig.mockResolvedValue({ success: true });
}

async function renderAndWaitForRk9Tab() {
  render(<ExternalData />);
  // Switch source to RK9 via the ExternalDataFilters stub
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Source: RK9/i }));
  });
  // Wait for the config loading state to resolve so controls render
  await waitFor(() =>
    expect(screen.queryAllByRole("switch").length).toBeGreaterThanOrEqual(1)
  );
}

async function renderAndWaitForLimitlessTab() {
  render(<ExternalData />);
  // Switch source to Limitless via the ExternalDataFilters stub
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Source: Limitless/i }));
  });
  // Wait for the config loading state to resolve so controls render
  await waitFor(() =>
    expect(screen.queryAllByRole("switch").length).toBeGreaterThanOrEqual(1)
  );
}

// =============================================================================
// Toggle handlers
// =============================================================================

describe("ExternalData toggle handlers", () => {
  beforeEach(() => {
    setupSiteConfigMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls setSiteConfig with rk9_backend_auto_import when the RK9 switch is toggled", async () => {
    await renderAndWaitForRk9Tab();

    const switches = screen.getAllByRole("switch");
    await act(async () => {
      fireEvent.click(switches[0]);
    });

    await waitFor(() => {
      expect(mockSetSiteConfig).toHaveBeenCalledWith(
        "rk9_backend_auto_import",
        true
      );
    });
  });

  it("also resets rk9_last_run_at when enabling (checked becomes true)", async () => {
    await renderAndWaitForRk9Tab();

    const switches = screen.getAllByRole("switch");
    await act(async () => {
      fireEvent.click(switches[0]);
    });

    await waitFor(() => {
      expect(mockSetSiteConfig).toHaveBeenCalledWith("rk9_last_run_at", null);
    });
  });

  it("rolls back RK9 switch state when setSiteConfig fails", async () => {
    await renderAndWaitForRk9Tab();

    // Override after render so config loading succeeds, then toggle save fails
    mockSetSiteConfig.mockResolvedValue({ success: false });

    const switches = screen.getAllByRole("switch");
    await act(async () => {
      fireEvent.click(switches[0]);
    });

    await waitFor(() => {
      expect(jest.requireMock("sonner").toast.error).toHaveBeenCalledWith(
        "Failed to update RK9 backend setting"
      );
    });
  });

  it("calls setSiteConfig with limitless_backend_auto_import when the Limitless switch is toggled", async () => {
    await renderAndWaitForLimitlessTab();

    const switches = screen.getAllByRole("switch");
    await act(async () => {
      fireEvent.click(switches[0]);
    });

    await waitFor(() => {
      expect(mockSetSiteConfig).toHaveBeenCalledWith(
        "limitless_backend_auto_import",
        true
      );
    });
  });

  it("also resets limitless_last_run_at when enabling Limitless backend", async () => {
    await renderAndWaitForLimitlessTab();

    const switches = screen.getAllByRole("switch");
    await act(async () => {
      fireEvent.click(switches[0]);
    });

    await waitFor(() => {
      expect(mockSetSiteConfig).toHaveBeenCalledWith(
        "limitless_last_run_at",
        null
      );
    });
  });

  it("rolls back Limitless switch state when setSiteConfig fails", async () => {
    mockSetSiteConfig.mockResolvedValue({ success: false });

    await renderAndWaitForLimitlessTab();

    const switches = screen.getAllByRole("switch");
    await act(async () => {
      fireEvent.click(switches[0]);
    });

    await waitFor(() => {
      expect(jest.requireMock("sonner").toast.error).toHaveBeenCalledWith(
        "Failed to update Limitless backend setting"
      );
    });
  });
});

// =============================================================================
// Discover handler (RK9 tab)
// =============================================================================

describe("ExternalData discover handler", () => {
  beforeEach(() => {
    setupSiteConfigMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls discoverRk9Events and shows a success message", async () => {
    const discoverMock = jest.requireMock("@/actions/rk9").discoverRk9Events;
    discoverMock.mockResolvedValue({
      success: true,
      events: [{ eventId: "e1", name: "Test Event" }],
      sources: { live: 1, archive: 0 },
    });

    await renderAndWaitForRk9Tab();

    const discoverButton = await waitFor(() =>
      screen.getByRole("button", { name: /Sync/i })
    );

    await act(async () => {
      fireEvent.click(discoverButton);
    });

    await waitFor(() => {
      expect(discoverMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Discovered 1 events \(1 live, 0 from archive\)/i)
      ).toBeInTheDocument();
    });
  });

  it("shows an error message when discoverRk9Events returns success:false", async () => {
    const discoverMock = jest.requireMock("@/actions/rk9").discoverRk9Events;
    discoverMock.mockResolvedValue({
      success: false,
      error: "Network timeout",
    });

    await renderAndWaitForRk9Tab();

    const discoverButton = await waitFor(() =>
      screen.getByRole("button", { name: /Sync/i })
    );

    await act(async () => {
      fireEvent.click(discoverButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Error: Network timeout/i)).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Sync handler (Limitless tab)
// =============================================================================

describe("ExternalData sync handler", () => {
  beforeEach(() => {
    setupSiteConfigMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls triggerLimitlessSync and shows success message", async () => {
    const syncMock = jest.requireMock(
      "@/actions/limitless"
    ).triggerLimitlessSync;
    syncMock.mockResolvedValue({ success: true, data: {} });

    await renderAndWaitForLimitlessTab();

    const syncButton = await waitFor(() =>
      screen.getByRole("button", { name: /Sync/i })
    );

    await act(async () => {
      fireEvent.click(syncButton);
    });

    await waitFor(() => {
      expect(syncMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Sync completed successfully/i)
      ).toBeInTheDocument();
    });
  });

  it("shows an error message when triggerLimitlessSync fails", async () => {
    const syncMock = jest.requireMock(
      "@/actions/limitless"
    ).triggerLimitlessSync;
    syncMock.mockResolvedValue({
      success: false,
      error: "Service unavailable",
    });

    await renderAndWaitForLimitlessTab();

    const syncButton = await waitFor(() =>
      screen.getByRole("button", { name: /Sync/i })
    );

    await act(async () => {
      fireEvent.click(syncButton);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Error: Service unavailable/i)
      ).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Players sub-nav (RK9 tab)
// =============================================================================

describe("ExternalData RK9 players sub-nav", () => {
  beforeEach(() => {
    setupSiteConfigMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("switches to the players view and shows the empty state", async () => {
    await renderAndWaitForRk9Tab();

    const playersButton = await waitFor(() =>
      screen.getByRole("button", { name: /Players/i })
    );

    await act(async () => {
      fireEvent.click(playersButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/No players found\./i)).toBeInTheDocument();
    });
  });

  it("shows a player search input after switching to the players view", async () => {
    await renderAndWaitForRk9Tab();

    const playersButton = await waitFor(() =>
      screen.getByRole("button", { name: /Players/i })
    );

    await act(async () => {
      fireEvent.click(playersButton);
    });

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Search by name or player ID/i)
      ).toBeInTheDocument();
    });
  });

  it("returns to events view when Events sub-nav button is clicked", async () => {
    await renderAndWaitForRk9Tab();

    // First switch to players
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Players/i }));
    });

    await waitFor(() =>
      expect(screen.getByText(/No players found\./i)).toBeInTheDocument()
    );

    // Now click Events to go back — use getAllByRole and pick the first matching
    const eventsButtons = screen.getAllByRole("button", { name: /^Events$/i });
    await act(async () => {
      fireEvent.click(eventsButtons[0]);
    });

    // The Discover button is in the events view — it should be visible again
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sync/i })).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Events table row rendering (RK9)
// =============================================================================

interface MockEventOverrides {
  event_id?: string;
  name?: string;
  import_status?: string;
  has_team_lists?: boolean;
  import_error?: string | null;
  date_start?: string;
  player_count?: number | null;
  teams_imported_count?: number | null;
}

function makeEvent(overrides: MockEventOverrides = {}) {
  return {
    event_id: "evt-1",
    name: "Test Event",
    tier: "regional",
    format_id: "fmt-svg",
    date_start: "2024-01-01", // past → not upcoming
    date_end: "2024-01-02",
    location_city: "Columbus",
    location_country: "US",
    player_count: 100,
    has_team_lists: false,
    import_status: "pending",
    import_error: null,
    teams_imported_count: 0,
    ...overrides,
  };
}

describe("ExternalData events table rendering", () => {
  beforeEach(() => {
    setupSiteConfigMocks();
    mockSupabaseData = {
      events: [
        makeEvent({
          event_id: "e-pending",
          name: "Pending Event",
          import_status: "pending",
        }),
        makeEvent({
          event_id: "e-failed",
          name: "Failed Event",
          import_status: "failed",
          import_error: "Scrape failed",
        }),
        makeEvent({
          event_id: "e-roster",
          name: "Roster Event",
          import_status: "roster",
        }),
        makeEvent({
          event_id: "e-teams",
          name: "Teams Event",
          import_status: "teams",
          player_count: 100,
          teams_imported_count: 50,
        }),
        makeEvent({
          event_id: "e-complete",
          name: "Complete Event",
          import_status: "complete",
          has_team_lists: true,
        }),
        makeEvent({
          event_id: "e-complete-noteams",
          name: "Complete NoTeams Event",
          import_status: "complete",
          has_team_lists: false,
        }),
        makeEvent({
          event_id: "e-upcoming",
          name: "Upcoming Event",
          import_status: "pending",
          date_start: "2999-01-01",
        }),
      ],
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockSupabaseData = {};
  });

  it("renders RK9 event rows with status-specific badges and details", async () => {
    render(<ExternalData />);
    await waitFor(() => {
      expect(screen.getByText("Pending Event")).toBeInTheDocument();
    });

    // Every row renders
    expect(screen.getByText("Failed Event")).toBeInTheDocument();
    expect(screen.getByText("Roster Event")).toBeInTheDocument();
    expect(screen.getByText("Teams Event")).toBeInTheDocument();
    expect(screen.getByText("Complete Event")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Event")).toBeInTheDocument();

    // Status badges driven by import_status
    expect(screen.getByText(/Roster ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Teams partial/i)).toBeInTheDocument();
    // "Upcoming" appears in the StatusBadge for the upcoming row — assert ≥1 match
    expect(screen.getAllByText(/Upcoming/i).length).toBeGreaterThan(0);

    // Failed row shows its error text
    expect(screen.getByText("Scrape failed")).toBeInTheDocument();

    // Teams progress count (50/100) for the in-progress teams row
    expect(screen.getByText(/50\/100 teams/i)).toBeInTheDocument();
  });

  it("triggers roster scrape when the Roster action button is clicked", async () => {
    const { scrapeRk9Roster } = jest.requireMock("@/actions/rk9");
    scrapeRk9Roster.mockResolvedValue({ success: true });

    render(<ExternalData />);
    await waitFor(() =>
      expect(screen.getByText("Pending Event")).toBeInTheDocument()
    );

    const pendingRow = screen
      .getByText("Pending Event")
      .closest("div.grid") as HTMLElement;
    await act(async () => {
      fireEvent.click(
        within(pendingRow).getByRole("button", { name: /^Import$/i })
      );
    });

    await waitFor(() => expect(scrapeRk9Roster).toHaveBeenCalled());
  });

  it("triggers team scrape when the Teams action button is clicked", async () => {
    const { scrapeRk9TeamsBatch } = jest.requireMock("@/actions/rk9");
    scrapeRk9TeamsBatch.mockResolvedValue({
      success: true,
      done: true,
      scraped: 0,
      total: 0,
    });

    render(<ExternalData />);
    await waitFor(() =>
      expect(screen.getByText("Roster Event")).toBeInTheDocument()
    );

    const rosterRow = screen
      .getByText("Roster Event")
      .closest("div.grid") as HTMLElement;
    await act(async () => {
      fireEvent.click(
        within(rosterRow).getByRole("button", { name: /^Import$/i })
      );
    });

    await waitFor(() => expect(scrapeRk9TeamsBatch).toHaveBeenCalled());
  });

  it("resets event data after confirmation when the reset button is clicked", async () => {
    const { resetRk9EventData } = jest.requireMock("@/actions/rk9");
    resetRk9EventData.mockResolvedValue({ success: true });
    jest.spyOn(window, "confirm").mockReturnValue(true);

    render(<ExternalData />);
    await waitFor(() =>
      expect(screen.getByText("Failed Event")).toBeInTheDocument()
    );

    const resetButtons = screen.getAllByRole("button", {
      name: /Reset event/i,
    });
    await act(async () => {
      fireEvent.click(resetButtons[0]);
    });

    await waitFor(() => expect(resetRk9EventData).toHaveBeenCalled());
  });

  it("expands a row to render the detail panel when the chevron is clicked", async () => {
    render(<ExternalData />);
    await waitFor(() =>
      expect(screen.getByText("Roster Event")).toBeInTheDocument()
    );

    const expandButtons = screen.getAllByRole("button", { name: /Expand/i });
    await act(async () => {
      fireEvent.click(expandButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByTestId("expanded-row")).toBeInTheDocument();
    });
  });

  it("selects all visible rows via the header checkbox and shows bulk actions", async () => {
    render(<ExternalData />);
    await waitFor(() =>
      expect(screen.getByText("Pending Event")).toBeInTheDocument()
    );

    const selectAll = screen.getByLabelText(
      /Select all visible/i
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.click(selectAll);
    });

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/Select all visible/i) as HTMLInputElement)
          .checked
      ).toBe(true);
    });
    // The unified "Import matching" toolbar action surfaces for importable rows
    expect(screen.getByText(/Import matching/i)).toBeInTheDocument();
  });
});

// =============================================================================
// RK9 status tabs
// =============================================================================

describe("RK9 status tabs", () => {
  beforeEach(() => {
    setupSiteConfigMocks();
    mockSupabaseData = {
      events: [
        makeEvent({
          event_id: "e-pending-1",
          name: "Pending A",
          import_status: "pending",
        }),
        makeEvent({
          event_id: "e-pending-2",
          name: "Pending B",
          import_status: "pending",
        }),
        makeEvent({
          event_id: "e-complete",
          name: "Complete A",
          import_status: "complete",
        }),
        makeEvent({
          event_id: "e-failed",
          name: "Failed A",
          import_status: "failed",
        }),
      ],
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockSupabaseData = {};
  });

  it("renders RK9 status tabs with correct counts", async () => {
    render(<ExternalData />);
    await waitFor(() =>
      expect(screen.getByText("Pending A")).toBeInTheDocument()
    );

    // All four status tabs should render with counts
    const allTab = screen.getByRole("tab", { name: /^All/ });
    expect(allTab).toBeInTheDocument();
    expect(allTab.textContent).toMatch(/4/);

    const pendingTab = screen.getByRole("tab", { name: /^Pending/ });
    expect(pendingTab).toBeInTheDocument();
    expect(pendingTab.textContent).toMatch(/2/);

    const importedTab = screen.getByRole("tab", { name: /^Imported/ });
    expect(importedTab).toBeInTheDocument();
    expect(importedTab.textContent).toMatch(/1/);

    const failedTab = screen.getByRole("tab", { name: /^Failed/ });
    expect(failedTab).toBeInTheDocument();
    expect(failedTab.textContent).toMatch(/1/);
  });

  it("filters to pending rows when the Pending tab is clicked", async () => {
    render(<ExternalData />);
    await waitFor(() =>
      expect(screen.getByText("Pending A")).toBeInTheDocument()
    );

    const pendingTab = screen.getByRole("tab", { name: /^Pending/ });
    await act(async () => {
      fireEvent.click(pendingTab);
    });

    await waitFor(() =>
      expect(screen.getByText("Pending A")).toBeInTheDocument()
    );
    expect(screen.getByText("Pending B")).toBeInTheDocument();
    expect(screen.queryByText("Complete A")).not.toBeInTheDocument();
    expect(screen.queryByText("Failed A")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Players table row rendering (RK9)
// =============================================================================

describe("ExternalData players table rendering", () => {
  beforeEach(() => {
    setupSiteConfigMocks();
    mockSupabaseData = {
      players: [
        {
          id: 1,
          player_id_masked: "ab...1",
          first_name: "Ash",
          last_name: "Ketchum",
          country: "US",
          standings: [{ count: 5 }],
        },
        {
          id: 2,
          player_id_masked: "cd...2",
          first_name: "Misty",
          last_name: "Waterflower",
          country: "US",
          standings: [{ count: 3 }],
        },
      ],
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockSupabaseData = {};
  });

  it("renders RK9 player rows when the Players sub-nav is active", async () => {
    render(<ExternalData />);

    // Switch source to RK9 first — Players sub-nav only renders when source=rk9
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Source: RK9/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Players/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Ash Ketchum/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Misty Waterflower/i)).toBeInTheDocument();
  });

  it("expands a player row to render the player detail panel", async () => {
    render(<ExternalData />);

    // Switch source to RK9 first — Players sub-nav only renders when source=rk9
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Source: RK9/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Players/i }));
    });
    await waitFor(() =>
      expect(screen.getByText(/Ash Ketchum/i)).toBeInTheDocument()
    );

    const expandButtons = screen.getAllByRole("button", { name: /Expand/i });
    await act(async () => {
      fireEvent.click(expandButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByTestId("player-expanded-row")).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Limitless table row rendering
// =============================================================================

describe("ExternalData limitless table rendering", () => {
  beforeEach(() => {
    setupSiteConfigMocks();
    mockSupabaseData = {
      tournaments: [
        {
          tournament_id: "t-queued",
          name: "Queued Cup",
          format_id: "fmt-svg",
          date: "2024-03-01",
          player_count: 64,
          platform: "limitless",
          is_online: true,
          decklists: true,
          data_imported_at: null,
          import_status: "queued",
          import_requested_at: "2024-03-01T00:00:00Z",
          import_error: null,
          import_attempts: 0,
        },
        {
          tournament_id: "t-importing",
          name: "Importing Cup",
          format_id: "fmt-svg",
          date: "2024-03-02",
          player_count: 32,
          platform: "limitless",
          is_online: true,
          decklists: false,
          data_imported_at: null,
          import_status: "importing",
          import_requested_at: "2024-03-02T00:00:00Z",
          import_error: null,
          import_attempts: 1,
        },
        {
          tournament_id: "t-failed",
          name: "Failed Cup",
          format_id: "fmt-svg",
          date: "2024-03-03",
          player_count: 16,
          platform: "limitless",
          is_online: true,
          decklists: false,
          data_imported_at: null,
          import_status: "failed",
          import_requested_at: null,
          import_error: "boom",
          import_attempts: 3,
        },
        {
          tournament_id: "t-done",
          name: "Imported Cup",
          format_id: "fmt-svg",
          date: "2024-03-04",
          player_count: 8,
          platform: "limitless",
          is_online: true,
          decklists: true,
          data_imported_at: "2024-03-05T00:00:00Z",
          import_status: "completed",
          import_requested_at: null,
          import_error: null,
          import_attempts: 0,
        },
      ],
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockSupabaseData = {};
  });

  it("renders limitless tournament rows with queue/import status badges", async () => {
    render(<ExternalData />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Source: Limitless/i })
      );
    });

    // "Queued Cup" appears both in its table row and the "Next up:" queue
    // indicator, so assert at least one match.
    await waitFor(() => {
      expect(screen.getAllByText("Queued Cup").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("Importing Cup")).toBeInTheDocument();
    expect(screen.getByText("Failed Cup")).toBeInTheDocument();
    expect(screen.getByText("Imported Cup")).toBeInTheDocument();

    // Status badges
    expect(screen.getAllByText(/Queued/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Importing/i).length).toBeGreaterThan(0);
    // Failed badge shows attempt count "(3x)"
    expect(screen.getByText(/Failed \(3x\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Imported/i).length).toBeGreaterThan(0);
  });

  it("Import on a Limitless row queues the tournament", async () => {
    const { queueTournamentForImport } = jest.requireMock(
      "@/actions/limitless"
    );
    queueTournamentForImport.mockResolvedValue({ success: true });

    render(<ExternalData />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Source: Limitless/i })
      );
    });
    await waitFor(() =>
      expect(screen.getByText("Failed Cup")).toBeInTheDocument()
    );

    // The unified "Import" action on a Limitless row dispatches to the queue.
    const failedRow = screen
      .getByText("Failed Cup")
      .closest("div.grid") as HTMLElement;
    await act(async () => {
      fireEvent.click(
        within(failedRow).getByRole("button", { name: /^Import$/i })
      );
    });
    await waitFor(() =>
      expect(queueTournamentForImport).toHaveBeenCalledWith("t-failed")
    );
  });
});

// =============================================================================
// Limitless status tabs + skipped chip/banner/queue-exclusion
// =============================================================================

// A known-mappable format id — present in ALL_VALID_FORMATS so the row
// resolves to "pending" (or "failed") rather than "skipped".
const MAPPED_FORMAT = "gen9championsvgc2026regma";
// An unmappable format id — absent from ALL_VALID_FORMATS so the row resolves
// to "skipped" regardless of import_status.
const UNMAPPED_FORMAT = "CUSTOM";

function makeLimitlessTournament(
  overrides: Partial<{
    tournament_id: string;
    name: string;
    format_id: string;
    import_status: string | null;
    data_imported_at: string | null;
    import_requested_at: string | null;
    import_error: string | null;
    import_attempts: number;
  }>
) {
  return {
    tournament_id: "t-default",
    name: "Default Cup",
    format_id: MAPPED_FORMAT,
    date: "2024-03-01",
    player_count: 32,
    platform: "limitless",
    is_online: true,
    decklists: false,
    data_imported_at: null,
    import_status: null,
    import_requested_at: null,
    import_error: null,
    import_attempts: 0,
    ...overrides,
  };
}

describe("Limitless status tabs + skipped", () => {
  beforeEach(() => {
    setupSiteConfigMocks();
    // Fixture:
    //   - 1 mapped pending row  → displayStatus "pending"  (queueable)
    //   - 1 mapped failed row   → displayStatus "failed"   (queueable)
    //   - 1 CUSTOM skipped row  → displayStatus "skipped"  (NOT queueable)
    // Expected: skippedCount=1, queueMatchingCount=2
    mockSupabaseData = {
      tournaments: [
        makeLimitlessTournament({
          tournament_id: "t-pending",
          name: "Pending Cup",
          format_id: MAPPED_FORMAT,
          import_status: null,
        }),
        makeLimitlessTournament({
          tournament_id: "t-failed",
          name: "Failed Cup",
          format_id: MAPPED_FORMAT,
          import_status: "failed",
          import_error: "timeout",
          import_attempts: 1,
        }),
        makeLimitlessTournament({
          tournament_id: "t-skipped",
          name: "Custom Cup",
          format_id: UNMAPPED_FORMAT,
          import_status: "skipped",
        }),
      ],
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockSupabaseData = {};
  });

  async function openLimitlessTab() {
    render(<ExternalData />);
    // Switch source to Limitless via the ExternalDataFilters stub
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Source: Limitless/i })
      );
    });
    // Wait until the Limitless toolbar is rendered (confirms data has resolved)
    await waitFor(() =>
      expect(screen.getByTestId("toolbar")).toBeInTheDocument()
    );
  }

  it("renders a Skipped status tab with the correct count", async () => {
    await openLimitlessTab();

    // The StatusTabs component is NOT stubbed — it renders the real tab list.
    const skippedTab = await waitFor(() =>
      screen.getByRole("tab", { name: /Skipped/i })
    );
    expect(skippedTab).toBeInTheDocument();
    // The tab badge should contain "1" (one CUSTOM row)
    expect(skippedTab.textContent).toMatch(/1/);
  });

  it("shows a skipped chip in the stat strip with the correct count", async () => {
    await openLimitlessTab();

    // The toolbar stub renders chips as "<count> <label>" spans.
    await waitFor(() => {
      expect(screen.getByTestId("chip-skipped")).toBeInTheDocument();
    });
    expect(screen.getByTestId("chip-skipped").textContent).toMatch(/1 skipped/);
  });

  it("shows the breakdown banner when the Skipped tab is active", async () => {
    await openLimitlessTab();

    // Click the Skipped status tab to filter to skipped rows
    const skippedTab = await waitFor(() =>
      screen.getByRole("tab", { name: /Skipped/i })
    );
    await act(async () => {
      fireEvent.click(skippedTab);
    });

    // The breakdown banner should appear with event count and format pill
    await waitFor(() => {
      expect(screen.getByText(/events skipped/i)).toBeInTheDocument();
    });
    // The CUSTOM format pill should be present in the banner (at least one match)
    expect(screen.getAllByText(/CUSTOM/i).length).toBeGreaterThan(0);
  });

  it("Import matching button count excludes skipped rows", async () => {
    await openLimitlessTab();

    // The toolbar stub renders "Import matching (N)" — assert N=2 (pending+failed,
    // not 3 which would include the CUSTOM skipped row).
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Import matching \(2\)/i })
      ).toBeInTheDocument();
    });
  });
});
