"use client";

import { useEffect, useRef, useState } from "react";

import { useVirtualizer } from "@tanstack/react-virtual";

import {
  ALL_TYPES,
  getLearnableMoves,
  getLegalMoves,
  getMoveData,
  type GameFormat,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { CATEGORY_ICON_URLS } from "../../move-category-ui";
import { TYPE_BG_COLORS } from "../../type-colors";

// =============================================================================
// Types
// =============================================================================

type CategoryFilter = "Physical" | "Special" | "Status";
type SortCol = "type" | "name" | "category" | "bp" | "acc";
type SortDir = "asc" | "desc";

interface SortState {
  col: SortCol;
  dir: SortDir;
}

interface MovePickerProps {
  value: string | null | undefined;
  species: string;
  format: GameFormat | undefined;
  onPick: (moveName: string) => void;
  onClose: () => void;
}

type MoveRow = {
  name: string;
  data: ReturnType<typeof getMoveData>;
};

// =============================================================================
// Helpers
// =============================================================================

function categoryLetter(cat: string | undefined): string {
  if (cat === "Physical") return "P";
  if (cat === "Special") return "S";
  if (cat === "Status") return "St";
  return "—";
}

function typePillClass(type: string | undefined): string {
  if (!type) return "bg-muted text-foreground";
  return (
    TYPE_BG_COLORS[type as keyof typeof TYPE_BG_COLORS] ??
    "bg-muted text-foreground"
  );
}

function sortMoves(rows: MoveRow[], sort: SortState): MoveRow[] {
  const out = [...rows];
  out.sort((a, b) => {
    let cmp = 0;
    switch (sort.col) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "type":
        cmp = (a.data?.type ?? "").localeCompare(b.data?.type ?? "");
        break;
      case "category":
        cmp = (a.data?.category ?? "").localeCompare(b.data?.category ?? "");
        break;
      case "bp": {
        const ap = a.data?.basePower ?? 0;
        const bp = b.data?.basePower ?? 0;
        cmp = ap - bp;
        break;
      }
      case "acc": {
        const aa = a.data?.accuracy === true ? 101 : (a.data?.accuracy ?? 0);
        const ba = b.data?.accuracy === true ? 101 : (b.data?.accuracy ?? 0);
        cmp = aa - ba;
        break;
      }
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });
  return out;
}

// =============================================================================
// Sort/filter header cell
// =============================================================================

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return null;
  return (
    <span aria-hidden="true" className="ml-0.5 inline-block leading-none">
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

// =============================================================================
// MovePicker
// =============================================================================

/**
 * Searchable move picker filtered to species-legal moves in the given format.
 * Table layout with sortable column headers; Type and Category headers also
 * expose filter dropdowns. Rows are virtualized via @tanstack/react-virtual.
 */
export function MovePicker({
  value,
  species,
  format,
  onPick,
  onClose,
}: MovePickerProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter | null>(
    null
  );
  const [sort, setSort] = useState<SortState>({ col: "name", dir: "asc" });
  const [typeOpen, setTypeOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Build the candidate list (species-legal in format, alpha-sorted as base order)
  const allMoves = format
    ? Array.from(
        getLegalMoves(species, format.id) ?? getLearnableMoves(species)
      ).sort()
    : getLearnableMoves(species);

  // Apply search + type + category filters
  const lower = search.toLowerCase();
  const rows: MoveRow[] = [];
  for (const name of allMoves) {
    if (lower && !name.toLowerCase().includes(lower)) continue;
    const data = getMoveData(name);
    if (typeFilter && data?.type !== typeFilter) continue;
    if (categoryFilter && data?.category !== categoryFilter) continue;
    rows.push({ name, data });
  }

  const sorted = sortMoves(rows, sort);

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });

  function handleSort(col: SortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "name" || col === "type" ? "asc" : "desc" }
    );
  }

  function headerBtnClass(col: SortCol) {
    return cn(
      "cursor-pointer select-none transition-colors hover:text-foreground",
      sort.col === col ? "text-foreground" : "text-muted-foreground"
    );
  }

  // Shared row grid: name+desc | type | cat | bp | acc
  // 1fr     — name + description
  // 5rem    — type pill (fits "ELECTRIC", "FIGHTING")
  // 2.5rem  — category letter
  // 2.5rem  — bp
  // 3rem    — accuracy
  const ROW_GRID = "grid-cols-[minmax(0,1fr)_5rem_2.5rem_2.5rem_3rem]";

  return (
    <div className="bg-popover text-popover-foreground flex w-[720px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
          Move
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground flex size-4 items-center justify-center rounded text-sm"
        >
          ×
        </button>
      </div>

      {/* Search */}
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search moves…"
        className="bg-muted/40 border-b px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-card"
      />

      {/* Move list — sticky table header + virtualized rows */}
      <div ref={scrollRef} className="max-h-[480px] overflow-y-auto">
        {/* Sticky table header */}
        <div
          className={cn(
            "bg-card sticky top-0 z-20 grid items-center gap-2 border-b px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase",
            ROW_GRID
          )}
        >
          {/* Name column */}
          <button
            type="button"
            className={cn(headerBtnClass("name"), "text-left")}
            onClick={() => handleSort("name")}
            aria-label="Sort by name"
          >
            Name
            <SortArrow active={sort.col === "name"} dir={sort.dir} />
          </button>

          {/* Type column — header doubles as a filter dropdown trigger */}
          <Popover open={typeOpen} onOpenChange={setTypeOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    headerBtnClass("type"),
                    "flex items-center justify-center gap-0.5"
                  )}
                  aria-label="Filter by type"
                />
              }
            >
              <span>Type</span>
              {typeFilter && (
                <span className="text-primary text-[8px]">●</span>
              )}
              <SortArrow active={sort.col === "type"} dir={sort.dir} />
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              className="w-64 p-2"
            >
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter(null);
                    setTypeOpen(false);
                  }}
                  className={cn(
                    "col-span-3 rounded border px-2 py-1 text-xs",
                    !typeFilter
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted hover:bg-accent"
                  )}
                >
                  All types
                </button>
                {ALL_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTypeFilter(t);
                      setTypeOpen(false);
                    }}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-tight",
                      typePillClass(t),
                      typeFilter === t && "ring-2 ring-primary ring-offset-1"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleSort("type")}
                className="text-muted-foreground hover:text-foreground mt-2 w-full border-t pt-2 text-left text-[10px]"
              >
                Sort by type {sort.col === "type" && (sort.dir === "asc" ? "↑" : "↓")}
              </button>
            </PopoverContent>
          </Popover>

          {/* Category column — header doubles as filter */}
          <Popover open={catOpen} onOpenChange={setCatOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    headerBtnClass("category"),
                    "flex items-center justify-center gap-0.5"
                  )}
                  aria-label="Filter by category"
                />
              }
            >
              <span>Cat</span>
              {categoryFilter && (
                <span className="text-primary text-[8px]">●</span>
              )}
              <SortArrow active={sort.col === "category"} dir={sort.dir} />
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              className="w-44 p-2"
            >
              <div className="flex flex-col gap-1">
                {(
                  [null, "Physical", "Special", "Status"] as const
                ).map((cat) => (
                  <button
                    key={cat ?? "all"}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(cat as CategoryFilter | null);
                      setCatOpen(false);
                    }}
                    className={cn(
                      "rounded border px-2 py-1 text-left text-xs",
                      categoryFilter === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted hover:bg-accent"
                    )}
                  >
                    {cat ?? "All categories"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleSort("category")}
                className="text-muted-foreground hover:text-foreground mt-2 w-full border-t pt-2 text-left text-[10px]"
              >
                Sort by category{" "}
                {sort.col === "category" && (sort.dir === "asc" ? "↑" : "↓")}
              </button>
            </PopoverContent>
          </Popover>

          {/* BP column */}
          <button
            type="button"
            className={cn(headerBtnClass("bp"), "text-right")}
            onClick={() => handleSort("bp")}
            aria-label="Sort by base power"
          >
            BP
            <SortArrow active={sort.col === "bp"} dir={sort.dir} />
          </button>

          {/* Accuracy column */}
          <button
            type="button"
            className={cn(headerBtnClass("acc"), "text-right")}
            onClick={() => handleSort("acc")}
            aria-label="Sort by accuracy"
          >
            Acc
            <SortArrow active={sort.col === "acc"} dir={sort.dir} />
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No moves found
          </p>
        ) : (
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = sorted[virtualRow.index];
              if (!item) return null;
              const { name: moveName, data: move } = item;
              const isSelected = moveName === value;

              return (
                <div
                  key={moveName}
                  className="absolute left-0 w-full"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onPick(moveName);
                      onClose();
                    }}
                    className={cn(
                      "grid h-full w-full items-center gap-2 border-b px-3 text-left transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent text-accent-foreground",
                      ROW_GRID
                    )}
                  >
                    {/* Name + secondary effect — vertical stack */}
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">
                        {moveName}
                      </span>
                      {move?.shortDesc &&
                        move.shortDesc !== "No additional effect." && (
                          <span className="text-muted-foreground line-clamp-2 text-[11px] leading-tight">
                            {move.shortDesc}
                          </span>
                        )}
                    </span>

                    {/* Type pill */}
                    <span className="flex justify-center">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-tight",
                          typePillClass(move?.type)
                        )}
                      >
                        {move?.type ?? "—"}
                      </span>
                    </span>

                    {/* Category icon — orange burst (Physical), blue swirl (Special), grey oval (Status) */}
                    <span className="flex justify-center">
                      {move?.category && CATEGORY_ICON_URLS[move.category] ? (
                        <img
                          src={CATEGORY_ICON_URLS[move.category]}
                          alt={move.category}
                          width={32}
                          height={14}
                          className="h-3.5 w-auto [image-rendering:pixelated]"
                        />
                      ) : (
                        <span className="text-muted-foreground font-mono text-xs">
                          {categoryLetter(move?.category)}
                        </span>
                      )}
                    </span>

                    {/* BP */}
                    <span className="text-muted-foreground text-right font-mono text-xs tabular-nums">
                      {move?.basePower && move.basePower > 0
                        ? move.basePower
                        : "—"}
                    </span>

                    {/* Accuracy */}
                    <span className="text-muted-foreground text-right font-mono text-xs tabular-nums">
                      {move?.accuracy === true || !move?.accuracy
                        ? "—"
                        : `${move.accuracy}%`}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
