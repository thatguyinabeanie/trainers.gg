/**
 * Shared lucide-react mock for JSDOM tests.
 *
 * Replaces every icon exported from lucide-react with a lightweight
 * <svg data-testid="icon-{Name}" /> stub so tests can:
 *   - render without SVG/DOM warnings
 *   - query icons by data-testid (e.g. screen.getByTestId("icon-Plus"))
 *
 * Usage in a test file:
 *   jest.mock("lucide-react", () =>
 *     require("@trainers/test-utils/mocks/lucide-react").default
 *   );
 *
 * The Proxy catches any named export (Plus, Trash2, ChevronDown, …) and returns
 * a React component stub — no need to enumerate icon names in advance.
 */

import React from "react";

function makeLucideStub(name: string) {
  function Icon(props: Record<string, unknown>) {
    return React.createElement("svg", {
      "data-testid": `icon-${name}`,
      ...props,
    });
  }
  Icon.displayName = name;
  return Icon;
}

/**
 * A Proxy that returns a stub SVG component for any icon name accessed on it.
 * This is the value that should be returned from the jest.mock factory.
 */
const lucideReactMock = new Proxy(
  {},
  { get: (_target, prop: string) => makeLucideStub(prop) }
);

export default lucideReactMock;
