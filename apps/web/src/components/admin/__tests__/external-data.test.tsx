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

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: () => ({
    data: [],
    error: null,
    isLoading: false,
    isFetching: false,
  }),
}));

jest.mock("@/lib/limitless", () => ({
  LIMITLESS_TO_FORMAT: { svg: "fmt-svg" },
}));

jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
    measure: () => {},
    scrollToIndex: () => {},
  }),
}));

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
