/**
 * calc-verdict.ts — engine-free KO-verdict helper.
 *
 * Lives apart from `use-calc-state.ts` (which imports the heavy `@smogon/calc`
 * runtime) so that always-on consumers — the dockbar and the moves-lane display
 * helpers — can map a damage range to a KO verdict WITHOUT dragging the calc
 * engine into the editor's initial bundle. Pure: depends only on numbers.
 */

/** Verdict label for a calc result. */
export type Verdict = "OHKO" | "2HKO" | "3HKO" | null;

/** Map a min/max damage percentage to a KO verdict. */
export function getVerdict(minPercent: number, maxPercent: number): Verdict {
  if (minPercent >= 100) return "OHKO";
  if (maxPercent >= 100) return "OHKO";
  if (maxPercent >= 50) return "2HKO";
  if (maxPercent >= 34) return "3HKO";
  return null;
}
