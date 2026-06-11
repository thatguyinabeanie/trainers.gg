/**
 * Unit tests for EventList — the filtered pipeline event list.
 *
 * Coverage targets:
 * - Empty state renders when events=[]
 * - All five display statuses map to the correct StatusBadge bucket
 * - Skipped rows show skipReason and an "Import anyway" button
 * - Non-skipped rows do NOT show "Import anyway"
 * - Delete and Delete & exclude buttons are present on every row
 * - Callback props are invoked with the correct event
 * - pendingKey disables the matching row's buttons; other rows remain enabled
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { type PipelineEvent } from "@trainers/supabase/queries";

// ── Button mock — passes through key props including disabled/onClick ─────────

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    variant: _variant,
    size: _size,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => <button {...props}>{children}</button>,
}));

// ── StatusBadge mock — renders a simple data-status span ──────────────────────

jest.mock("@/components/ui/status-badge", () => ({
  StatusBadge: ({ status, label }: { status: string; label?: string }) => (
    <span data-testid="status-badge" data-status={status}>
      {label ?? status}
    </span>
  ),
}));

// ── Import under test (after mocks) ──────────────────────────────────────────

import { EventList } from "../event-list";

// =============================================================================
// Fixtures
// =============================================================================

const skipped: PipelineEvent = {
  source: "limitless",
  sourceEventId: "1",
  name: "Custom Cup",
  format: "CUSTOM",
  importStatus: "skipped",
  displayStatus: "skipped",
  playerCount: 12,
  dateStart: "2026-01-02",
  skipReason: "format: CUSTOM — not importable",
};

const complete: PipelineEvent = {
  source: "rk9",
  sourceEventId: "rk9-001",
  name: "Regionals 2026",
  format: "VGC25",
  importStatus: "complete",
  displayStatus: "complete",
  playerCount: 256,
  dateStart: "2026-03-15",
  skipReason: null,
};

const failed: PipelineEvent = {
  source: "limitless",
  sourceEventId: "lim-002",
  name: "Broken Cup",
  format: "VGC25",
  importStatus: "failed",
  displayStatus: "failed",
  playerCount: 0,
  dateStart: null,
  skipReason: null,
};

const queued: PipelineEvent = {
  source: "rk9",
  sourceEventId: "rk9-002",
  name: "Upcoming Event",
  format: "VGC25",
  importStatus: "queued",
  displayStatus: "queued",
  playerCount: 128,
  dateStart: "2026-06-01",
  skipReason: null,
};

const processing: PipelineEvent = {
  source: "rk9",
  sourceEventId: "rk9-003",
  name: "In Progress Event",
  format: "VGC25",
  importStatus: "roster",
  displayStatus: "processing",
  playerCount: 64,
  dateStart: "2026-05-01",
  skipReason: null,
};

/** Default no-op callbacks */
function makeCallbacks() {
  return {
    onDelete: jest.fn(),
    onExclude: jest.fn(),
    onForceImport: jest.fn(),
  };
}

// =============================================================================
// Empty state
// =============================================================================

describe("EventList — empty state", () => {
  it("renders the empty message when events=[]", () => {
    render(
      <EventList
        events={[]}
        onDelete={jest.fn()}
        onExclude={jest.fn()}
        onForceImport={jest.fn()}
        pendingKey={null}
      />
    );
    expect(screen.getByText(/No events in this status/i)).toBeInTheDocument();
  });

  it("renders no list items when events=[]", () => {
    const { container } = render(
      <EventList
        events={[]}
        onDelete={jest.fn()}
        onExclude={jest.fn()}
        onForceImport={jest.fn()}
        pendingKey={null}
      />
    );
    expect(container.querySelectorAll("li")).toHaveLength(0);
  });
});

// =============================================================================
// Plan's required test (Task 4.2 Step 1)
// =============================================================================

describe("EventList", () => {
  it("shows the skip reason and an Import anyway action on skipped rows", () => {
    render(
      <EventList
        events={[skipped]}
        onDelete={() => {}}
        onExclude={() => {}}
        onForceImport={() => {}}
        pendingKey={null}
      />
    );
    expect(screen.getByText(/CUSTOM — not importable/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /import anyway/i })
    ).toBeInTheDocument();
  });
});

// =============================================================================
// Skip reason rendering
// =============================================================================

describe("EventList — skip reason", () => {
  it("shows skipReason text in amber for skipped rows", () => {
    render(
      <EventList
        events={[skipped]}
        onDelete={jest.fn()}
        onExclude={jest.fn()}
        onForceImport={jest.fn()}
        pendingKey={null}
      />
    );
    const reason = screen.getByText(/CUSTOM — not importable/);
    expect(reason).toBeInTheDocument();
    expect(reason.className).toContain("text-amber-600");
  });

  it("does not show the skip reason section when skipReason is null", () => {
    render(
      <EventList
        events={[complete]}
        onDelete={jest.fn()}
        onExclude={jest.fn()}
        onForceImport={jest.fn()}
        pendingKey={null}
      />
    );
    // No amber text should be in the DOM
    expect(document.querySelector(".text-amber-600")).toBeNull();
  });
});

// =============================================================================
// "Import anyway" visibility rules
// =============================================================================

describe("EventList — Import anyway button", () => {
  it("shows Import anyway ONLY for skipped rows", () => {
    render(
      <EventList
        events={[skipped, complete, failed]}
        onDelete={jest.fn()}
        onExclude={jest.fn()}
        onForceImport={jest.fn()}
        pendingKey={null}
      />
    );
    // Only one "Import anyway" button should exist (for the skipped row)
    expect(
      screen.getAllByRole("button", { name: /import anyway/i })
    ).toHaveLength(1);
  });

  it.each([
    ["complete", complete],
    ["failed", failed],
    ["queued", queued],
    ["processing", processing],
  ] satisfies Array<[string, PipelineEvent]>)(
    "does NOT show Import anyway for %s rows",
    (_label, event) => {
      render(
        <EventList
          events={[event]}
          onDelete={jest.fn()}
          onExclude={jest.fn()}
          onForceImport={jest.fn()}
          pendingKey={null}
        />
      );
      expect(
        screen.queryByRole("button", { name: /import anyway/i })
      ).not.toBeInTheDocument();
    }
  );
});

// =============================================================================
// Delete / Delete & exclude buttons always present
// =============================================================================

describe("EventList — Delete and Delete & exclude buttons", () => {
  it("shows Delete and Delete & exclude for every row", () => {
    render(
      <EventList
        events={[skipped, complete, failed]}
        onDelete={jest.fn()}
        onExclude={jest.fn()}
        onForceImport={jest.fn()}
        pendingKey={null}
      />
    );
    expect(screen.getAllByRole("button", { name: /^Delete$/i })).toHaveLength(
      3
    );
    expect(
      screen.getAllByRole("button", { name: /Delete & exclude/i })
    ).toHaveLength(3);
  });
});

// =============================================================================
// Callback firing
// =============================================================================

describe("EventList — callback props", () => {
  it("calls onForceImport with the correct event when Import anyway is clicked", async () => {
    const user = userEvent.setup();
    const { onDelete, onExclude, onForceImport } = makeCallbacks();

    render(
      <EventList
        events={[skipped]}
        onDelete={onDelete}
        onExclude={onExclude}
        onForceImport={onForceImport}
        pendingKey={null}
      />
    );

    await user.click(screen.getByRole("button", { name: /import anyway/i }));
    expect(onForceImport).toHaveBeenCalledTimes(1);
    expect(onForceImport).toHaveBeenCalledWith(skipped);
    expect(onDelete).not.toHaveBeenCalled();
    expect(onExclude).not.toHaveBeenCalled();
  });

  it("calls onDelete with the correct event when Delete is clicked", async () => {
    const user = userEvent.setup();
    const { onDelete, onExclude, onForceImport } = makeCallbacks();

    render(
      <EventList
        events={[complete]}
        onDelete={onDelete}
        onExclude={onExclude}
        onForceImport={onForceImport}
        pendingKey={null}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Delete$/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(complete);
    expect(onExclude).not.toHaveBeenCalled();
  });

  it("calls onExclude with the correct event when Delete & exclude is clicked", async () => {
    const user = userEvent.setup();
    const { onDelete, onExclude, onForceImport } = makeCallbacks();

    render(
      <EventList
        events={[complete]}
        onDelete={onDelete}
        onExclude={onExclude}
        onForceImport={onForceImport}
        pendingKey={null}
      />
    );

    await user.click(screen.getByRole("button", { name: /Delete & exclude/i }));
    expect(onExclude).toHaveBeenCalledTimes(1);
    expect(onExclude).toHaveBeenCalledWith(complete);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("calls onDelete with the correct row when multiple rows are present", async () => {
    const user = userEvent.setup();
    const { onDelete, onExclude, onForceImport } = makeCallbacks();

    render(
      <EventList
        events={[complete, failed]}
        onDelete={onDelete}
        onExclude={onExclude}
        onForceImport={onForceImport}
        pendingKey={null}
      />
    );

    // Click the first Delete button (for `complete`)
    const deleteBtns = screen.getAllByRole("button", { name: /^Delete$/i });
    await user.click(deleteBtns[0]!);
    expect(onDelete).toHaveBeenCalledWith(complete);
  });
});

// =============================================================================
// pendingKey — busy state disables row buttons
// =============================================================================

describe("EventList — pendingKey busy state", () => {
  it("disables all buttons on the pending row when pendingKey matches", () => {
    render(
      <EventList
        events={[skipped, complete]}
        onDelete={jest.fn()}
        onExclude={jest.fn()}
        onForceImport={jest.fn()}
        pendingKey="limitless:1" // matches skipped
      />
    );

    // The skipped row has 3 buttons: Import anyway, Delete, Delete & exclude
    const importAnyway = screen.getByRole("button", { name: /import anyway/i });
    expect(importAnyway).toBeDisabled();

    // Both Delete buttons: first belongs to skipped (disabled), second to complete (enabled)
    const deleteBtns = screen.getAllByRole("button", { name: /^Delete$/i });
    expect(deleteBtns[0]).toBeDisabled();
    expect(deleteBtns[1]).not.toBeDisabled();
  });

  it("leaves other rows enabled when pendingKey targets a different row", () => {
    render(
      <EventList
        events={[skipped, complete]}
        onDelete={jest.fn()}
        onExclude={jest.fn()}
        onForceImport={jest.fn()}
        pendingKey="rk9:rk9-001" // matches complete only
      />
    );

    const deleteBtns = screen.getAllByRole("button", { name: /^Delete$/i });
    // skipped row (index 0) is enabled; complete row (index 1) is disabled
    expect(deleteBtns[0]).not.toBeDisabled();
    expect(deleteBtns[1]).toBeDisabled();
  });

  it("enables all buttons when pendingKey is null", () => {
    render(
      <EventList
        events={[complete]}
        onDelete={jest.fn()}
        onExclude={jest.fn()}
        onForceImport={jest.fn()}
        pendingKey={null}
      />
    );

    const deleteBtns = screen.getAllByRole("button", { name: /^Delete$/i });
    deleteBtns.forEach((btn) => expect(btn).not.toBeDisabled());
  });
});

// =============================================================================
// StatusBadge mapping (display status → badge bucket)
// =============================================================================

describe("EventList — StatusBadge mapping", () => {
  it.each([
    ["complete", complete, "active"],
    ["processing", processing, "upcoming"],
    ["queued", queued, "draft"],
    ["skipped", skipped, "completed"],
    ["failed", failed, "cancelled"],
  ] satisfies Array<[string, PipelineEvent, string]>)(
    "%s display status maps to %s badge",
    (_label, event, expectedBadge) => {
      render(
        <EventList
          events={[event]}
          onDelete={jest.fn()}
          onExclude={jest.fn()}
          onForceImport={jest.fn()}
          pendingKey={null}
        />
      );

      const badge = screen.getByTestId("status-badge");
      expect(badge).toHaveAttribute("data-status", expectedBadge);
    }
  );
});

// =============================================================================
// Row metadata rendering
// =============================================================================

describe("EventList — row metadata", () => {
  it("shows event name, source, format, player count, and date", () => {
    render(
      <EventList
        events={[complete]}
        onDelete={jest.fn()}
        onExclude={jest.fn()}
        onForceImport={jest.fn()}
        pendingKey={null}
      />
    );

    expect(screen.getByText("Regionals 2026")).toBeInTheDocument();
    expect(screen.getByText(/rk9/i)).toBeInTheDocument();
    expect(screen.getByText(/VGC25/)).toBeInTheDocument();
    expect(screen.getByText(/256 players/)).toBeInTheDocument();
    expect(screen.getByText(/2026-03-15/)).toBeInTheDocument();
  });

  it("shows 'unknown format' when format is null", () => {
    const noFormat: PipelineEvent = { ...complete, format: null };
    render(
      <EventList
        events={[noFormat]}
        onDelete={jest.fn()}
        onExclude={jest.fn()}
        onForceImport={jest.fn()}
        pendingKey={null}
      />
    );
    expect(screen.getByText(/unknown format/)).toBeInTheDocument();
  });

  it("shows — when dateStart is null", () => {
    render(
      <EventList
        events={[failed]}
        onDelete={jest.fn()}
        onExclude={jest.fn()}
        onForceImport={jest.fn()}
        pendingKey={null}
      />
    );
    expect(screen.getByText(/—/)).toBeInTheDocument();
  });
});
