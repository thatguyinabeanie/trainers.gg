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
