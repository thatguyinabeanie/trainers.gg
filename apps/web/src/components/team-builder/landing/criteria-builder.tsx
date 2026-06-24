"use client";

/**
 * criteria-builder.tsx
 *
 * A controlled UI for assembling a Predicate[] and saving it as a named smart
 * folder. The caller owns persistence — this component only fires onSave when
 * the form is valid (non-empty name + at least one complete predicate).
 *
 * Predicate kinds supported:
 *   text         — free-text search across all fields
 *   field        — per-pokemon field (name / species / ability / item / move / tera)
 *   flag         — structural flag (complete / incomplete / legal / illegal)
 *   format       — exact format string (e.g. "reg-h")
 *   updated_within — recency gate (N days)
 */

import { useState, useRef } from "react";
import { X, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  type Predicate,
  type PredicateField,
  type PredicateFlag,
} from "./search-types";

// =============================================================================
// Constants
// =============================================================================

/** Row kind options shown in the type selector. */
const KIND_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "field", label: "Field" },
  { value: "flag", label: "Flag" },
  { value: "format", label: "Format" },
  { value: "updated_within", label: "Updated within" },
] as const;

type RowKind = (typeof KIND_OPTIONS)[number]["value"];

const FIELD_OPTIONS: { value: PredicateField; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "species", label: "Species" },
  { value: "ability", label: "Ability" },
  { value: "item", label: "Item" },
  { value: "move", label: "Move" },
  { value: "tera", label: "Tera type" },
];

const FLAG_OPTIONS: { value: PredicateFlag; label: string }[] = [
  { value: "complete", label: "Complete (6 Pokémon)" },
  { value: "incomplete", label: "Incomplete (< 6 Pokémon)" },
  { value: "legal", label: "Legal" },
  { value: "illegal", label: "Illegal" },
];

// =============================================================================
// Row state types
// =============================================================================

/** Internal mutable state for a single predicate row. */
type RowState =
  | { id: string; kind: "text"; value: string }
  | {
      id: string;
      kind: "field";
      field: PredicateField;
      value: string;
    }
  | { id: string; kind: "flag"; flag: PredicateFlag }
  | { id: string; kind: "format"; value: string }
  | { id: string; kind: "updated_within"; days: string }; // string for controlled input

// =============================================================================
// Helpers
// =============================================================================

function defaultRow(kind: RowKind, nextId: () => string): RowState {
  switch (kind) {
    case "text":
      return { id: nextId(), kind: "text", value: "" };
    case "field":
      return { id: nextId(), kind: "field", field: "species", value: "" };
    case "flag":
      return { id: nextId(), kind: "flag", flag: "complete" };
    case "format":
      return { id: nextId(), kind: "format", value: "" };
    case "updated_within":
      return { id: nextId(), kind: "updated_within", days: "" };
  }
}

/**
 * Convert a valid RowState to a Predicate.
 * Returns null when the row is incomplete / empty.
 */
function rowToPredicate(row: RowState): Predicate | null {
  switch (row.kind) {
    case "text":
      return row.value.trim() ? { kind: "text", value: row.value.trim() } : null;
    case "field":
      return row.value.trim()
        ? { kind: "field", field: row.field, value: row.value.trim() }
        : null;
    case "flag":
      return { kind: "flag", flag: row.flag };
    case "format":
      return row.value.trim()
        ? { kind: "format", value: row.value.trim() }
        : null;
    case "updated_within": {
      const days = parseInt(row.days, 10);
      return !isNaN(days) && days > 0
        ? { kind: "updated_within", days }
        : null;
    }
  }
}

// =============================================================================
// CriteriaBuilderRow
// =============================================================================

interface CriteriaBuilderRowProps {
  row: RowState;
  onChange: (next: RowState) => void;
  onRemove: () => void;
  nextId: () => string;
}

function CriteriaBuilderRow({
  row,
  onChange,
  onRemove,
  nextId,
}: CriteriaBuilderRowProps) {
  function handleKindChange(newKind: string | null) {
    if (!newKind) return;
    // Preserve the id, reset the rest based on the new kind.
    const next = defaultRow(newKind as RowKind, nextId);
    next.id = row.id;
    onChange(next);
  }

  return (
    <div className="flex items-start gap-2">
      {/* Kind selector */}
      <Select value={row.kind} onValueChange={handleKindChange}>
        <SelectTrigger
          className="h-9 w-full sm:w-40"
          aria-label="Condition type"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {KIND_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input(s) — depends on kind */}
      <div className="flex flex-1 items-start gap-2">
        {row.kind === "text" && (
          <Input
            className="h-9 flex-1"
            placeholder="Search text…"
            value={row.value}
            onChange={(e) => onChange({ ...row, value: e.target.value })}
            aria-label="Text value"
          />
        )}

        {row.kind === "field" && (
          <>
            <Select
              value={row.field}
              onValueChange={(v) => {
                if (v) onChange({ ...row, field: v as PredicateField });
              }}
            >
              <SelectTrigger className="h-9 w-36" aria-label="Field name">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-9 flex-1"
              placeholder="Value…"
              value={row.value}
              onChange={(e) => onChange({ ...row, value: e.target.value })}
              aria-label="Field value"
            />
          </>
        )}

        {row.kind === "flag" && (
          <Select
            value={row.flag}
            onValueChange={(v) => {
              if (v) onChange({ ...row, flag: v as PredicateFlag });
            }}
          >
            <SelectTrigger className="h-9 flex-1" aria-label="Flag value">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FLAG_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {row.kind === "format" && (
          <Input
            className="h-9 flex-1"
            placeholder="e.g. reg-h"
            value={row.value}
            onChange={(e) => onChange({ ...row, value: e.target.value })}
            aria-label="Format value"
          />
        )}

        {row.kind === "updated_within" && (
          <div className="flex flex-1 items-center gap-2">
            <Input
              type="number"
              min={1}
              className="h-9 w-24"
              placeholder="Days"
              value={row.days}
              onChange={(e) => onChange({ ...row, days: e.target.value })}
              aria-label="Days"
            />
            <span className="text-muted-foreground text-sm">days</span>
          </div>
        )}
      </div>

      {/* Remove button — ≥40px on mobile per design rules */}
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          "text-muted-foreground hover:text-foreground flex shrink-0 items-center justify-center rounded-md transition-colors",
          "size-10 sm:size-9"
        )}
        aria-label="Remove condition"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

// =============================================================================
// CriteriaBuilder (public export)
// =============================================================================

export interface CriteriaBuilderProps {
  initialName?: string;
  initialCriteria?: Predicate[];
  onSave: (name: string, criteria: Predicate[]) => void;
  onCancel?: () => void;
}

/**
 * Assembles a named set of Predicate[] for a smart folder.
 *
 * - Name input (required to enable Save).
 * - List of predicate rows; each row has a type selector + context-appropriate
 *   value input(s).
 * - "Add condition" appends a new text row.
 * - Save is disabled until: name is non-empty AND at least one row is valid.
 * - onSave receives the name + only the valid (non-empty) predicates.
 */
export function CriteriaBuilder({
  initialName = "",
  initialCriteria,
  onSave,
  onCancel,
}: CriteriaBuilderProps) {
  const [name, setName] = useState(initialName);

  // Instance-scoped row-id counter — avoids cross-instance/render leakage from
  // a module-level counter. Each CriteriaBuilder mount gets its own sequence.
  //
  // The counter is seeded to the number of IDs consumed by the useState
  // initializer below (which uses a local counter so it never reads .current
  // during render — React Compiler forbids ref reads during render).
  const initialSeedCount = initialCriteria?.length ?? 1;
  const counterRef = useRef(initialSeedCount);
  function nextId(): string {
    // Only called from event handlers (handleAddRow, handleChangeRow) — never
    // during render, so reading .current here is safe.
    return `row-${++counterRef.current}`;
  }

  // Seed rows from initialCriteria when provided.
  // Uses a local counter instead of counterRef.current so no ref is read/
  // written during render (React Compiler `refs-during-render` rule).
  const [rows, setRows] = useState<RowState[]>(() => {
    let c = 0;
    const localId = (): string => `row-${++c}`;

    if (initialCriteria && initialCriteria.length > 0) {
      return initialCriteria.map((p): RowState => {
        switch (p.kind) {
          case "text":
            return { id: localId(), kind: "text", value: p.value };
          case "field":
            return {
              id: localId(),
              kind: "field",
              field: p.field,
              value: p.value,
            };
          case "flag":
            return { id: localId(), kind: "flag", flag: p.flag };
          case "format":
            return { id: localId(), kind: "format", value: p.value };
          case "updated_within":
            return {
              id: localId(),
              kind: "updated_within",
              days: String(p.days),
            };
        }
      });
    }
    return [defaultRow("text", localId)];
  });

  const validPredicates = rows
    .map(rowToPredicate)
    .filter((p): p is Predicate => p !== null);

  const canSave = name.trim().length > 0 && validPredicates.length > 0;

  function handleAddRow() {
    setRows((prev) => [...prev, defaultRow("text", nextId)]);
  }

  function handleChangeRow(id: string, next: RowState) {
    setRows((prev) => prev.map((r) => (r.id === id ? next : r)));
  }

  function handleRemoveRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function handleSave() {
    if (!canSave) return;
    onSave(name.trim(), validPredicates);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="criteria-builder-name"
          className="text-sm font-medium leading-none"
        >
          Folder name
        </label>
        <Input
          id="criteria-builder-name"
          placeholder="e.g. Incomplete teams"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Folder name"
          aria-required
        />
      </div>

      {/* Predicate rows */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium leading-none">Conditions</span>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No conditions yet. Add one below.
          </p>
        ) : (
          <div className="flex flex-col gap-2" role="list" aria-label="Conditions">
            {rows.map((row) => (
              <div key={row.id} role="listitem">
                <CriteriaBuilderRow
                  row={row}
                  onChange={(next) => handleChangeRow(row.id, next)}
                  onRemove={() => handleRemoveRow(row.id)}
                  nextId={nextId}
                />
              </div>
            ))}
          </div>
        )}

        {/* Add condition */}
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleAddRow}
          className="mt-1 w-fit gap-1.5"
          aria-label="Add condition"
        >
          <Plus className="size-3.5" aria-hidden />
          Add condition
        </Button>
      </div>

      {/* Validation hint */}
      {!canSave && (
        <p
          className="text-muted-foreground text-xs"
          role="note"
          aria-live="polite"
        >
          {name.trim().length === 0
            ? "Enter a folder name to save."
            : "Add at least one complete condition to save."}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            variant="ghost"
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          aria-disabled={!canSave}
        >
          Save folder
        </Button>
      </div>
    </div>
  );
}
