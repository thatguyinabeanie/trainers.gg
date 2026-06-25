/**
 * Shared @/components/ui/select mock for JSDOM tests.
 *
 * The Base UI Select component uses floating-ui + portals which are not
 * available in JSDOM. This mock replaces the whole compound component with
 * simple HTML elements so tests can drive value changes via a native <select>.
 *
 * The mock renders:
 *   <div data-testid="select-root" data-value={value}>
 *     <select aria-label={...} value={value} onChange={...}>
 *       {options built from SelectItem children}
 *     </select>
 *   </div>
 *
 * SelectContent / SelectItem cooperate to build the <option> list.
 * SelectTrigger / SelectValue are rendered as transparent pass-throughs.
 *
 * Usage in a test file:
 *   jest.mock("@/components/ui/select", () =>
 *     require("@trainers/test-utils/mocks/ui-select")
 *   );
 */

import React from "react";

// Context to pass value, onValueChange, and aria-label from the compound
// components down to SelectContent where the real <select> lives.
interface SelectCtx {
  value?: string;
  onValueChange?: (v: string) => void;
  ariaLabel?: string;
}

const SelectContext = React.createContext<SelectCtx>({});

// Separate context so SelectTrigger can push its aria-label up.
const SelectLabelContext = React.createContext<
  ((label: string | undefined) => void) | undefined
>(undefined);

function Select({
  children,
  value,
  onValueChange,
}: {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (v: string) => void;
}) {
  // We use state so that SelectTrigger can register its aria-label
  // before SelectContent renders via context mutation during render.
  const [ariaLabel, setAriaLabel] = React.useState<string | undefined>(
    undefined
  );
  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange,
        ariaLabel: ariaLabel as string | undefined,
      }}
    >
      {/* Pass a setter so SelectTrigger can register its aria-label */}
      <SelectLabelContext.Provider value={setAriaLabel}>
        <div data-testid="select-root" data-value={value}>
          {children}
        </div>
      </SelectLabelContext.Provider>
    </SelectContext.Provider>
  );
}

// Trigger reads aria-label from props and registers it so SelectContent
// can attach it to the real <select> element.
function SelectTrigger({
  children,
  className,
  "aria-label": ariaLabel,
}: {
  children?: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const setLabel = React.useContext(SelectLabelContext);
  // Register on mount / when label changes
  React.useLayoutEffect(() => {
    setLabel?.(ariaLabel);
  }, [ariaLabel, setLabel]);
  return <span className={className}>{children}</span>;
}

// Value just renders its placeholder — value display is handled by the
// native <select> in SelectContent.
function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span>{placeholder}</span>;
}

// Content renders a real <select> driven by context.
function SelectContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(SelectContext);

  // Collect items by walking children to build <option> elements.
  function buildOptions(nodes: React.ReactNode): React.ReactNode[] {
    return (
      React.Children.map(nodes, (child) => {
        if (!React.isValidElement(child)) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const props = child.props as any;
        if (typeof props.value === "string") {
          // It is a SelectItem — convert to <option>
          return (
            <option key={props.value} value={props.value}>
              {props.children}
            </option>
          );
        }
        // Otherwise it might be a group; recurse into its children
        if (props.children) {
          return buildOptions(props.children);
        }
        return null;
      }) ?? []
    );
  }

  return (
    <select
      aria-label={ctx.ariaLabel}
      value={ctx.value ?? ""}
      onChange={(e) => ctx.onValueChange?.(e.target.value)}
    >
      {buildOptions(children)}
    </select>
  );
}

// Item — consumed by SelectContent above; also renderable as a stub.
function SelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <option value={value}>{children}</option>;
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
