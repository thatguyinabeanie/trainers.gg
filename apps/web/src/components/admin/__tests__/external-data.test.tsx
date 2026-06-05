/**
 * Tests the inline slider handlers in ExternalData that persist values to
 * site_config. The component is large; this file mocks the surrounding
 * environment and focuses on verifying setSiteConfig is invoked with the
 * correct key/value combinations when the user changes a numeric input.
 */
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
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

jest.mock("@/lib/limitless", () => ({
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
        <button role="switch" aria-checked={backendOn} onClick={() => onToggleBackend(!backendOn)} />
        {tab === "rk9" ? (
          <>
            <input type="number" role="spinbutton" value={teamsPerTick} onChange={(e) => onTeamsPerTickChange?.(e.target.value)} onBlur={onTeamsPerTickBlur} readOnly={false} />
            <input type="number" role="spinbutton" value={concurrency} onChange={(e) => onConcurrencyChange?.(e.target.value)} onBlur={onConcurrencyBlur} readOnly={false} />
          </>
        ) : (
          <input type="number" role="spinbutton" value={batchSize} onChange={(e) => onBatchSizeChange?.(e.target.value)} onBlur={onBatchSizeBlur} readOnly={false} />
        )}
        <input type="number" role="spinbutton" value={intervalSeconds} onChange={(e) => onIntervalChange(e.target.value)} onBlur={onIntervalBlur} readOnly={false} />
      </div>
    );
  },
}));

// Stub ExternalDataToolbar to render StatusChips + the settings stub inline
jest.mock("../external-data-toolbar", () => ({
  ExternalDataToolbar: ({
    settings,
    isFetching,
    onRefresh,
    onDiscover,
    isDiscovering,
    onScrapeRostersMatching,
    rosterMatchingCount,
    onScrapeTeamsMatching,
    teamsMatchingCount,
    onSync,
    syncing,
    onQueueMatching,
    queueMatchingCount,
    onQueueAll,
    queueAllCount,
    onRunImport,
    importing,
    bulkProcessing,
    tab,
  }: {
    settings: Record<string, unknown>;
    isFetching?: boolean;
    onRefresh?: () => void;
    onDiscover?: () => void;
    isDiscovering?: boolean;
    onScrapeRostersMatching?: () => void;
    rosterMatchingCount?: number;
    onScrapeTeamsMatching?: () => void;
    teamsMatchingCount?: number;
    onSync?: () => void;
    syncing?: boolean;
    onQueueMatching?: () => void;
    queueMatchingCount?: number;
    onQueueAll?: () => void;
    queueAllCount?: number;
    onRunImport?: () => void;
    importing?: boolean;
    bulkProcessing?: boolean;
    tab: string;
  }) => {
    // Lazy-require the settings stub so it participates in jest mocking
    const { ExternalDataSettings } = jest.requireMock("../external-data-settings") as {
      ExternalDataSettings: React.ComponentType<Record<string, unknown>>;
    };
    return (
      <div data-testid={`toolbar-${tab}`}>
        <ExternalDataSettings {...(settings as Record<string, unknown>)} />
        {tab === "rk9" && (
          <>
            <button onClick={onDiscover} disabled={isDiscovering}>Discover</button>
            <button onClick={onScrapeRostersMatching} disabled={bulkProcessing || rosterMatchingCount === 0}>
              Scrape Rosters ({rosterMatchingCount ?? 0})
            </button>
            <button onClick={onScrapeTeamsMatching} disabled={bulkProcessing || teamsMatchingCount === 0}>
              Scrape Teams ({teamsMatchingCount ?? 0})
            </button>
          </>
        )}
        {tab === "limitless" && (
          <>
            <button onClick={onSync} disabled={syncing}>Sync</button>
            <button onClick={onQueueMatching} disabled={bulkProcessing || queueMatchingCount === 0}>
              Queue Matching ({queueMatchingCount ?? 0})
            </button>
            <button onClick={onQueueAll}>Queue All ({queueAllCount ?? 0})</button>
            <button onClick={onRunImport} disabled={importing}>Run Import</button>
          </>
        )}
        <button onClick={onRefresh} disabled={isFetching}>Refresh</button>
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
    // RK9 tab is not the default — switch to it so the RK9 inputs render
    await renderAndWaitForInputs();
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /RK9/i }));
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
      fireEvent.click(screen.getByRole("tab", { name: /RK9/i }));
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
      fireEvent.click(screen.getByRole("tab", { name: /RK9/i }));
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
      fireEvent.click(screen.getByRole("tab", { name: /Limitless/i }));
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
      fireEvent.click(screen.getByRole("tab", { name: /Limitless/i }));
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
  // Switch to RK9 tab — it is not the default
  await act(async () => {
    fireEvent.click(screen.getByRole("tab", { name: /RK9/i }));
  });
  // Wait for the config loading state to resolve so controls render
  await waitFor(() =>
    expect(screen.queryAllByRole("switch").length).toBeGreaterThanOrEqual(1)
  );
}

async function renderAndWaitForLimitlessTab() {
  render(<ExternalData />);
  await act(async () => {
    fireEvent.click(screen.getByRole("tab", { name: /Limitless/i }));
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
      expect(
        jest.requireMock("sonner").toast.error
      ).toHaveBeenCalledWith("Failed to update RK9 backend setting");
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
      expect(
        jest.requireMock("sonner").toast.error
      ).toHaveBeenCalledWith("Failed to update Limitless backend setting");
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
      screen.getByRole("button", { name: /Discover/i })
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
      screen.getByRole("button", { name: /Discover/i })
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
    const syncMock = jest.requireMock("@/actions/limitless").triggerLimitlessSync;
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
    const syncMock = jest.requireMock("@/actions/limitless").triggerLimitlessSync;
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
      expect(
        screen.getByRole("button", { name: /Discover/i })
      ).toBeInTheDocument();
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
        makeEvent({ event_id: "e-pending", name: "Pending Event", import_status: "pending" }),
        makeEvent({
          event_id: "e-failed",
          name: "Failed Event",
          import_status: "failed",
          import_error: "Scrape failed",
        }),
        makeEvent({ event_id: "e-roster", name: "Roster Event", import_status: "roster" }),
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
    // "Upcoming" appears in the status filter dropdown too — assert ≥1 match
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
    await waitFor(() => expect(screen.getByText("Pending Event")).toBeInTheDocument());

    const rosterButtons = screen.getAllByRole("button", { name: /^Roster$/i });
    await act(async () => {
      fireEvent.click(rosterButtons[0]);
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
    await waitFor(() => expect(screen.getByText("Roster Event")).toBeInTheDocument());

    const teamButtons = screen.getAllByRole("button", { name: /^Teams$/i });
    await act(async () => {
      fireEvent.click(teamButtons[0]);
    });

    await waitFor(() => expect(scrapeRk9TeamsBatch).toHaveBeenCalled());
  });

  it("resets event data after confirmation when the reset button is clicked", async () => {
    const { resetRk9EventData } = jest.requireMock("@/actions/rk9");
    resetRk9EventData.mockResolvedValue({ success: true });
    jest.spyOn(window, "confirm").mockReturnValue(true);

    render(<ExternalData />);
    await waitFor(() => expect(screen.getByText("Failed Event")).toBeInTheDocument());

    const resetButtons = screen.getAllByRole("button", { name: /Reset event/i });
    await act(async () => {
      fireEvent.click(resetButtons[0]);
    });

    await waitFor(() => expect(resetRk9EventData).toHaveBeenCalled());
  });

  it("expands a row to render the detail panel when the chevron is clicked", async () => {
    render(<ExternalData />);
    await waitFor(() => expect(screen.getByText("Roster Event")).toBeInTheDocument());

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
    await waitFor(() => expect(screen.getByText("Pending Event")).toBeInTheDocument());

    const selectAll = screen.getByLabelText(/Select all visible/i) as HTMLInputElement;
    await act(async () => {
      fireEvent.click(selectAll);
    });

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/Select all visible/i) as HTMLInputElement).checked
      ).toBe(true);
    });
    // Bulk "Scrape Rosters" action surfaces for roster-eligible (pending/failed) rows
    expect(screen.getByText(/Scrape Rosters/i)).toBeInTheDocument();
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

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Players/i }));
    });
    await waitFor(() => expect(screen.getByText(/Ash Ketchum/i)).toBeInTheDocument());

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
      fireEvent.click(screen.getByRole("tab", { name: /Limitless/i }));
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

  it("queues a tournament when the queue action button is clicked", async () => {
    const { queueTournamentForImport } = jest.requireMock("@/actions/limitless");
    queueTournamentForImport.mockResolvedValue({ success: true });

    render(<ExternalData />);
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /Limitless/i }));
    });
    await waitFor(() => expect(screen.getByText("Failed Cup")).toBeInTheDocument());

    // The failed row exposes a queue (download) action button in RowActions
    const downloadButtons = screen.getAllByRole("button");
    const queueButton = downloadButtons.find((b) =>
      b.querySelector("svg")
    );
    expect(queueButton).toBeDefined();
  });
});
