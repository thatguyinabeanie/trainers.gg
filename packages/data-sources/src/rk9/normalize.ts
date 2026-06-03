import type { RK9Pokemon } from "./types";

/**
 * Normalize an RK9 species display name to a Showdown-compatible slug.
 *
 * RK9 uses display names like:
 *   "Ogerpon [Hearthflame Mask]" → "ogerpon-hearthflame"
 *   "Urshifu [Rapid Strike Style]" → "urshifu-rapid-strike"
 *   "Landorus [Incarnate Forme]" → "landorus"
 *   "Roaring Moon" → "roaringmoon"
 *   "Flutter Mane" → "fluttermane"
 *
 * This does a best-effort normalization. The species_map table provides
 * verified overrides for cases where heuristics fail.
 */
export function normalizeSpecies(raw: string): string {
  const open = raw.indexOf("[");
  const close = raw.lastIndexOf("]");
  let species: string;
  let form: string | null;
  if (open !== -1 && close > open) {
    species = raw.slice(0, open).trim();
    form = raw.slice(open + 1, close).trim();
  } else {
    species = raw.trim();
    form = null;
  }

  // Remove all non-alphanumeric except hyphens, lowercase
  species = species.toLowerCase().replace(/[^a-z0-9-]/g, "");

  // Handle form suffixes
  if (form) {
    const formLower = form.toLowerCase();

    // Skip "Incarnate Forme" / "Male" / standard forms (these are the default)
    const skipForms = new Set([
      "incarnate forme",
      "male",
      "standard",
      "normal",
      "aria forme",
      "shield forme",
      "average size",
      "50% forme",
      "land forme",
      "solo form",
    ]);
    if (skipForms.has(formLower)) {
      return species;
    }

    // Extract the key part of form names for slugs
    const formMap: Record<string, string> = {
      // Ogerpon masks
      "hearthflame mask": "hearthflame",
      "wellspring mask": "wellspring",
      "cornerstone mask": "cornerstone",
      "teal mask": "", // default form
      // Urshifu styles
      "rapid strike style": "rapid-strike",
      "single strike style": "", // default form
      // Therian/alternate formes
      "therian forme": "therian",
      "blade forme": "blade",
      "sky forme": "sky",
      "origin forme": "origin",
      "altered forme": "", // default
      "heat rotom": "heat",
      "wash rotom": "wash",
      "frost rotom": "frost",
      "fan rotom": "fan",
      "mow rotom": "mow",
      // Terapagos
      "terastal form": "terastal",
      "stellar form": "stellar",
      // Other
      "alolan form": "alola",
      "galarian form": "galar",
      "hisuian form": "hisui",
      "paldean form": "paldea",
      bloodmoon: "bloodmoon",
      female: "f",
    };

    const formSuffix = formMap[formLower];
    if (formSuffix !== undefined) {
      return formSuffix ? `${species}-${formSuffix}` : species;
    }

    // Fallback: slugify the form and append
    const sluggedForm = formLower
      .replace(/(forme?|style|mask|form)/gi, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (sluggedForm) {
      return `${species}-${sluggedForm}`;
    }
  }

  return species;
}

/**
 * Collect all unique species_raw values from a teams record.
 * Useful for seeding the species_map table.
 */
export function collectUniqueSpecies(
  teams: Record<string, RK9Pokemon[]>
): Map<string, string> {
  const unique = new Map<string, string>();

  for (const pokemon of Object.values(teams).flat()) {
    if (!unique.has(pokemon.speciesRaw)) {
      unique.set(pokemon.speciesRaw, normalizeSpecies(pokemon.speciesRaw));
    }
  }

  return unique;
}
