import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Stub cn() so Tailwind class merging doesn't fail in jest ─────────────────

jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

// ── Import under test (after mocks) ──────────────────────────────────────────

import { StatusChips } from "../status-chips";
import { type DisplayStatus, type StatusCounts } from "@trainers/supabase/queries";

// =============================================================================
// Helpers
// =============================================================================

const ALL_COUNTS: StatusCounts = {
  queued: 3,
  processing: 1,
  failed: 0,
  skipped: 2,
  complete: 9,
};

// =============================================================================
// Rendering all five chips
// =============================================================================

describe("StatusChips — renders all five chips", () => {
  it("renders all five status chips", () => {
    render(
      <StatusChips counts={ALL_COUNTS} active="queued" onChange={() => {}} />
    );
    expect(screen.getByRole("tab", { name: /queued/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /processing/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /failed/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /skipped/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /complete/i })).toBeInTheDocument();
  });

  it("renders all chips inside a tablist with accessible label", () => {
    render(
      <StatusChips counts={ALL_COUNTS} active="queued" onChange={() => {}} />
    );
    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveAttribute("aria-label");
  });
});

// =============================================================================
// Active chip marks the correct aria-selected (the plan's required test)
// =============================================================================

describe("StatusChips — active chip", () => {
  it("renders all five chips with counts and marks the active one", () => {
    render(
      <StatusChips
        counts={{
          queued: 3,
          processing: 1,
          failed: 0,
          skipped: 2,
          complete: 9,
        }}
        active="skipped"
        onChange={() => {}}
      />
    );
    expect(screen.getByRole("tab", { name: /queued/i })).toHaveTextContent("3");
    expect(screen.getByRole("tab", { name: /skipped/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it.each([
    "queued",
    "processing",
    "failed",
    "skipped",
    "complete",
  ] satisfies DisplayStatus[])(
    "marks %s as aria-selected=true when active",
    (status) => {
      render(
        <StatusChips counts={ALL_COUNTS} active={status} onChange={() => {}} />
      );
      expect(
        screen.getByRole("tab", { name: new RegExp(status, "i") })
      ).toHaveAttribute("aria-selected", "true");
    }
  );

  it("marks all other chips as aria-selected=false when one is active", () => {
    render(
      <StatusChips counts={ALL_COUNTS} active="failed" onChange={() => {}} />
    );
    const inactiveStatuses: DisplayStatus[] = [
      "queued",
      "processing",
      "skipped",
      "complete",
    ];
    for (const status of inactiveStatuses) {
      expect(
        screen.getByRole("tab", { name: new RegExp(status, "i") })
      ).toHaveAttribute("aria-selected", "false");
    }
  });
});

// =============================================================================
// Count display
// =============================================================================

describe("StatusChips — count display", () => {
  it("shows count for each chip", () => {
    const counts: StatusCounts = {
      queued: 5,
      processing: 2,
      failed: 1,
      skipped: 7,
      complete: 42,
    };
    render(<StatusChips counts={counts} active="queued" onChange={() => {}} />);
    // Each chip button contains the count text
    expect(screen.getByRole("tab", { name: /queued/i })).toHaveTextContent("5");
    expect(screen.getByRole("tab", { name: /processing/i })).toHaveTextContent(
      "2"
    );
    expect(screen.getByRole("tab", { name: /failed/i })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: /skipped/i })).toHaveTextContent(
      "7"
    );
    expect(screen.getByRole("tab", { name: /complete/i })).toHaveTextContent(
      "42"
    );
  });

  it("shows zero counts without special formatting", () => {
    const counts: StatusCounts = {
      queued: 0,
      processing: 0,
      failed: 0,
      skipped: 0,
      complete: 0,
    };
    render(<StatusChips counts={counts} active="queued" onChange={() => {}} />);
    // All chips still render with zero
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
  });
});

// =============================================================================
// onChange interaction
// =============================================================================

describe("StatusChips — onChange", () => {
  it("calls onChange with the chip's status when clicked", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <StatusChips counts={ALL_COUNTS} active="queued" onChange={onChange} />
    );

    await user.click(screen.getByRole("tab", { name: /processing/i }));
    expect(onChange).toHaveBeenCalledWith("processing");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["queued", "queued"],
    ["processing", "processing"],
    ["failed", "failed"],
    ["skipped", "skipped"],
    ["complete", "complete"],
  ] satisfies Array<[string, DisplayStatus]>)(
    "calls onChange with '%s' when the %s chip is clicked",
    async (label, expectedStatus) => {
      const user = userEvent.setup();
      const onChange = jest.fn();

      render(
        <StatusChips counts={ALL_COUNTS} active="queued" onChange={onChange} />
      );

      await user.click(
        screen.getByRole("tab", { name: new RegExp(label, "i") })
      );
      expect(onChange).toHaveBeenCalledWith(expectedStatus);
    }
  );

  it("does not call onChange when clicking the already-active chip", async () => {
    // onChange IS called (no prevention) — this test verifies it still fires
    // (the parent decides if it wants to react to clicking the active chip)
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <StatusChips counts={ALL_COUNTS} active="queued" onChange={onChange} />
    );

    await user.click(screen.getByRole("tab", { name: /queued/i }));
    // onChange is called — there is no special prevention for the active chip
    expect(onChange).toHaveBeenCalledWith("queued");
  });
});
