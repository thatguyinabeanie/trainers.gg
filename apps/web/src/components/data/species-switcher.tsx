"use client";

import { useRouter } from "next/navigation";

import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxCollection,
  ComboboxEmpty,
} from "@/components/ui/combobox";

// =============================================================================
// Types
// =============================================================================

interface SpeciesOption {
  slug: string;
  name: string;
}

interface SpeciesSwitcherProps {
  /** The currently viewed species slug. */
  currentSpecies: string;
  /** All species available in this format (slug + display name). */
  options: SpeciesOption[];
  /** Called with the new slug when the user selects a different species. */
  onSelect: (slug: string) => void;
}

// =============================================================================
// SpeciesSwitcher
// =============================================================================

/**
 * Searchable species switcher for the drill-down hero.
 *
 * Base UI Combobox type-ahead; options = the format's species list.
 * Selecting an option calls onSelect with the species slug — the parent
 * (SpeciesDrilldown) handles navigation via router.push so the current
 * filter query carries over.
 */
export function SpeciesSwitcher({
  currentSpecies,
  options,
  onSelect,
}: SpeciesSwitcherProps) {
  const router = useRouter();

  // Current option object drives the input display + selected highlight.
  const currentOption = options.find((o) => o.slug === currentSpecies) ?? null;

  function handleValueChange(option: SpeciesOption | null) {
    if (!option || option.slug === currentSpecies) return;
    onSelect(option.slug);
    router.prefetch(`/data/pokemon/${encodeURIComponent(option.slug)}`);
  }

  return (
    <Combobox
      items={options}
      value={currentOption}
      onValueChange={handleValueChange}
      // Type-ahead filters by display name; the input shows the species name.
      itemToStringLabel={(option) => option?.name ?? ""}
      itemToStringValue={(option) => option?.name ?? ""}
    >
      <ComboboxInput
        className="min-w-40 sm:min-w-52"
        placeholder="Switch Pokémon…"
        showClear={false}
        aria-label="Switch to a different Pokémon"
      />
      <ComboboxContent>
        <ComboboxList>
          <ComboboxEmpty>No Pokémon found</ComboboxEmpty>
          <ComboboxCollection>
            {(option: SpeciesOption) => (
              <ComboboxItem key={option.slug} value={option}>
                {option.name}
              </ComboboxItem>
            )}
          </ComboboxCollection>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
