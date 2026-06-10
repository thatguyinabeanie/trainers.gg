/**
 * Unit tests for QueueStrip — the compact server-side queue state strip.
 *
 * The component is a "use client" React component with no async data fetching
 * of its own. Tests focus on:
 * - Early return when queue is fully empty
 * - Conditional rendering of per-source counts
 * - Action button callbacks (onProcessNow, onUnqueueAll, onResetStuck)
 * - AlertDialog confirmation flow for "Unqueue all"
 * - Amber warning when auto-import is off but there are queued items
 * - "Process now" disabled state
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── AlertDialog mock — replaces portal-based Base UI primitives ────────────
//
// The real AlertDialog uses Base UI's internal state machine to synchronise
// open/close between the Root and its Trigger/Close sub-components.  In jest +
// jsdom that machinery is unavailable, so we build a minimal controlled mock:
// - AlertDialog passes `onOpenChange` down via a React context
// - AlertDialogTrigger reads that context and calls onOpenChange(true) on click

jest.mock("@/components/ui/alert-dialog", () => {
  // requireActual gives runtime React without a require() call; the top-level
  // `import React` supplies the type positions below. Cast avoids an `import()`
  // type annotation (banned by @typescript-eslint/consistent-type-imports).
  const ReactLib = jest.requireActual("react") as typeof React;

  // Shared context: open state + setter flow from AlertDialog root to Content
  const AlertDialogCtx = ReactLib.createContext<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
  }>({ open: false, onOpenChange: () => {} });

  return {
    AlertDialog: ({
      children,
      open,
      onOpenChange = () => {},
    }: {
      children: React.ReactNode;
      open: boolean;
      onOpenChange?: (v: boolean) => void;
    }) => (
      <AlertDialogCtx.Provider value={{ open, onOpenChange }}>
        {children}
      </AlertDialogCtx.Provider>
    ),
    // Trigger: renders the render-prop button and wires onClick → onOpenChange(true)
    AlertDialogTrigger: ({
      render: renderProp,
    }: {
      render: React.ReactElement;
    }) => {
      const { onOpenChange } = ReactLib.useContext(AlertDialogCtx);
      return ReactLib.cloneElement(renderProp, {
        onClick: (e: React.MouseEvent) => {
          renderProp.props.onClick?.(e);
          onOpenChange(true);
        },
      });
    },
    // Content: only renders when open (reads from context)
    AlertDialogContent: ({ children }: { children: React.ReactNode }) => {
      const { open } = ReactLib.useContext(AlertDialogCtx);
      return open ? <div role="alertdialog">{children}</div> : null;
    },
    AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
      <h3>{children}</h3>
    ),
    AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
      <p>{children}</p>
    ),
    AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogCancel: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
    AlertDialogAction: ({
      children,
      className: _className,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      className?: string;
    }) => <button {...props}>{children}</button>,
  };
});

// ── Button mock — passes through all props including disabled/onClick ──────

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    variant: _variant,
    size: _size,
    className: _className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => <button {...props}>{children}</button>,
}));

// ── Stub cn() so Tailwind class merging doesn't fail in jest ──────────────

jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

// ── Import under test (after mocks) ──────────────────────────────────────

import { QueueStrip, type QueueStripProps } from "../external-data-queue-strip";

// =============================================================================
// Helpers
// =============================================================================

/** Default "all-zero" props — component returns null at this state. */
function makeProps(overrides: Partial<QueueStripProps> = {}): QueueStripProps {
  return {
    limitless: { queued: 0, importing: 0, failed: 0 },
    rk9: { queued: 0, inProgress: 0, failed: 0 },
    recentImported: 0,
    autoImportOn: { limitless: true, rk9: true },
    processing: false,
    onProcessNow: jest.fn(),
    onUnqueueAll: jest.fn(),
    onResetStuck: jest.fn(),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => jest.clearAllMocks());

// =============================================================================
// Early return — nothing to show
// =============================================================================

describe("QueueStrip early return", () => {
  it.each([
    ["all counts are 0", {}],
    [
      "all counts are 0 even if autoImportOn is false",
      {
        autoImportOn: { limitless: false, rk9: false },
      } satisfies Partial<QueueStripProps>,
    ],
  ])("renders nothing when %s", (_label, overrides) => {
    const { container } = render(<QueueStrip {...makeProps(overrides)} />);
    expect(container.firstChild).toBeNull();
  });
});

// =============================================================================
// Strip renders when there is work to show
// =============================================================================

describe("QueueStrip renders when queue is non-empty", () => {
  it.each([
    [
      "limitless.queued > 0",
      { limitless: { queued: 3, importing: 0, failed: 0 } },
    ],
    ["rk9.queued > 0", { rk9: { queued: 5, inProgress: 0, failed: 0 } }],
    ["only recentImported > 0", { recentImported: 10 }],
    [
      "only totalFailed > 0",
      { limitless: { queued: 0, importing: 0, failed: 2 } },
    ],
  ] satisfies Array<[string, Partial<QueueStripProps>]>)(
    "renders the strip when %s",
    (_label, overrides) => {
      render(<QueueStrip {...makeProps(overrides)} />);
      expect(screen.getByText(/Process now/i)).toBeInTheDocument();
    }
  );
});

// =============================================================================
// Per-source count display
// =============================================================================

describe("QueueStrip per-source counts", () => {
  it("shows Limitless queued count", () => {
    render(
      <QueueStrip
        {...makeProps({ limitless: { queued: 7, importing: 0, failed: 0 } })}
      />
    );
    expect(screen.getByText(/Limitless/i)).toBeInTheDocument();
    expect(screen.getByText(/7 queued/i)).toBeInTheDocument();
  });

  it("shows Limitless importing count with 'importing' label", () => {
    render(
      <QueueStrip
        {...makeProps({ limitless: { queued: 0, importing: 3, failed: 0 } })}
      />
    );
    expect(screen.getByText(/importing/i)).toBeInTheDocument();
  });

  it("shows RK9 queued count", () => {
    render(
      <QueueStrip
        {...makeProps({ rk9: { queued: 4, inProgress: 0, failed: 0 } })}
      />
    );
    expect(screen.getByText(/RK9/i)).toBeInTheDocument();
    expect(screen.getByText(/4 queued/i)).toBeInTheDocument();
  });

  it("shows RK9 inProgress count with 'in progress' label", () => {
    render(
      <QueueStrip
        {...makeProps({ rk9: { queued: 0, inProgress: 2, failed: 0 } })}
      />
    );
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
  });

  it("shows recentImported count with 'imported' and time context", () => {
    render(<QueueStrip {...makeProps({ recentImported: 15 })} />);
    expect(screen.getByText(/15 imported/i)).toBeInTheDocument();
    expect(screen.getByText(/last 10 min/i)).toBeInTheDocument();
  });

  it("does not show Limitless section when both queued and importing are 0", () => {
    render(
      <QueueStrip
        {...makeProps({
          rk9: { queued: 1, inProgress: 0, failed: 0 },
          limitless: { queued: 0, importing: 0, failed: 0 },
        })}
      />
    );
    expect(screen.queryByText(/Limitless/i)).not.toBeInTheDocument();
  });

  it("does not show RK9 section when both queued and inProgress are 0", () => {
    render(
      <QueueStrip
        {...makeProps({
          limitless: { queued: 1, importing: 0, failed: 0 },
          rk9: { queued: 0, inProgress: 0, failed: 0 },
        })}
      />
    );
    expect(screen.queryByText(/^RK9$/i)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Action buttons
// =============================================================================

describe("QueueStrip action buttons", () => {
  it("calls onProcessNow when 'Process now' is clicked", async () => {
    const user = userEvent.setup();
    const onProcessNow = jest.fn();

    render(
      <QueueStrip
        {...makeProps({
          limitless: { queued: 1, importing: 0, failed: 0 },
          onProcessNow,
        })}
      />
    );

    await user.click(screen.getByRole("button", { name: /Process now/i }));
    expect(onProcessNow).toHaveBeenCalledTimes(1);
  });

  it("calls onResetStuck when reset stuck button is clicked", async () => {
    const user = userEvent.setup();
    const onResetStuck = jest.fn();

    render(
      <QueueStrip
        {...makeProps({
          rk9: { queued: 1, inProgress: 0, failed: 0 },
          onResetStuck,
        })}
      />
    );

    await user.click(screen.getByRole("button", { name: /Reset stuck/i }));
    expect(onResetStuck).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// "Process now" disabled state
// =============================================================================

describe("QueueStrip 'Process now' disabled state", () => {
  it("is disabled when processing=true (even with queued items)", () => {
    render(
      <QueueStrip
        {...makeProps({
          limitless: { queued: 5, importing: 0, failed: 0 },
          processing: true,
        })}
      />
    );
    const btn = screen.getByRole("button", { name: /Process now/i });
    expect(btn).toBeDisabled();
  });

  it("is disabled when totalQueued === 0 (only recentImported)", () => {
    render(<QueueStrip {...makeProps({ recentImported: 5 })} />);
    const btn = screen.getByRole("button", { name: /Process now/i });
    expect(btn).toBeDisabled();
  });

  it("is enabled when processing=false and totalQueued > 0", () => {
    render(
      <QueueStrip
        {...makeProps({
          limitless: { queued: 2, importing: 0, failed: 0 },
          processing: false,
        })}
      />
    );
    const btn = screen.getByRole("button", { name: /Process now/i });
    expect(btn).not.toBeDisabled();
  });
});

// =============================================================================
// Unqueue all confirmation dialog
// =============================================================================

describe("QueueStrip unqueue all confirmation dialog", () => {
  it("does not show 'Unqueue all' button when totalQueued === 0", () => {
    // Only recentImported > 0 — no queued items, so no unqueue trigger
    render(<QueueStrip {...makeProps({ recentImported: 3 })} />);
    expect(
      screen.queryByRole("button", { name: /Unqueue all/i })
    ).not.toBeInTheDocument();
  });

  it("shows 'Unqueue all' button when there are queued items", () => {
    render(
      <QueueStrip
        {...makeProps({ limitless: { queued: 2, importing: 0, failed: 0 } })}
      />
    );
    expect(
      screen.getByRole("button", { name: /Unqueue all/i })
    ).toBeInTheDocument();
  });

  it("calls onUnqueueAll when the confirmation 'Unqueue all' action is clicked", async () => {
    const user = userEvent.setup();
    const onUnqueueAll = jest.fn();

    render(
      <QueueStrip
        {...makeProps({
          limitless: { queued: 2, importing: 0, failed: 0 },
          onUnqueueAll,
        })}
      />
    );

    // Open the dialog via the trigger
    await user.click(screen.getByRole("button", { name: /Unqueue all/i }));

    // The alertdialog should now be open — click the confirm action inside it
    const dialog = screen.getByRole("alertdialog");
    const confirmButtons = dialog.querySelectorAll("button");
    // The "Unqueue all" confirm button is the last button in the footer
    const confirmBtn = Array.from(confirmButtons).find((b) =>
      b.textContent?.includes("Unqueue all")
    );
    expect(confirmBtn).toBeTruthy();
    await user.click(confirmBtn!);

    expect(onUnqueueAll).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Auto-import warnings
// =============================================================================

describe("QueueStrip auto-import warnings", () => {
  it("shows amber warning for Limitless when autoImportOn.limitless=false and queued > 0", () => {
    render(
      <QueueStrip
        {...makeProps({
          limitless: { queued: 3, importing: 0, failed: 0 },
          autoImportOn: { limitless: false, rk9: true },
        })}
      />
    );
    expect(
      screen.getByText(/Auto-import is off for Limitless/i)
    ).toBeInTheDocument();
  });

  it("shows amber warning for RK9 when autoImportOn.rk9=false and queued > 0", () => {
    render(
      <QueueStrip
        {...makeProps({
          rk9: { queued: 2, inProgress: 0, failed: 0 },
          autoImportOn: { limitless: true, rk9: false },
        })}
      />
    );
    expect(screen.getByText(/Auto-import is off for RK9/i)).toBeInTheDocument();
  });

  it("shows both warnings when both sources are off with queued items", () => {
    render(
      <QueueStrip
        {...makeProps({
          limitless: { queued: 1, importing: 0, failed: 0 },
          rk9: { queued: 1, inProgress: 0, failed: 0 },
          autoImportOn: { limitless: false, rk9: false },
        })}
      />
    );
    expect(
      screen.getByText(/Auto-import is off for Limitless/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Auto-import is off for RK9/i)).toBeInTheDocument();
  });

  it("does not show warning when autoImportOn.limitless=false but queued === 0", () => {
    // recentImported drives the strip rendering but no warning since queued=0
    render(
      <QueueStrip
        {...makeProps({
          recentImported: 5,
          autoImportOn: { limitless: false, rk9: false },
        })}
      />
    );
    expect(
      screen.queryByText(/Auto-import is off for Limitless/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Auto-import is off for RK9/i)
    ).not.toBeInTheDocument();
  });

  it("does not show Limitless warning when autoImportOn.limitless=true", () => {
    render(
      <QueueStrip
        {...makeProps({
          limitless: { queued: 3, importing: 0, failed: 0 },
          autoImportOn: { limitless: true, rk9: true },
        })}
      />
    );
    expect(
      screen.queryByText(/Auto-import is off for Limitless/i)
    ).not.toBeInTheDocument();
  });
});
