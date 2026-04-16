---
name: PR #278 format-legality patterns
description: Patterns seen in PR #278 format-legality work — module-scope Map unbounded growth, getLegalTeraTypes allocates new Set on every call, error message prefix inconsistency between client and server paths, duplicate paste-guard logic across submitNewTeam and ImportDialog
type: feedback
---

getLegalTeraTypes allocates `new Set()` on every call for Champions and Terastal Clause formats — should use module-scope frozen constants to avoid GC churn per render.

The 5 module-scope Maps (simSetCache, simItemCache, simMoveCache/championsMoveCache, simAbilityCache) are unbounded in worker/serverless environments. Comment explains they are per-process, but in long-running workers serving many formats and species this is a real memory concern worth noting in review.

Paste-guard logic is duplicated between `new-team-submit.ts` and `import-dialog.tsx checkLegality()` — both implement the same 5-check sequence (species, items, moves, tera, abilities) with slightly different error message prefixes ("Cannot import. " prefix in new-team-submit, absent in import-dialog).

**Why:** These were the main review findings for the format-legality feature on the team builder.
**How to apply:** When reviewing future legality work, check for allocation inside hot paths and message consistency between server/client error surfaces.
