import { Factory } from "fishery";

// We can't import SpeciesSearchEntry from @trainers/pokemon here without
// adding a cross-package devDep. Instead, declare a structurally-compatible
// shape — Jest tests duck-type so identity isn't required.
export type SpeciesSearchEntryFactoryShape = {
  species: string;
  types: readonly string[];
  abilities: readonly string[];
  abilitySlot1: string | null;
  abilitySlot2: string | null;
  hiddenAbility: string | null;
  roles: readonly string[];
  baseStats: Readonly<{
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  }>;
  bst: number;
};

export const speciesSearchEntryFactory =
  Factory.define<SpeciesSearchEntryFactoryShape>(({ sequence }) => ({
    species: `Pokemon-${sequence}`,
    types: ["Normal"],
    abilities: ["Pressure"],
    abilitySlot1: "Pressure",
    abilitySlot2: null,
    hiddenAbility: null,
    roles: [],
    baseStats: {
      hp: 100,
      atk: 100,
      def: 100,
      spa: 100,
      spd: 100,
      spe: 100,
    },
    bst: 600,
  }));
