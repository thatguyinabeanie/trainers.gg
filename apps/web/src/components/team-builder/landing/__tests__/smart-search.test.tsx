import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

// Mock Input to a native input (Base UI Input wraps @base-ui/react/input which
// is not available in JSDOM). We need the real behavour (focus, value, events).
jest.mock("@/components/ui/input", () => ({
  Input: React.forwardRef<
    HTMLInputElement,
    React.ComponentProps<"input">
  >(function Input({ className, ...props }, ref) {
    return <input ref={ref} className={className} {...props} />;
  }),
}));

// Lucide icons
jest.mock("lucide-react", () => {
  const mock = (name: string) => {
    const Icon = (props: Record<string, unknown>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy({}, { get: (_target, prop: string) => mock(prop) });
});

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { SmartSearch } from "../smart-search";
import { type SearchSuggestion } from "../search-types";

// =============================================================================
// Fixtures
// =============================================================================

function makeSuggestion(
  group: string,
  label: string,
  insert: string
): SearchSuggestion {
  return { group, label, insert };
}

const FIELD_SUGGESTIONS: SearchSuggestion[] = [
  makeSuggestion("Fields", "species:", "species:"),
  makeSuggestion("Fields", "name:", "name:"),
];

const FLAG_SUGGESTIONS: SearchSuggestion[] = [
  makeSuggestion("Flags", "is:complete", "is:complete"),
  makeSuggestion("Flags", "is:incomplete", "is:incomplete"),
];

const ALL_SUGGESTIONS: SearchSuggestion[] = [
  ...FIELD_SUGGESTIONS,
  ...FLAG_SUGGESTIONS,
];

// =============================================================================
// Test suite
// =============================================================================

describe("SmartSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Basic rendering
  // ---------------------------------------------------------------------------

  describe("rendering", () => {
    it("renders the search input", () => {
      render(
        <SmartSearch value="" onValueChange={jest.fn()} suggestions={[]} />
      );
      const input = screen.getByRole("combobox");
      expect(input).toBeInTheDocument();
    });

    it("does not show the clear button when value is empty", () => {
      render(
        <SmartSearch value="" onValueChange={jest.fn()} suggestions={[]} />
      );
      expect(
        screen.queryByRole("button", { name: /clear search/i })
      ).not.toBeInTheDocument();
    });

    it("shows the clear button when value is non-empty", () => {
      render(
        <SmartSearch
          value="species:miraidon"
          onValueChange={jest.fn()}
          suggestions={[]}
        />
      );
      expect(
        screen.getByRole("button", { name: /clear search/i })
      ).toBeInTheDocument();
    });

    it("does not show the suggestion dropdown when there are no suggestions", async () => {
      const user = userEvent.setup();
      render(
        <SmartSearch value="zzz" onValueChange={jest.fn()} suggestions={[]} />
      );
      await user.click(screen.getByRole("combobox"));
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Suggestions dropdown
  // ---------------------------------------------------------------------------

  describe("suggestions dropdown", () => {
    it("shows the suggestions dropdown when focused and suggestions are present", async () => {
      const user = userEvent.setup();
      render(
        <SmartSearch
          value=""
          onValueChange={jest.fn()}
          suggestions={ALL_SUGGESTIONS}
        />
      );
      await user.click(screen.getByRole("combobox"));
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("renders each suggestion label", async () => {
      const user = userEvent.setup();
      render(
        <SmartSearch
          value=""
          onValueChange={jest.fn()}
          suggestions={FIELD_SUGGESTIONS}
        />
      );
      await user.click(screen.getByRole("combobox"));
      expect(screen.getByText("species:")).toBeInTheDocument();
      expect(screen.getByText("name:")).toBeInTheDocument();
    });

    it("renders group headings", async () => {
      const user = userEvent.setup();
      render(
        <SmartSearch
          value=""
          onValueChange={jest.fn()}
          suggestions={ALL_SUGGESTIONS}
        />
      );
      await user.click(screen.getByRole("combobox"));
      expect(screen.getByText("Fields")).toBeInTheDocument();
      expect(screen.getByText("Flags")).toBeInTheDocument();
    });

    it("each suggestion has role=option", async () => {
      const user = userEvent.setup();
      render(
        <SmartSearch
          value=""
          onValueChange={jest.fn()}
          suggestions={FIELD_SUGGESTIONS}
        />
      );
      await user.click(screen.getByRole("combobox"));
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Selecting a suggestion replaces the last token
  // ---------------------------------------------------------------------------

  describe("selecting a suggestion", () => {
    it("replaces an empty value with the suggestion insert + space", async () => {
      const onValueChange = jest.fn();
      const user = userEvent.setup();
      render(
        <SmartSearch
          value=""
          onValueChange={onValueChange}
          suggestions={FIELD_SUGGESTIONS}
        />
      );
      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByText("species:"));
      expect(onValueChange).toHaveBeenCalledWith("species: ");
    });

    it("replaces the last partial token when there is already text", async () => {
      const onValueChange = jest.fn();
      const user = userEvent.setup();
      // value has "name:sun " then "spe" as the in-progress last token
      render(
        <SmartSearch
          value="name:sun spe"
          onValueChange={onValueChange}
          suggestions={[makeSuggestion("Fields", "species:", "species:")]}
        />
      );
      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByText("species:"));
      expect(onValueChange).toHaveBeenCalledWith("name:sun species: ");
    });

    it("appends when value ends with a space", async () => {
      const onValueChange = jest.fn();
      const user = userEvent.setup();
      render(
        <SmartSearch
          value="species:miraidon "
          onValueChange={onValueChange}
          suggestions={[makeSuggestion("Flags", "is:complete", "is:complete")]}
        />
      );
      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByText("is:complete"));
      expect(onValueChange).toHaveBeenCalledWith("species:miraidon is:complete ");
    });

    it("closes the dropdown after selection", async () => {
      const user = userEvent.setup();
      const onValueChange = jest.fn();
      render(
        <SmartSearch
          value=""
          onValueChange={onValueChange}
          suggestions={FIELD_SUGGESTIONS}
        />
      );
      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByText("name:"));
      // Dropdown should close
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Clear button empties the value
  // ---------------------------------------------------------------------------

  describe("clear button", () => {
    it("calls onValueChange with empty string when clicked", async () => {
      const onValueChange = jest.fn();
      const user = userEvent.setup();
      render(
        <SmartSearch
          value="some query"
          onValueChange={onValueChange}
          suggestions={[]}
        />
      );
      await user.click(screen.getByRole("button", { name: /clear search/i }));
      expect(onValueChange).toHaveBeenCalledWith("");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. ⌘K / Ctrl+K global shortcut focuses the input
  // ---------------------------------------------------------------------------

  describe("global shortcut", () => {
    it("focuses the input on ⌘K", async () => {
      render(
        <SmartSearch value="" onValueChange={jest.fn()} suggestions={[]} />
      );
      const input = screen.getByRole("combobox");
      // Ensure it's not focused initially
      expect(document.activeElement).not.toBe(input);

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
        );
      });
      // Focus is now on the input
      expect(document.activeElement).toBe(input);
    });

    it("focuses the input on Ctrl+K", async () => {
      render(
        <SmartSearch value="" onValueChange={jest.fn()} suggestions={[]} />
      );
      const input = screen.getByRole("combobox");
      expect(document.activeElement).not.toBe(input);

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
        );
      });
      expect(document.activeElement).toBe(input);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Keyboard navigation
  // ---------------------------------------------------------------------------

  describe("keyboard navigation", () => {
    it("navigates down through options with ArrowDown", async () => {
      const user = userEvent.setup();
      render(
        <SmartSearch
          value=""
          onValueChange={jest.fn()}
          suggestions={FIELD_SUGGESTIONS}
        />
      );
      const input = screen.getByRole("combobox");
      await user.click(input);
      await user.keyboard("{ArrowDown}");

      // First option should now be active (aria-selected=true)
      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
    });

    it("selects the focused option on Enter", async () => {
      const onValueChange = jest.fn();
      const user = userEvent.setup();
      render(
        <SmartSearch
          value=""
          onValueChange={onValueChange}
          suggestions={[makeSuggestion("Fields", "species:", "species:")]}
        />
      );
      const input = screen.getByRole("combobox");
      await user.click(input);
      await user.keyboard("{ArrowDown}{Enter}");

      expect(onValueChange).toHaveBeenCalledWith("species: ");
    });

    it("closes the dropdown and blurs on Escape", async () => {
      const user = userEvent.setup();
      render(
        <SmartSearch
          value=""
          onValueChange={jest.fn()}
          suggestions={ALL_SUGGESTIONS}
        />
      );
      const input = screen.getByRole("combobox");
      await user.click(input);
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });
});
