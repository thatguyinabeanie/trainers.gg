# Calc Move Tile Redesign

**Date:** 2026-05-01
**Status:** Approved for implementation
**File in scope:** `apps/web/src/components/team-builder/v2/calc/calc-defender-moves.tsx`

---

## Overview

Redesign `DefenderMoveTile` from a 3-row stack to a 2-row layout that foregrounds the damage percentage — the most actionable number — while keeping KO tier, raw HP range, and contextual notes readable on a single line below.

---

## Current layout (3 rows)

```
[type icon] [move name]                    [▾]
[3HKO pill: 34.0–40.2%]
[66–78 / 194 HP · 100% acc · pivots out]
```

The KO pill sits on its own row with wasted space to the right. The % is inside the pill, de-emphasised. The detail line is too small and cluttered.

---

## New layout (2 rows)

```
[type badge] [move name]                   [▾]
[34.0–40.2%]  |  [3HKO]  |  [66–78 / 194 HP]  [· 70% acc]  [· pivots out]
```

### Row 1 — move identity

`flex items-center gap-1.5`:

| Element | Style | Notes |
|---|---|---|
| Type badge | text badge, same as current | |
| Move name | 11.5px medium, `flex-1` | |
| BP | 9px mono muted | `BP {basePower}` — omit when basePower is 0 (status moves) |
| Accuracy | 9px mono muted, only if < 100% | `· {accuracy}% acc` |
| `▾` | 9px muted chevron | picker trigger |

### Row 2 — calc output

`flex items-center gap-2` — only rendered when there is a calc output:

| Element | Style | Notes |
|---|---|---|
| **Damage %** | 12px mono bold, KO-tier color | `minPercent.toFixed(1)–maxPercent.toFixed(1)%` |
| Thin divider | 1px `border-border` vertical rule, 10px tall | |
| KO tier label | 9px mono muted | "OHKO" / "2HKO" / "3HKO" / "4HKO+" |
| Thin divider | same | |
| HP range | 9px mono muted | `dmgMin–dmgMax / attackerHP HP` |
| Extra note | 9px mono teal | `· pivots out` / `· −2 SpA after` / `· −1 Def/SpD after` |

### Damage % color by KO tier

| Tier | Color |
|---|---|
| OHKO | `text-destructive` (red) |
| 2HKO | `text-yellow-400 dark:text-yellow-300` (amber) |
| 3HKO | `text-orange-400` |
| 4HKO+ | `text-muted-foreground` (gray) |
| No calc | — (row 2 not rendered) |

### Tile border on OHKO
Keep the existing `dmv-tile--ohko` border treatment for OHKO tiles.

---

## What doesn't change

- `CalcDefenderMoves` component and its props — unchanged
- Move picker popover — unchanged
- Empty slot placeholder — unchanged
- `getVerdict`, `resolveKoTierLabel`, side-effect notes — logic unchanged
- Header text "THEIR MOVES → YOUR ATK" — unchanged

---

## Data sources

Both fields come from `getMoveData(moveName)` which is already called in `DefenderMoveTile`:

- **BP**: `moveData?.basePower ?? 0` — omit when 0 (status moves like Protect, Fake Out has BP 40 so it shows)
- **Accuracy**: `moveData?.accuracy` — the field is `true` for never-miss moves; treat `true` and `100` as "don't show"

The existing `accuracy` variable in the component already handles this correctly:
```ts
const accuracy = moveData?.accuracy === true || !moveData?.accuracy
  ? null
  : (moveData.accuracy as number);
```
BP just needs a similar derivation: `const basePower = moveData?.basePower ?? 0`.
