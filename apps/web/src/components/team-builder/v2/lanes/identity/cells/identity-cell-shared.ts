// =============================================================================
// identity-cell-shared.ts — shared types for identity form cells
//
// Siblings (item-cell, ability-cell, nature-cell, tera-cell) MUST import from
// here and NOT from each other to avoid circular imports.
// =============================================================================

/**
 * Controls which chrome variant the cell renders:
 *   "row"  — compact layout (.formRow / .formLabel / .formValue chrome),
 *            uses FormChip where possible.
 *   "grid" — MidStack layout (.midFormCell / .midFormLbl / .midFormVal chrome).
 */
export type CellVariant = "row" | "grid";
