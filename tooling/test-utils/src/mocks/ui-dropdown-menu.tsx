/**
 * Shared @/components/ui/dropdown-menu mock for JSDOM tests.
 *
 * Base UI's Menu uses portals and floating-ui positioning that don't work
 * in JSDOM. This mock provides a minimal open/close toggle so tests can:
 *   - verify the menu content renders (via data-testid="dropdown-content")
 *   - click menu items and assert callbacks
 *
 * Design — open/close toggle variant:
 *   DropdownMenu maintains open state and passes `open` + `onToggle` down
 *   to its direct children via React.cloneElement. DropdownMenuTrigger
 *   exposes `onToggle` as its onClick. DropdownMenuContent renders only
 *   when `open` is true.
 *
 * Usage in a test file:
 *   jest.mock("@/components/ui/dropdown-menu", () =>
 *     require("@trainers/test-utils/mocks/ui-dropdown-menu")
 *   );
 */

import React from "react";

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div data-testid="dropdown-menu">
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<Record<string, unknown>>,
              {
                open,
                onToggle: () => setOpen((v) => !v),
              }
            )
          : child
      )}
    </div>
  );
}

function DropdownMenuTrigger({
  children,
  onToggle,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onToggle?: () => void;
  "aria-label"?: string;
  // Accept (and ignore) render prop so the real component prop passes through
  render?: unknown;
  className?: string;
  open?: boolean;
}) {
  return (
    <button onClick={onToggle} aria-label={ariaLabel ?? "Open menu"}>
      {children}
    </button>
  );
}

function DropdownMenuContent({
  children,
  open,
}: {
  children: React.ReactNode;
  open?: boolean;
  side?: string;
  align?: string;
  sideOffset?: number;
}) {
  if (!open) return null;
  return <div data-testid="dropdown-content">{children}</div>;
}

function DropdownMenuItem({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: string;
}) {
  return (
    <div
      role="menuitem"
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </div>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
};
