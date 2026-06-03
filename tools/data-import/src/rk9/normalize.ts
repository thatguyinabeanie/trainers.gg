import * as cheerio from "cheerio";
import {
  getSvFormatForDate,
  getChampionsFormatForDate,
} from "@trainers/pokemon";

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
