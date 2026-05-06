// =============================================================================
// identity-cell-shared.ts — shared types and Tailwind class strings for
// identity form cells.
//
// Siblings (item-cell, ability-cell, nature-cell, tera-cell, type-cell, plus
// the ghost/lane shells) MUST import from here and NOT from each other to
// avoid circular imports.
//
// The cellClasses constants below are the migrated shape of the legacy
// identity-lane.module.css rules — they keep one source of truth so a tweak
// to (e.g.) form-row padding flows to every cell at once.
// =============================================================================

/**
 * Controls which chrome variant the cell renders:
 *   "row"  — compact layout (formRow / formLabel / formValue chrome),
 *            uses FormChip where possible.
 *   "grid" — MidStack layout (midFormCell / midFormLbl / midFormVal chrome).
 */
export type CellVariant = "row" | "grid";

export const cellClasses = {
  formRow:
    "grid w-full cursor-pointer grid-cols-[56px_minmax(0,1fr)] items-center gap-1.5 rounded-sm border-0 bg-transparent px-1 py-[3px] text-left transition-colors hover:bg-muted",
  formLabel:
    "shrink-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground",
  formValue:
    "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] text-foreground",
  midFormCell:
    "grid w-full min-w-0 cursor-pointer grid-cols-[56px_minmax(0,1fr)] items-baseline gap-2 rounded-[5px] border-0 bg-transparent px-1.5 py-1 text-left transition-colors hover:bg-muted",
  midFormLbl:
    "overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground",
  midFormVal:
    "flex min-w-0 items-baseline gap-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-foreground",
  midMegaChip:
    "shrink-0 cursor-pointer whitespace-nowrap rounded-[3px] border border-primary/50 bg-primary/[0.12] px-1 py-px text-[9px] font-bold tracking-[0.04em] text-primary transition-colors hover:bg-primary/[0.24]",
} as const;
