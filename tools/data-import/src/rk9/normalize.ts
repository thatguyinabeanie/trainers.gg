import * as cheerio from "cheerio";
import {
  getSvFormatForDate,
  getChampionsFormatForDate,
} from "../shared/format.js";

// =============================================================================
// Species normalization
// =============================================================================

export function normalizeSpeciesInline(raw: string): string {
  const bracketMatch = raw.match(/^(.+?)\s*\[(.+?)\]$/);
  let species = bracketMatch ? bracketMatch[1]!.trim() : raw.trim();
  const form = bracketMatch ? bracketMatch[2]!.trim() : null;

  species = species.toLowerCase().replace(/[^a-z0-9-]/g, "");

  if (form) {
    const formLower = form.toLowerCase();
    const skipForms = [
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
    ];
    if (skipForms.some((s) => formLower.includes(s))) return species;

    const formMap: Record<string, string> = {
      "hearthflame mask": "hearthflame",
      "wellspring mask": "wellspring",
      "cornerstone mask": "cornerstone",
      "teal mask": "",
      "rapid strike style": "rapid-strike",
      "single strike style": "",
      "therian forme": "therian",
      "blade forme": "blade",
      "sky forme": "sky",
      "origin forme": "origin",
      "altered forme": "",
      "heat rotom": "heat",
      "wash rotom": "wash",
      "frost rotom": "frost",
      "fan rotom": "fan",
      "mow rotom": "mow",
      "terastal form": "terastal",
      "stellar form": "stellar",
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

    const sluggedForm = formLower
      .replace(/\s*(forme?|style|mask|form)\s*/gi, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (sluggedForm) return `${species}-${sluggedForm}`;
  }

  return species;
}

// =============================================================================
// Format detection
// =============================================================================

export function formatDetectionNeedsHtml(dateStart: string): boolean {
  return dateStart >= "2026-05-01";
}

export function detectEventFormat(
  html: string,
  dateStart: string
): string | null {
  if (!dateStart) return null;

  const isChampionsEra = dateStart >= "2026-05-01";
  if (isChampionsEra && html) {
    const $ = cheerio.load(html);
    const isChampions = $('img[src*="pokemon-vg-champions"]').length > 0;
    if (isChampions) {
      return getChampionsFormatForDate(dateStart);
    }
  }

  return getSvFormatForDate(dateStart);
}
