"use client";

/**
 * smart-search.tsx
 *
 * Controlled search input for the team-builder landing. Features:
 * - A plain input with a search icon and a clear button.
 * - Global ⌘K / Ctrl+K shortcut that focuses the input.
 * - A grouped suggestion dropdown shown when focused and suggestions exist.
 * - Selecting a suggestion replaces only the **last whitespace token** of the
 *   current value with `suggestion.insert` + a trailing space.
 * - Keyboard navigation: ↑/↓ through suggestions, Enter selects, Escape closes.
 * - Accessible listbox with role/aria attributes.
 */

import { useRef, useState, useEffect, useId } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import { type SearchSuggestion } from "./search-types";

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Replace the last whitespace token in `current` with `insert` + a trailing
 * space, so the user can keep typing additional predicates.
 *
 * Examples:
 *   replaceLastToken("spec", "species:")       → "species: "
 *   replaceLastToken("name:sun spe", "species:") → "name:sun species: "
 *   replaceLastToken("",    "is:complete")     → "is:complete "
 *   replaceLastToken("name:sun ", "is:")       → "name:sun is: "
 */
function replaceLastToken(current: string, insert: string): string {
  // If input ends with a space, the "last token" is empty — just append.
  if (current.endsWith(" ") || current.trim().length === 0) {
    return current + insert + " ";
  }
  const parts = current.split(/\s+/);
  parts[parts.length - 1] = insert;
  return parts.join(" ") + " ";
}

// =============================================================================
// SmartSearch
// =============================================================================

export interface SmartSearchProps {
  value: string;
  onValueChange: (v: string) => void;
  suggestions: SearchSuggestion[];
}

/**
 * Controlled search input with:
 * - Search / Clear icon
 * - ⌘K / Ctrl+K global focus shortcut
 * - Grouped suggestions dropdown (keyboard-navigable listbox)
 */
export function SmartSearch({
  value,
  onValueChange,
  suggestions,
}: SmartSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Index of the keyboard-highlighted suggestion (-1 = none)
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  // Open when focused AND there are suggestions
  const shouldShowDropdown = isOpen && suggestions.length > 0;

  // ⌘K / Ctrl+K global shortcut — focuses the input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset active index when suggestions change (e.g. user types)
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  function handleFocus() {
    setIsOpen(true);
  }

  function handleBlur() {
    // Delay so click on a suggestion item fires before the blur closes the list
    setTimeout(() => setIsOpen(false), 150);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onValueChange(e.target.value);
    setIsOpen(true);
  }

  function handleClear() {
    onValueChange("");
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function selectSuggestion(suggestion: SearchSuggestion) {
    const next = replaceLastToken(value, suggestion.insert);
    onValueChange(next);
    setActiveIndex(-1);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!shouldShowDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const s = suggestions[activeIndex];
      if (s) selectSuggestion(s);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  }

  // Group the suggestions for display
  const groups = suggestions.reduce<Record<string, SearchSuggestion[]>>(
    (acc, s) => {
      if (!acc[s.group]) acc[s.group] = [];
      acc[s.group]!.push(s);
      return acc;
    },
    {}
  );
  // Preserve group insertion order deterministically
  const groupOrder = Array.from(new Set(suggestions.map((s) => s.group)));

  const activeId =
    activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  return (
    <div className="relative w-full">
      {/* Input wrapper */}
      <div className="relative flex items-center">
        {/* Search icon */}
        <Search
          className="text-muted-foreground pointer-events-none absolute left-2.5 size-4 shrink-0"
          aria-hidden
        />

        <Input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={shouldShowDropdown}
          aria-controls={shouldShowDropdown ? listboxId : undefined}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          placeholder="Search teams… (⌘K)"
          className={cn(
            "h-9 pr-8 pl-9 text-sm",
            // Remove the browser-native clear button on search inputs
            "[&::-webkit-search-cancel-button]:hidden"
          )}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />

        {/* Clear button — shown only when non-empty */}
        {value.length > 0 && (
          <button
            type="button"
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground absolute right-2 flex size-5 items-center justify-center rounded transition-colors"
            tabIndex={-1}
            onMouseDown={(e) => {
              // Prevent blur from firing before our click handler
              e.preventDefault();
            }}
            onClick={handleClear}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {shouldShowDropdown && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="bg-popover text-popover-foreground ring-foreground/10 absolute z-50 mt-1 w-full rounded-lg py-1 text-sm shadow-md ring-1"
        >
          {groupOrder.map((groupName) => (
            <div key={groupName} role="group" aria-labelledby={`${listboxId}-g-${groupName}`}>
              {/* Group label */}
              <div
                id={`${listboxId}-g-${groupName}`}
                className="text-muted-foreground px-3 py-1 text-xs font-medium uppercase tracking-wide"
              >
                {groupName}
              </div>
              {/* Group items */}
              {groups[groupName]!.map((suggestion) => {
                const idx = suggestions.indexOf(suggestion);
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={suggestion.insert}
                    id={`${listboxId}-opt-${idx}`}
                    role="option"
                    aria-selected={isActive}
                    className={cn(
                      "cursor-pointer px-3 py-1.5 transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                    onMouseDown={(e) => {
                      // Prevent blur firing before click
                      e.preventDefault();
                    }}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    {suggestion.label}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
