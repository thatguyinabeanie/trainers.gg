/**
 * Unit tests for DataPage — the /admin/data client root.
 *
 * Coverage targets:
 * - Renders without a banner when loadError is null / undefined
 * - Renders an Alert banner with the error message when loadError is set
 * - Banner is present above the tabs (not inside a tab panel)
 * - Tabs render regardless of loadError
 */
import React from "react";
import { render, screen } from "@testing-library/react";

// ── Stub cn() so Tailwind class merging doesn't fail in Jest ─────────────────

jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

// ── Alert — let the real component render so role="alert" is present ─────────
// (alert.tsx only depends on cn(), which is already mocked above)

// ── Heavy child tabs — stub them out so we test DataPage in isolation ────────

jest.mock("../monitor-tab", () => ({
  MonitorTab: () => <div data-testid="monitor-tab" />,
}));

jest.mock("../config-tab", () => ({
  ConfigTab: () => <div data-testid="config-tab" />,
}));

// ── lucide-react — stub the icon so SVG rendering doesn't need jsdom tweaks ──

jest.mock("lucide-react", () => ({
  TriangleAlertIcon: () => <svg data-testid="warning-icon" />,
}));

// ── Import under test (after mocks) ──────────────────────────────────────────

import { DataPage } from "../data-page";
import type { PipelineMonitor } from "@trainers/supabase/queries";
import type { StageCard } from "../pipeline-cards";
import type { CronSchedules } from "../use-pipeline-config";

// =============================================================================
// Fixtures
// =============================================================================

const EMPTY_MONITOR: PipelineMonitor = {
  events: [],
  counts: {
    queued: 0,
    processing: 0,
    failed: 0,
    skipped: 0,
    complete: 0,
  },
};

const CARDS: StageCard[] = [
  {
    stage: "sync",
    title: "Sync",
    lastStatus: null,
    lastRunAt: null,
    progress: null,
  },
  {
    stage: "import",
    title: "Import",
    lastStatus: null,
    lastRunAt: null,
    progress: null,
  },
  {
    stage: "compile",
    title: "Update stats",
    lastStatus: null,
    lastRunAt: null,
    progress: null,
  },
];

const CONFIG = { pipelineEnabled: false, limitlessBatchSize: 25 };

const SCHEDULES: CronSchedules = {
  sync: "*/5 * * * *",
  import: "* * * * *",
  compile: "*/2 * * * *",
};

// =============================================================================
// Tests
// =============================================================================

describe("DataPage — loadError banner", () => {
  it("does NOT render an alert when loadError is undefined", () => {
    render(
      <DataPage
        monitor={EMPTY_MONITOR}
        cards={CARDS}
        config={CONFIG}
        schedules={SCHEDULES}
      />
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does NOT render an alert when loadError is null", () => {
    render(
      <DataPage
        monitor={EMPTY_MONITOR}
        cards={CARDS}
        config={CONFIG}
        schedules={SCHEDULES}
        loadError={null}
      />
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders an alert with the error message when loadError is set", () => {
    const msg =
      "Couldn't load the latest pipeline data — showing what's available. It'll refresh automatically.";

    render(
      <DataPage
        monitor={EMPTY_MONITOR}
        cards={CARDS}
        config={CONFIG}
        schedules={SCHEDULES}
        loadError={msg}
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(msg);
  });

  it("renders the warning icon inside the alert", () => {
    render(
      <DataPage
        monitor={EMPTY_MONITOR}
        cards={CARDS}
        config={CONFIG}
        schedules={SCHEDULES}
        loadError="Something went wrong."
      />
    );

    expect(screen.getByTestId("warning-icon")).toBeInTheDocument();
  });

  it("still renders the tabs when loadError is set", () => {
    render(
      <DataPage
        monitor={EMPTY_MONITOR}
        cards={CARDS}
        config={CONFIG}
        schedules={SCHEDULES}
        loadError="Something went wrong."
      />
    );

    expect(screen.getByRole("tab", { name: /monitor/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /config/i })).toBeInTheDocument();
  });

  it("still renders the tabs when loadError is not set", () => {
    render(
      <DataPage
        monitor={EMPTY_MONITOR}
        cards={CARDS}
        config={CONFIG}
        schedules={SCHEDULES}
      />
    );

    expect(screen.getByRole("tab", { name: /monitor/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /config/i })).toBeInTheDocument();
  });
});
