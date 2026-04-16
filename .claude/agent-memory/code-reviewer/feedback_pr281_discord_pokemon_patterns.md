---
name: PR #281 Discord + Pokemon patterns
description: Patterns seen in Discord integration actions, format-legality caching, team validator duplication, and test isolation issues
type: feedback
---

`computeLegalAbilitiesForChampions` in `format-legality.ts` allocates a new Set on every call with no module-scope cache, unlike all sibling compute functions. Check Champions ability path for this every time format-legality is touched.

`SUPPORTED_FORMATS` in `team-validator.ts` and `SIM_FORMAT_NAME_BY_ID` in `format-legality.ts` are parallel copies of the same Showdown format name map (both call `buildVgcShowdownNameMap()` + append the same Smogon singles entries). This is a recurring duplication issue — the fix is a single exported constant in `formats.ts`.

`getLearnableMoves` in `validation.ts` promises species-specific moves but returns all gen-9 moves unfiltered (learnset path is commented out as TODO). Any future caller that uses this for a UI dropdown will display ~900 entries. The correct path is `getLegalMoves` in `format-legality.ts`.

`mockSupabase.from` in test files is a shared mutable jest.fn(). Tests that call `.mockReturnValue(chain)` without `mockReset()` in beforeEach can bleed mock implementations across tests. Use `.mockReturnValueOnce` or `mockReset` explicitly.

Dashboard layout active-tournaments query (`status = 'active'`) is unbounded — returns one row per tournament rather than per community. Needs a LIMIT or distinct community_id projection.

**Why:** Observed in Discord bot integration PR (eb69bee7 / #281).
**How to apply:** When reviewing format-legality changes, check Champions ability caching. When reviewing test suites, check beforeEach strategy for shared mock objects.
