# Session 4: Validation + Import/Export Polish

> **Rename session to:** `the-builder-s4-validation`
> **Branch:** `the-builder` (continue from Session 3's commits)
> **Model:** Sonnet 1M (implementation-heavy, clear specs)
> **Estimated scope:** Three-layer validation system, import/export polish, Pokepaste integration
> **Parallelism:** 2 subagent tracks (Track E: validation system, Track F: import/export refinement)

## How To Start This Session

1. Open a new Claude Code conversation
2. Rename it to `the-builder-s4-validation`
3. Verify Sessions 1-3 are complete: `pnpm lint && pnpm typecheck && pnpm test`
4. Send this as your first message:

```
Read docs/the-builder/session-4-validation.md and docs/the-builder/context.md.
Execute using subagent-driven development with parallel subagents for Track E and Track F.
Branch: the-builder. Do not push. Commit frequently with descriptive messages.
```

## Prerequisites

- Sessions 1-3 are complete
- The full workspace is functional: teams list, editor with all fields, species picker, context tabs (Types, Speed, Calc)
- Read `docs/the-builder/context.md` sections 13 (Validation) and 14 (Import & Export)

## Parallel Track Assignments

### Track E: Validation System

**Subagent instructions:** You are building the three-layer validation system. Do NOT modify import/export functionality — Track F handles that.

**Files to create:**

```
apps/web/src/components/team-builder/
  validation-panel.tsx        — Validation summary panel (triggered by Validate button)
  validation-hooks.ts         — Shared validation logic + state
```

**Files to modify:**

```
apps/web/src/components/team-builder/
  team-strip.tsx              — Add red dot badge on chips with issues
  pokemon-editor.tsx          — Add inline error highlighting on invalid fields
  (workspace page)            — Wire up Validate button to open summary panel
```

**Three validation layers:**

**Layer 1: Strip badges (`team-strip.tsx` modification)**

- Each Pokemon chip receives a `hasErrors: boolean` prop
- When true: show a small red dot (absolute positioned, top-right of the chip)
- The parent component runs validation on each Pokemon and passes the flag
- Subtle — just a dot indicator, no text

**Layer 2: Inline field errors (`pokemon-editor.tsx` modification)**

- Each editable field (ability, item, nature, moves, EVs) can show an error state
- Error state: red border on the field + error message text below the field in red
- Error messages come from validation hooks
- Examples:
  - Item field: "Duplicate item — also held by Urshifu" (red text)
  - Move slot: "Illegal move for this format" (red text)
  - EV total: counter turns red when > 510
  - Move slot: "Duplicate move" if same move in two slots

**Layer 3: Validation summary panel (`validation-panel.tsx`)**

- Triggered by clicking "Validate" button in the workspace header
- Opens as a collapsible panel (could be a sheet from the bottom, or a panel below the header)
- Lists ALL validation issues across the entire team
- Each issue row shows: Pokemon name + sprite, field name, error message
- Click an issue → selects that Pokemon in the strip + scrolls to the invalid field
- Shows "No issues found ✓" in green if team is fully valid
- Closes with an X button or clicking Validate again

**Validation hooks (`validation-hooks.ts`):**

```typescript
interface ValidationError {
  pokemonId: number;
  pokemonName: string;
  field: string; // 'ability' | 'item' | 'move1' | 'evTotal' | 'species' | etc.
  message: string;
  severity: "error" | "warning";
}

/**
 * Runs full validation on a team. Returns all errors/warnings.
 * Uses existing validation functions from @trainers/pokemon and @trainers/validators.
 */
export function useTeamValidation(
  team: PokemonWithMeta[],
  format: GameFormat
): {
  errors: ValidationError[];
  pokemonErrors: Map<number, ValidationError[]>; // grouped by pokemonId
  isValid: boolean;
  validate: () => void; // trigger manual re-validation
};
```

**What to validate:**

- Species exists and is format-legal (`isValidSpecies()`)
- Ability is valid for the species (`getValidAbilities()`)
- All moves are learnable (`getLearnableMoves()`, `isValidMove()`)
- No duplicate moves on same Pokemon
- Held item exists (if set)
- No duplicate items across team (VGC item clause — check format rules)
- EV total ≤ 510, each stat 0-252
- IV range 0-31 (for formats with IVs)
- Gender matches species ratio
- Nickname profanity check (use existing profanity filter from `@trainers/validators`)
- Format-specific legality: use `AdvancedTeamValidator.validateTeam()` for comprehensive format rules
- Team size: warn if < 6 Pokemon (valid but incomplete)

**Validation timing:**

- Run validation reactively — whenever team data changes (debounced, same as auto-save)
- Strip badges and inline errors update in real-time
- Summary panel shows results at time of click (re-runs validation on open)

---

### Track F: Import/Export Polish

**Subagent instructions:** You are polishing the import/export functionality. Do NOT create or modify validation files. Track E handles those.

**Files to create/modify:**

```
apps/web/src/components/team-builder/
  import-dialog.tsx           — Import dialog/sheet (if not already created in Session 2)
  export-menu.tsx             — Export dropdown menu with multiple options
  pokemon-import-export.tsx   — Per-Pokemon import/export controls
```

**Import refinements:**

_Full team import (from Session 2 — polish):_

- Dialog with two tabs: "Paste Text" and "Pokepaste URL"
- Paste Text tab: textarea for Showdown paste format
- Pokepaste URL tab: URL input, fetch + parse (use `parsePokepaseUrl()` to detect, fetch raw text, then `parseShowdownText()`)
- After parsing: show a preview of parsed Pokemon (species + item + ability) before confirming
- Validation runs on parsed team — show any issues before importing
- "Import" button: creates Pokemon records, adds to team, closes dialog
- "Replace current team" warning if team already has Pokemon
- Error handling: show parse errors clearly ("Failed to parse Pokemon at line X")

_Per-Pokemon import:_

- Accessible from the editor (exact placement TBD — a small "Paste set" button near the species name, or in a dropdown menu)
- Opens a small dialog/popover with a textarea
- Paste a single Showdown set block → parses → replaces the selected Pokemon's data
- Preserves the Pokemon's position in the team

**Export refinements:**

_Full team export:_

- Export button in header → dropdown menu:
  1. "Copy as Showdown text" → uses `exportTeamToShowdown()`, copies to clipboard, shows toast "Copied to clipboard"
  2. "Open in Pokepaste" → uploads to pokepast.es (research their API — likely a POST to pokepast.es with the paste body, or a form submission). If API unavailable, fallback to copying text with a note "Paste this at pokepast.es"

_Per-Pokemon export:_

- Accessible from the editor (same location as per-Pokemon import)
- "Copy set" → uses `exportPokemonToShowdown()` for just the selected Pokemon → clipboard + toast

**Export menu (`export-menu.tsx`):**

- Uses shadcn `DropdownMenu` component
- Items: "Copy team as Showdown text", "Open in Pokepaste" (or "Copy for Pokepaste" if no API)
- Each item has an icon and description

**Pokepaste integration:**

- Research how pokepast.es accepts new pastes during implementation
- If they have a POST API: submit and redirect/open in new tab
- If form-based: open pokepast.es in new tab with pre-filled form (if possible)
- If neither works: copy to clipboard + open pokepast.es in new tab (manual paste)

## Verification

After both tracks merge:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm dev:web  # manually verify:
  # Validation:
  # 1. Add two Pokemon with the same held item → red dot on both chips, inline error on item field
  # 2. Set EV total > 510 → counter turns red, inline error
  # 3. Click Validate → summary panel lists all issues
  # 4. Click an issue → jumps to that Pokemon + highlights the field
  # 5. Fix all issues → "No issues found ✓"
  # 6. Add a Pokemon with 0 moves → warning (valid but incomplete)
  #
  # Import/Export:
  # 7. Export team as Showdown text → clipboard matches expected format
  # 8. Import a Showdown paste → team populates correctly
  # 9. Import from Pokepaste URL → fetches and populates
  # 10. Per-Pokemon copy/paste → single set works
  # 11. Import with validation errors → errors shown before confirming
```

Commit with a descriptive message. Do NOT push.

## What NOT To Build

- No mobile layout (Session 5)
- No meta data integration
- No shareable trainers.gg link (deferred — Showdown + Pokepaste only for V1)
