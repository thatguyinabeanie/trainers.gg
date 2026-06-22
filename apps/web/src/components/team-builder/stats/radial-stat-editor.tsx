"use client";

import { useEffect, useRef, useState } from "react";

import {
  findStatBreakpoints,
  getBaseStats,
  getNatureMultiplier,
  isChampionsFormat,
  NATURE_EFFECTS,
  STAT_KEYS,
  STAT_LABELS,
  type GameFormat,
} from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { type StatKey, type StatValues, STAT_COLOR_CLASS } from "../stat-types";
import {
  buildInputDisplay,
  computeInvestBudget,
  computeStat,
  getStatBudget,
} from "../calc-stat-helpers";
import { formatSupportsIvs } from "../format-gating";
import { computeNatureForSuffix } from "../nature-cycle";
import { type StatBoosts } from "../use-calc-state";
import { RadialFineTune } from "./radial-fine-tune";

// =============================================================================
// Types
// =============================================================================

export interface RadialStatEditorProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  /** Current stat boost stages (atk/def/spa/spd/spe). Only rendered when provided. */
  boosts?: StatBoosts;
  onBoostChange?: (stat: keyof StatBoosts, value: number) => void;
  /**
   * When true, renders a smaller/denser hexagon for side-by-side layouts
   * (e.g. the damage-calc versus view). Defaults to false — the solo
   * single-focus view is unchanged.
   */
  compact?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DRAFT_DEBOUNCE_MS = 400;
const UNINITIALIZED = Symbol();

/**
 * All natures, sorted alphabetically — the options for the stat-alignment /
 * nature single-select dropdown. NATURE_EFFECTS is keyed by nature name.
 */
const NATURE_OPTIONS: readonly string[] = Object.keys(NATURE_EFFECTS).sort();

/** EV field map: stat key → pokemon DB column */
const EV_FIELD: Record<StatKey, keyof Tables<"pokemon">> = {
  hp: "ev_hp",
  attack: "ev_attack",
  defense: "ev_defense",
  specialAttack: "ev_special_attack",
  specialDefense: "ev_special_defense",
  speed: "ev_speed",
};

/**
 * Hexagon vertex angles for each stat (in degrees, 0 = top, clockwise).
 * HP is top, then ATK, DEF, SPE, SPD, SPA going clockwise — matches the
 * standard competitive hexagon arrangement.
 */
const STAT_ANGLES: Record<StatKey, number> = {
  hp: -90, // top
  attack: -30, // top-right
  defense: 30, // bottom-right
  speed: 90, // bottom
  specialDefense: 150, // bottom-left
  specialAttack: 210, // top-left
};

/**
 * Vertices in clockwise ANGULAR order around the hexagon (matching STAT_ANGLES).
 * The polygon + grid rings MUST connect vertices in this order — iterating in
 * STAT_KEYS order (hp, atk, def, spa, spd, spe) connects them out of sequence
 * (def→spa jumps across the hexagon), producing a self-intersecting "bowtie"
 * with missing sections instead of a clean convex hexagon.
 */
const HEX_ORDER: readonly StatKey[] = [
  "hp", // -90 top
  "attack", // -30 top-right
  "defense", // 30 bottom-right
  "speed", // 90 bottom
  "specialDefense", // 150 bottom-left
  "specialAttack", // 210 top-left
];

/** Short labels for the hexagon vertices */
const STAT_SHORT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  attack: "ATK",
  defense: "DEF",
  specialAttack: "SPA",
  specialDefense: "SPD",
  speed: "SPE",
};

// =============================================================================
// SVG geometry helpers
// =============================================================================

const SVG_SIZE = 240; // viewBox square
const CENTER = SVG_SIZE / 2; // 120
const MAX_RADIUS = 92; // outer ring radius (spoke tip at full investment)
/**
 * MIN_RADIUS must be large enough that all six handles are visible at 0 investment
 * and don't overlap each other near the center. At 0 EV every handle sits at this
 * radius, so it must clear the center hub with comfortable spacing.
 * With 6 handles at radius 34 in a 240px viewBox, the arc distance between
 * adjacent handles is ≈35px (34 × 2π/6) — enough separation to be distinct.
 */
const MIN_RADIUS = 34;
const LABEL_RADIUS = 112; // stat label + number ring
const HANDLE_HIT_RADIUS = 22; // ≥44px hit area = 22 SVG units in 240px box

/** Convert polar (degrees from top, clockwise) to SVG [x, y] */
function polarToXY(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

/** Build the SVG polygon points string for the investment shape */
function buildPolygonPoints(radii: Record<StatKey, number>): string {
  return HEX_ORDER.map((k) =>
    polarToXY(STAT_ANGLES[k], radii[k]).join(",")
  ).join(" ");
}

/** Scale ev/sp to a radius between MIN_RADIUS and MAX_RADIUS */
function evToRadius(ev: number, perStatMax: number): number {
  const fraction = perStatMax > 0 ? ev / perStatMax : 0;
  return MIN_RADIUS + fraction * (MAX_RADIUS - MIN_RADIUS);
}

/** Inverse: pointer offset → ev snapped to step */
function radiusToEv(radius: number, perStatMax: number, step: number): number {
  const clamped = Math.max(0, Math.min(MAX_RADIUS, radius - MIN_RADIUS));
  const fraction = clamped / (MAX_RADIUS - MIN_RADIUS);
  const raw = fraction * perStatMax;
  return Math.round(raw / step) * step;
}

// =============================================================================
// Helpers — reuse the same EV extraction as StatsLane
// =============================================================================

function getEvs(pokemon: Tables<"pokemon">): StatValues {
  return {
    hp: pokemon.ev_hp ?? 0,
    attack: pokemon.ev_attack ?? 0,
    defense: pokemon.ev_defense ?? 0,
    specialAttack: pokemon.ev_special_attack ?? 0,
    specialDefense: pokemon.ev_special_defense ?? 0,
    speed: pokemon.ev_speed ?? 0,
  };
}

function getIvs(pokemon: Tables<"pokemon">): StatValues {
  return {
    hp: pokemon.iv_hp ?? 31,
    attack: pokemon.iv_attack ?? 31,
    defense: pokemon.iv_defense ?? 31,
    specialAttack: pokemon.iv_special_attack ?? 31,
    specialDefense: pokemon.iv_special_defense ?? 31,
    speed: pokemon.iv_speed ?? 31,
  };
}

/** Parse EV/SP text input — mirrors StatsLane's parseEvInput exactly. */
function parseEvInput(raw: string): {
  value: number;
  suffix: "+" | "-" | null;
} {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d*)\s*([+\-−])?$/);
  if (!match) return { value: 0, suffix: null };
  const numStr = match[1] ?? "";
  const value = numStr === "" ? 0 : parseInt(numStr, 10);
  const sym = match[2];
  const suffix = sym === "+" ? "+" : sym === "-" || sym === "−" ? "-" : null;
  return { value, suffix };
}

// =============================================================================
// SpokeInput — text input attached to a single spoke
// =============================================================================

interface SpokeInputProps {
  statKey: StatKey;
  ev: number;
  isNatureBoosted: boolean;
  isNatureReduced: boolean;
  investBudget: number;
  budget: ReturnType<typeof getStatBudget>;
  nature: string;
  evFieldKey: keyof Tables<"pokemon">;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  onDraft: (ev: number) => void;
  onFlush: () => void;
}

/**
 * Transparent/borderless at rest, primary ring on focus — shows allocated value.
 * Click-to-type preserved for a11y / exact spreads. Drag + keyboard unchanged.
 */
function SpokeInput({
  statKey,
  ev,
  isNatureBoosted,
  isNatureReduced,
  investBudget,
  budget,
  nature,
  evFieldKey,
  onUpdate,
  onDraft,
  onFlush,
}: SpokeInputProps) {
  const [inputBuffer, setInputBuffer] = useState<string | null>(null);
  const inputDisplay = buildInputDisplay(ev, isNatureBoosted, isNatureReduced);
  // At rest, a 0-EV spoke shows an em-dash (—) rather than an empty field, so
  // the inline "· EV" reads "· —" instead of a dangling separator. Focus clears
  // it to an empty field for typing (see handleFocus).
  const displayValue = inputBuffer ?? (ev === 0 ? "—" : inputDisplay);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputBuffer(e.target.value);
    // Parse and bubble as draft while typing
    const { value } = parseEvInput(e.target.value);
    const clamped = Math.min(Math.max(0, value), budget.perStat, investBudget);
    const snapped = Math.round(clamped / budget.step) * budget.step;
    onDraft(snapped);
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    // Clear the rest-state em-dash to an empty field so the user types into a
    // blank input (ev > 0 keeps its numeric value for editing).
    setInputBuffer(ev === 0 ? "" : e.target.value);
  }

  function commitInput(raw: string) {
    const { value: parsedValue, suffix } = parseEvInput(raw);
    const val = Math.max(0, Math.min(budget.perStat, parsedValue));
    const clamped = Math.min(val, investBudget);
    const snapped = Math.round(clamped / budget.step) * budget.step;

    const newNature = computeNatureForSuffix({
      currentNature: nature,
      statKey,
      suffix,
    });
    const update: Partial<TablesUpdate<"pokemon">> = { [evFieldKey]: snapped };
    if (newNature !== null) update.nature = newNature;

    onDraft(snapped);
    onUpdate(update);
    setInputBuffer(null);
    onFlush();
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    commitInput(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.currentTarget.blur();
    else if (e.key === "Escape") {
      setInputBuffer(null);
      e.currentTarget.blur();
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      aria-label={`${STAT_SHORT_LABELS[statKey]} investment`}
      className={cn(
        /* Transparent at rest — ring on focus. 4 chars wide, mono, tiny, teal. */
        "focus:ring-primary text-s h-5 w-8 rounded bg-transparent font-mono outline-none focus:ring-1",
        "border border-transparent focus:border-transparent",
        "text-primary",
        inputBuffer !== null && "bg-background/80",
        ev === 0 && inputBuffer === null && "text-muted-foreground/50"
      )}
    />
  );
}

// =============================================================================
// RadialStatEditor
// =============================================================================

/**
 * Interactive radial hexagon EV/SP stat editor.
 *
 * Layout:
 *  • SVG hexagon — 6 spokes, draggable handles, polygon fill shows spread.
 *  • Each vertex has: draggable EV handle, stat label (with ▲/▼), effective
 *    value (plain), and one editable teal allocated-number input.
 *  • Budget readout BELOW the SVG as "{invested} / {total}" — hexagon center clean.
 *  • Nature pill below budget: STAT ALIGN/NATURE + current nature + effects.
 *    Clicking cycles through neutral → +ATK → +DEF → +SPA → +SPD → +SPE → neutral.
 *  • "Fine-tune ▾ (± boosts)" expander below for IVs + boost steppers.
 *
 * Primary interactions:
 *  • Click-to-type on EV input (inputBuffer pattern — mirrors StatsLane).
 *  • ↑/↓ arrow keys on the SVG handle: ±step.
 *  • PageUp/PageDown on the handle: jump to next/prev breakpoint.
 *  • Click-drag on the handle: radius → EV, snapped to budget.step.
 *  • Click on nature pill: cycle through all 5 boostable stats (full coverage).
 *
 * All EV/budget logic is reused verbatim from calc-stat-helpers.ts and
 * nature-cycle.ts — no duplication.
 */
export function RadialStatEditor({
  pokemon,
  format,
  onUpdate,
  boosts,
  onBoostChange,
  compact = false,
}: RadialStatEditorProps) {
  const isChampions = isChampionsFormat(format);
  const showIvs = formatSupportsIvs(format);
  const budget = getStatBudget(isChampions);

  // --- Live draft EVs (updated synchronously during drag / keyboard) ---
  // Reset when pokemon changes — same pattern as StatsLane.
  const [draftEvs, setDraftEvs] = useState<Partial<Record<StatKey, number>>>(
    {}
  );
  const [prevPokemonId, setPrevPokemonId] = useState<
    number | typeof UNINITIALIZED
  >(UNINITIALIZED);
  if (pokemon.id !== prevPokemonId) {
    setPrevPokemonId(pokemon.id);
    setDraftEvs({});
  }

  const committedEvs = getEvs(pokemon);
  const ivs = getIvs(pokemon);
  const level = pokemon.level ?? 50;
  const nature = pokemon.nature ?? "Hardy";

  /** Resolved EVs: draft overrides committed when dragging/typing */
  const displayEvs: StatValues = {
    hp: draftEvs.hp ?? committedEvs.hp,
    attack: draftEvs.attack ?? committedEvs.attack,
    defense: draftEvs.defense ?? committedEvs.defense,
    specialAttack: draftEvs.specialAttack ?? committedEvs.specialAttack,
    specialDefense: draftEvs.specialDefense ?? committedEvs.specialDefense,
    speed: draftEvs.speed ?? committedEvs.speed,
  };

  const totalEv = STAT_KEYS.reduce((sum, k) => sum + displayEvs[k], 0);

  const rawBase = getBaseStats(pokemon.species ?? "");
  const base: StatValues = rawBase ?? {
    hp: 50,
    attack: 50,
    defense: 50,
    specialAttack: 50,
    specialDefense: 50,
    speed: 50,
  };

  const natureEffect = NATURE_EFFECTS[nature];
  const natUp = natureEffect?.boost;
  const natDown = natureEffect?.reduce;

  // --- Fine-tune expander ---
  const [fineTuneOpen, setFineTuneOpen] = useState(false);

  // --- Drag + focus state ---
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<StatKey | null>(null);
  const [focusedHandle, setFocusedHandle] = useState<StatKey | null>(null);

  // --- Debounced commit for drag/keyboard changes ---
  // We store pending updates in a ref so the effect closure always sees the latest.
  const pendingUpdate = useRef<Partial<TablesUpdate<"pokemon">> | null>(null);

  useEffect(() => {
    if (pendingUpdate.current === null) return;
    const update = pendingUpdate.current;
    const timer = setTimeout(() => {
      pendingUpdate.current = null;
      onUpdate(update);
    }, DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draftEvs, onUpdate]);

  /** Schedule a debounced EV commit */
  function scheduleDraftCommit(statKey: StatKey, ev: number) {
    const currentUpdate = pendingUpdate.current ?? {};
    pendingUpdate.current = { ...currentUpdate, [EV_FIELD[statKey]]: ev };
    setDraftEvs((prev) => ({ ...prev, [statKey]: ev }));
  }

  /** Flush immediately (used on pointer-up, blur) */
  function flushDraftCommit(statKey: StatKey) {
    if (pendingUpdate.current === null) return;
    const update = pendingUpdate.current;
    pendingUpdate.current = null;
    // Clear draft on flush — let the committed prop take over
    setDraftEvs((prev) => {
      const next = { ...prev };
      delete next[statKey];
      return next;
    });
    onUpdate(update);
  }

  // --- Pointer drag: track pointer globally so dragging outside SVG still works ---
  useEffect(() => {
    if (!dragging) return;

    function handlePointerMove(e: PointerEvent) {
      if (!svgRef.current || !dragging) return;

      const rect = svgRef.current.getBoundingClientRect();
      // Map pointer position to SVG viewBox coordinates
      const scaleX = SVG_SIZE / rect.width;
      const scaleY = SVG_SIZE / rect.height;
      const svgX = (e.clientX - rect.left) * scaleX;
      const svgY = (e.clientY - rect.top) * scaleY;

      // Project the pointer onto the spoke axis
      const angleDeg = STAT_ANGLES[dragging];
      const angleRad = (angleDeg * Math.PI) / 180;
      const dx = svgX - CENTER;
      const dy = svgY - CENTER;
      // Dot product with unit spoke vector → distance along spoke
      const projectedRadius = dx * Math.cos(angleRad) + dy * Math.sin(angleRad);

      const investBudget = computeInvestBudget(
        totalEv,
        displayEvs[dragging],
        budget.total,
        budget.perStat
      );

      const rawEv = radiusToEv(projectedRadius, budget.perStat, budget.step);
      const clamped = Math.min(rawEv, investBudget);

      scheduleDraftCommit(dragging, clamped);
    }

    function handlePointerUp() {
      if (dragging) flushDraftCommit(dragging);
      setDragging(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    // dragging changes when we start/stop — all other deps are stable refs or derived in the callback
  }, [dragging]);

  // --- Handle keyboard on the spoke handles ---
  function handleHandleKeyDown(statKey: StatKey, e: React.KeyboardEvent) {
    if (
      e.key !== "ArrowUp" &&
      e.key !== "ArrowDown" &&
      e.key !== "PageUp" &&
      e.key !== "PageDown"
    )
      return;

    e.preventDefault();

    const ev = displayEvs[statKey];
    const isNatureBoosted = natUp === statKey;
    const investBudget = computeInvestBudget(
      totalEv,
      ev,
      budget.total,
      budget.perStat
    );

    let nextEv = ev;

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const delta = e.key === "ArrowUp" ? budget.step : -budget.step;
      nextEv = Math.max(0, Math.min(investBudget, ev + delta));
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      // Jump to the next/prev breakpoint when on a nature-boosted stat
      if (isNatureBoosted) {
        const breakpoints = findStatBreakpoints({
          statKey,
          base: base[statKey],
          iv: ivs[statKey],
          level,
          natureMultiplier: isChampions
            ? 1.1
            : getNatureMultiplier(
                nature,
                statKey as keyof Omit<StatValues, "hp">
              ),
          perStatMax: budget.perStat,
          step: budget.step,
          isChampions,
        });
        if (e.key === "PageUp") {
          const next = breakpoints.find((bp) => bp > ev);
          nextEv = next !== undefined ? Math.min(next, investBudget) : ev;
        } else {
          const prev = [...breakpoints].reverse().find((bp) => bp < ev);
          nextEv = prev !== undefined ? prev : ev;
        }
      } else {
        // Without breakpoints: PageUp/Down = jump ±large step
        const bigStep =
          Math.round(budget.perStat / 4 / budget.step) * budget.step;
        const delta = e.key === "PageUp" ? bigStep : -bigStep;
        nextEv = Math.max(0, Math.min(investBudget, ev + delta));
      }
    }

    if (nextEv !== ev) {
      scheduleDraftCommit(statKey, nextEv);
      // Keyboard is a discrete action — commit immediately (no drag debounce)
      setTimeout(() => flushDraftCommit(statKey), 0);
    }
  }

  // --- Radii for the polygon ---
  const radii: Record<StatKey, number> = {} as Record<StatKey, number>;
  for (const k of STAT_KEYS) {
    radii[k] = evToRadius(displayEvs[k], budget.perStat);
  }

  const polygonPoints = buildPolygonPoints(radii);

  // --- Grid lines (reference hexagons at 25%, 50%, 75%, 100%) ---
  const gridFractions = [0.25, 0.5, 0.75, 1.0];

  // --- Nature pill label and effects ---
  const naturePillLabel = isChampions ? "STAT ALIGN" : "NATURE";
  const natUpShort = natUp ? STAT_SHORT_LABELS[natUp] : null;
  const natDownShort = natDown ? STAT_SHORT_LABELS[natDown] : null;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Hexagon canvas — aspect-square, width-capped. Capped well BELOW the
          card width on purpose: the inline spoke labels extend into the side
          gutters, so the hexagon must leave ~6rem of room on each side or the
          labels overflow the card. compact (versus) is a touch smaller still. */}
      <div
        className={cn(
          "relative mx-auto aspect-square w-full touch-none select-none",
          // Same cap in both layouts: the spoke labels live in foreignObjects
          // INSIDE the SVG, so their rendered size scales with the hexagon's
          // width. Matching the cap keeps the solo labels the same size as the
          // versus (compact) labels (the size that reads well).
          "max-w-44"
        )}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          aria-label="Stat investment hexagon"
          className="h-full w-full overflow-visible"
        >
          {/* ── Grid lines (reference hexagons) ── */}
          {gridFractions.map((frac) => {
            const r = MIN_RADIUS + frac * (MAX_RADIUS - MIN_RADIUS);
            const pts = HEX_ORDER.map((k) =>
              polarToXY(STAT_ANGLES[k], r).join(",")
            ).join(" ");
            return (
              <polygon
                key={frac}
                points={pts}
                fill="none"
                className="stroke-muted-foreground/20"
                /* 1px hairline grid — SVG stroke, not Tailwind scale */
                strokeWidth={1}
                aria-hidden
              />
            );
          })}

          {/* ── Spoke lines ── */}
          {STAT_KEYS.map((k) => {
            const [x, y] = polarToXY(STAT_ANGLES[k], MAX_RADIUS);
            return (
              <line
                key={k}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                className="stroke-muted-foreground/20"
                /* 1px hairline spoke — SVG stroke, not Tailwind scale */
                strokeWidth={1}
                aria-hidden
              />
            );
          })}

          {/* ── Investment polygon ── */}
          <polygon
            points={polygonPoints}
            className="fill-primary/20 stroke-primary"
            /* 2px polygon border — SVG stroke, not Tailwind scale */
            strokeWidth={2}
            strokeLinejoin="round"
            aria-hidden
          />

          {/* ── Per-spoke: handle + nature button + labels ── */}
          {STAT_KEYS.map((statKey) => {
            const ev = displayEvs[statKey];
            const isNatureBoosted = natUp === statKey;
            const isNatureReduced = natDown === statKey;
            const investBudget = computeInvestBudget(
              totalEv,
              ev,
              budget.total,
              budget.perStat
            );

            const handleRadius = radii[statKey];
            const [hx, hy] = polarToXY(STAT_ANGLES[statKey], handleRadius);
            const [lx, ly] = polarToXY(STAT_ANGLES[statKey], LABEL_RADIUS);

            // Anchor each label to its side so the wide inline row sits tidily
            // OUTSIDE the hexagon instead of sprawling across it: left stats
            // right-align (flow outward-left), right stats left-align (flow
            // outward-right), top/bottom center over the vertex.
            const labelCos = Math.cos((STAT_ANGLES[statKey] * Math.PI) / 180);
            const labelSide =
              labelCos > 0.35 ? "right" : labelCos < -0.35 ? "left" : "center";
            const LABEL_W = 118; // svgu — just enough for "▲ SPA 206 · 23"
            const labelX =
              labelSide === "right"
                ? lx - 6
                : labelSide === "left"
                  ? lx + 6 - LABEL_W
                  : lx - LABEL_W / 2;
            const labelJustify =
              labelSide === "right"
                ? "justify-start"
                : labelSide === "left"
                  ? "justify-end"
                  : "justify-center";

            const liveFinalStat = computeStat({
              statKey,
              base: base[statKey],
              iv: ivs[statKey],
              ev,
              nature,
              level,
              isChampions,
            });

            const colorClass = STAT_COLOR_CLASS[statKey];

            const isFocused = focusedHandle === statKey;

            return (
              <g key={statKey}>
                {/* EV handle dot — always rendered at handleRadius (MIN_RADIUS at 0 EV).
                    Filled teal = has investment; muted fill = 0 investment.
                    A subtle ring outline ensures the dot is always legible at MIN_RADIUS. */}
                <circle
                  cx={hx}
                  cy={hy}
                  r={5}
                  className={cn(
                    "pointer-events-none",
                    ev > 0
                      ? "fill-primary stroke-primary/40"
                      : "fill-muted-foreground/50 stroke-muted-foreground/20"
                  )}
                  /* 1.5px ring — SVG stroke, not Tailwind scale */
                  strokeWidth={1.5}
                  aria-hidden
                />

                {/* Focus ring — shown when the handle is focused */}
                {isFocused && (
                  <circle
                    cx={hx}
                    cy={hy}
                    r={9}
                    fill="none"
                    className="stroke-primary pointer-events-none"
                    /* 2px focus ring — SVG stroke, not Tailwind scale */
                    strokeWidth={2}
                    aria-hidden
                  />
                )}

                {/* Invisible large hit/focus target for the handle (≥44px = 22 SVG units) */}
                <circle
                  cx={hx}
                  cy={hy}
                  r={HANDLE_HIT_RADIUS}
                  fill="transparent"
                  role="slider"
                  aria-label={`${STAT_LABELS[statKey]} investment`}
                  aria-valuenow={ev}
                  aria-valuemin={0}
                  aria-valuemax={investBudget}
                  tabIndex={0}
                  className="cursor-grab focus:outline-none active:cursor-grabbing"
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    (e.target as Element).setPointerCapture(e.pointerId);
                    setDragging(statKey);
                  }}
                  onKeyDown={(e) => handleHandleKeyDown(statKey, e)}
                  onFocus={() => setFocusedHandle(statKey)}
                  onBlur={() => setFocusedHandle(null)}
                />

                {/* Inline label row: ‹arrow› ‹ABBR› ‹effective› · ‹EV input›
                    Replaces the two stacked SVG <text> nodes and separate SpokeInput
                    foreignObject. One foreignObject per spoke, centered on the vertex.
                    Width 120 svgu gives enough room for the longest line.
                    Vertical offset: center the 20svgu-tall row on the label point (ly). */}
                <foreignObject
                  x={labelX}
                  y={ly - 10}
                  width={LABEL_W}
                  height={20}
                  style={{ overflow: "visible" }}
                >
                  <div
                    className={cn(
                      "flex items-baseline whitespace-nowrap",
                      labelJustify,
                      compact ? "gap-px" : "gap-0.5"
                    )}
                  >
                    {/* Arrow — left of abbreviation, colored by nature. aria-hidden:
                        the slider handle carries the a11y role; these are decorative. */}
                    {isNatureBoosted && (
                      <span
                        aria-hidden
                        className="text-xs font-bold text-emerald-500 dark:text-emerald-400"
                      >
                        ▲
                      </span>
                    )}
                    {isNatureReduced && (
                      <span
                        aria-hidden
                        className="text-xs font-bold text-rose-500 dark:text-rose-400"
                      >
                        ▼
                      </span>
                    )}

                    {/* Abbreviation — aria-hidden: the input below provides the label */}
                    <span
                      aria-hidden
                      className={cn(
                        "text-s font-mono font-semibold uppercase",
                        colorClass,
                        isNatureBoosted &&
                          "text-emerald-500 dark:text-emerald-400",
                        isNatureReduced && "text-rose-500 dark:text-rose-400"
                      )}
                    >
                      {STAT_SHORT_LABELS[statKey]}
                    </span>

                    {/* Effective stat — bold foreground. aria-hidden: decorative
                        display. text-xs in both layouts (the versus/compact size
                        the labels are tuned to; solo is no longer bumped up). */}
                    <span
                      aria-hidden
                      className={cn(
                        "text-foreground ml-0.5 font-mono font-bold tabular-nums",
                        "text-s"
                      )}
                    >
                      {liveFinalStat}
                    </span>

                    {/* Separator — decorative */}
                    <span
                      aria-hidden
                      className="text-muted-foreground/60 text-s mx-0.5 font-mono"
                    >
                      ·
                    </span>

                    {/* Editable EV/SP inline — reuses full SpokeInput logic */}
                    <SpokeInput
                      statKey={statKey}
                      ev={ev}
                      isNatureBoosted={isNatureBoosted}
                      isNatureReduced={isNatureReduced}
                      investBudget={investBudget}
                      budget={budget}
                      nature={nature}
                      evFieldKey={EV_FIELD[statKey]}
                      onUpdate={onUpdate}
                      onDraft={(nextEv) =>
                        setDraftEvs((prev) => ({
                          ...prev,
                          [statKey]: nextEv,
                        }))
                      }
                      onFlush={() => {
                        setDraftEvs((prev) => {
                          const next = { ...prev };
                          delete next[statKey];
                          return next;
                        });
                      }}
                    />
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Budget readout — below SVG, not center chip ── */}
      <div
        aria-label={`${totalEv} of ${budget.total} ${budget.label} invested`}
        className="flex items-center justify-center gap-1"
      >
        <span
          className={cn(
            "font-mono text-xs font-bold tabular-nums",
            totalEv > budget.total ? "text-destructive" : "text-foreground"
          )}
        >
          {totalEv}
        </span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          / {budget.total}
        </span>
      </div>

      {/* ── Nature pill ── order-first lifts STAT ALIGN / NATURE above the
          hexagon (the editor is a flex-col; the hexagon, budget, and fine-tune
          keep their source order below it). */}
      <div className="order-first flex items-center gap-2">
        <label
          className={cn(
            "bg-muted/60 border-border/60 hover:bg-muted flex items-center gap-1.5 rounded-md border font-mono text-xs font-semibold transition-colors",
            compact ? "px-2 py-1" : "px-2.5 py-1.5"
          )}
        >
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {naturePillLabel}
          </span>
          {/* Single-select dropdown of every nature (alignment in Champions) */}
          <select
            value={nature}
            onChange={(e) => onUpdate({ nature: e.target.value })}
            aria-label={naturePillLabel}
            className="text-foreground cursor-pointer bg-transparent font-mono text-xs font-semibold outline-none"
          >
            {NATURE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        {/* Nature effects: +STAT −STAT */}
        {(natUpShort || natDownShort) && (
          <span className="font-mono text-xs font-bold">
            {natUpShort && (
              <span className="text-emerald-600 dark:text-emerald-400">
                +{natUpShort}
              </span>
            )}
            {natUpShort && natDownShort && (
              <span className="text-muted-foreground mx-0.5"> </span>
            )}
            {natDownShort && (
              <span className="text-rose-600 dark:text-rose-400">
                −{natDownShort}
              </span>
            )}
          </span>
        )}
      </div>

      {/* ── Fine-tune expander ── */}
      <RadialFineTune
        open={fineTuneOpen}
        onOpenChange={setFineTuneOpen}
        pokemon={pokemon}
        format={format}
        onUpdate={onUpdate}
        showIvs={showIvs}
        isChampions={isChampions}
        ivs={ivs}
        boosts={boosts}
        onBoostChange={onBoostChange}
      />
    </div>
  );
}
