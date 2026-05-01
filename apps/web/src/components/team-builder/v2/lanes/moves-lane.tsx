"use client";

import { useState } from "react";

import { getMoveData, type GameFormat } from "@trainers/pokemon";
import { getShowdownTypeIconUrl } from "@trainers/pokemon/sprites";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { type ValidationError } from "../../validation-hooks";
import { CATEGORY_ICON_URLS } from "../../move-category-ui";
import { MovePicker } from "../pickers/move-picker";
import { useCalcStateContext } from "../calc/calc-state-context";
import { CalcDetailCard } from "../calc/calc-detail-card";
import { getMoveEffectiveness } from "../calc/move-effectiveness";
import { getMoveTargetInfo } from "../calc/move-target-info";
import { getVerdict } from "../../use-calc-state";
import { FieldError } from "../validation/field-error";

// =============================================================================
// Types
// =============================================================================

interface MovesLaneProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  /** Validation errors scoped to move fields (move1–move4). */
  fieldErrors?: ValidationError[];
}

type MoveSlot = "move1" | "move2" | "move3" | "move4";

/** Which popover panel is open for a tile. */
type TilePanel = "detail" | "picker" | null;

// =============================================================================
// Helpers
// =============================================================================

const MOVE_SLOTS: MoveSlot[] = ["move1", "move2", "move3", "move4"];

/** Map move slot key to parallel array index. */
const SLOT_IDX: Record<MoveSlot, number> = {
  move1: 0,
  move2: 1,
  move3: 2,
  move4: 3,
};

type KoTier = "1" | "2" | "3" | "4" | null;

function getKoTier(minPct: number, maxPct: number): KoTier {
  const verdict = getVerdict(minPct, maxPct);
  if (verdict === "OHKO") return "1";
  if (verdict === "2HKO") return "2";
  if (verdict === "3HKO") return "3";
  if (maxPct > 0) return "4";
  return null;
}

// =============================================================================
// MoveTile — one calc-aware move row
// =============================================================================

interface MoveTileProps {
  slotKey: MoveSlot;
  moveName: string | null;
  species: string;
  format: GameFormat | undefined;
  attacker: Tables<"pokemon">;
  onPick: (slotKey: MoveSlot, moveName: string) => void;
  /** Validation errors for this specific move slot. */
  slotErrors: ValidationError[];
}

function MoveTile({
  slotKey,
  moveName,
  species,
  format,
  attacker,
  onPick,
  slotErrors,
}: MoveTileProps) {
  const [panel, setPanel] = useState<TilePanel>(null);

  const calc = useCalcStateContext();
  const moveIdx = SLOT_IDX[slotKey];
  const output = calc.moveCalcOutputs[moveIdx] ?? null;

  const moveData = moveName ? getMoveData(moveName) : null;
  const isStatus = moveData?.category === "Status";
  // Only surface calc-derived info (damage range, KO tier, eff pip, spread
  // badge, "pick a target" hint) when the calc panel is enabled. The engine
  // still runs in the background so re-enabling the panel is instant.
  const hasCalc = calc.calcEnabled && output !== null && !isStatus;

  const hasDefender = calc.calcEnabled && Boolean(calc.defenderSpecies);

  const targetInfo = moveName ? getMoveTargetInfo(moveName) : null;
  const isSpread = targetInfo?.isSpread ?? false;
  const foesAlive = calc.field.foesAlive;
  const allyAlive = calc.field.allyAlive;
  const spreadApplied =
    isSpread &&
    (targetInfo?.kind === "all-foes"
      ? foesAlive >= 2
      : foesAlive >= 2 || allyAlive);

  // Display percentages with spread reduction applied
  const rawMin = output?.minPercent ?? 0;
  const rawMax = output?.maxPercent ?? 0;
  const displayMin = spreadApplied ? rawMin * 0.75 : rawMin;
  const displayMax = spreadApplied ? rawMax * 0.75 : rawMax;

  const koTier = hasCalc ? getKoTier(displayMin, displayMax) : null;

  // Resolve the effective weather: user-set overrides ability-inferred.
  const effectiveWeather = calc.weather || calc.inferredWeather;

  const eff =
    moveName && hasDefender && !isStatus
      ? getMoveEffectiveness(moveName, calc.defenderSpecies, effectiveWeather)
      : null;

  const hasError = slotErrors.some((e) => e.severity === "error");

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPanel("picker");
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!moveName) {
      setPanel("picker");
      return;
    }
    if (hasCalc) {
      setPanel("detail");
    } else {
      setPanel("picker");
    }
  }

  const isOpen = panel !== null;

  return (
    <div className="flex flex-col">
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <PopoverTrigger
          render={
            <button
              type="button"
              onClick={handleClick}
              onContextMenu={handleContextMenu}
              className={cn(
                "mvline",
                moveName ? "mvline--set" : "mvline--empty",
                koTier === "1" && "mvline--ko1",
                koTier === "2" && "mvline--ko2",
                koTier === "3" && "mvline--ko3",
                koTier === "4" && "mvline--ko4",
                hasError && "ring-1 ring-destructive/50"
              )}
            />
          }
        >
            {/* Col 1: Type pill — Showdown retro sprite */}
            <span className="mvline-type">
              {moveName && moveData?.type ? (
                <img
                  src={getShowdownTypeIconUrl(moveData.type)}
                  alt={moveData.type}
                  className="h-6 w-auto [image-rendering:pixelated]"
                />
              ) : null}
            </span>

            {/* Col 2: Category icon */}
            <span className="mvline-cat">
              {moveName && moveData?.category && CATEGORY_ICON_URLS[moveData.category] ? (
                <img
                  src={CATEGORY_ICON_URLS[moveData.category]}
                  alt={moveData.category}
                  className="h-6 w-auto [image-rendering:pixelated]"
                />
              ) : null}
            </span>

            {/* Col 3: Move name */}
            <span
              className={cn(
                "mvline-name",
                !moveName && "text-muted-foreground/50"
              )}
            >
              {moveName ?? "+ Add move"}
            </span>

            {/* Col 4: BP */}
            <span className="mvline-stat">
              <span className="mvline-stat-label">BP</span>
              <span className="mvline-stat-value mvline-stat-value--bp">
                {moveName && moveData?.basePower && moveData.basePower > 0
                  ? moveData.basePower
                  : moveName ? "—" : ""}
              </span>
            </span>

            {/* Col 5: Acc */}
            <span className="mvline-stat">
              <span className="mvline-stat-label">Acc</span>
              <span className="mvline-stat-value mvline-stat-value--acc">
                {moveName
                  ? moveData?.accuracy === true || !moveData?.accuracy
                    ? "—"
                    : `${moveData.accuracy}%`
                  : ""}
              </span>
            </span>

            {/* Col 6: Description (always rendered when present) */}
            <span
              className="mvline-desc"
              title={moveData?.shortDesc ?? undefined}
            >
              {moveName && moveData?.shortDesc && moveData.shortDesc !== "No additional effect."
                ? moveData.shortDesc
                : ""}
            </span>

            {/* Col 7: Calc pill (damage moves w/ calc on + defender) OR
                "pick a target" hint (calc on, no defender). Empty otherwise. */}
            {hasCalc && koTier ? (
              <span className={cn("mvline-pill", `mvline-pill--ko${koTier}`)}>
                <span className={cn("mvline-pill-tier", `mvline-pill-tier--ko${koTier}`)}>
                  {koTier === "1" ? "OHKO" : koTier === "2" ? "2HKO" : koTier === "3" ? "3HKO" : "4HKO+"}
                </span>
                <span className="mvline-pill-range">
                  {displayMin.toFixed(1)}–{displayMax.toFixed(1)}%
                </span>
                {((eff !== null && eff !== 1) || spreadApplied) && (
                  <span className="mvline-pill-mods">
                    {eff !== null && eff !== 1 && (
                      <span
                        className={cn(
                          "mvline-pill-mod",
                          eff > 1
                            ? "mvline-pill-mod--se"
                            : eff === 0
                              ? "mvline-pill-mod--imm"
                              : "mvline-pill-mod--ne"
                        )}
                        title={eff === 0 ? "Immune" : `${eff}× effectiveness`}
                      >
                        {eff}×
                      </span>
                    )}
                    {spreadApplied && (
                      <span className="mvline-pill-mod mvline-pill-mod--spread" title="Spread −25%">
                        spread
                      </span>
                    )}
                  </span>
                )}
              </span>
            ) : calc.calcEnabled && moveName && !hasDefender && !isStatus ? (
              <span className="mvline-no-target">— pick a target —</span>
            ) : calc.calcEnabled && moveName && hasDefender && !isStatus && output === null ? (
              <span
                className="mvline-no-target"
                role="status"
                title="Damage calc unavailable for this combination"
              >
                — calc unavailable —
              </span>
            ) : (
              <span aria-hidden />
            )}
        </PopoverTrigger>

        <PopoverContent side="bottom" align="start" className="w-auto p-0">
          {panel === "detail" && moveName && output ? (
            <CalcDetailCard
              attacker={attacker}
              moveName={moveName}
              baseOutput={output}
              defender={{
                species: calc.defenderSpecies,
                ability: calc.defenderAbility,
                item: calc.defenderItem,
                nature: calc.defenderNature,
              }}
              format={format}
              foesAlive={foesAlive}
              allyAlive={allyAlive}
              weather={calc.weather || calc.inferredWeather}
              onClose={() => setPanel(null)}
              onChangeMove={() => setPanel("picker")}
            />
          ) : (
            <MovePicker
              value={moveName}
              species={species}
              format={format}
              onPick={(name) => {
                onPick(slotKey, name);
                setPanel(null);
              }}
              onClose={() => setPanel(null)}
            />
          )}
        </PopoverContent>
      </Popover>
      {/* Inline error chips per move slot */}
      {slotErrors.map((err, i) => (
        <FieldError key={i} message={err.message} severity={err.severity} />
      ))}
    </div>
  );
}

// =============================================================================
// MovesLane
// =============================================================================

/**
 * Vertical stack of 4 calc-aware move tiles.
 *
 * Left-click: opens CalcDetailCard when calc data is available, else picker.
 * Right-click: always opens move picker.
 * Renders inline FieldError chips for move-scoped validation issues.
 */
export function MovesLane({ pokemon, format, onUpdate, fieldErrors = [] }: MovesLaneProps) {
  function handlePick(slotKey: MoveSlot, name: string) {
    onUpdate({ [slotKey]: name });
  }

  return (
    <div className="flex min-w-[240px] flex-1 flex-col gap-1 border-r border-dashed border-border/60 p-3">
      {/* Header */}
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
          Moves
        </span>
      </div>

      {/* Move tiles */}
      <div className="flex flex-col gap-1">
        {MOVE_SLOTS.map((slotKey) => {
          const slotErrors = fieldErrors.filter((e) => e.field === slotKey);
          return (
            <MoveTile
              key={slotKey}
              slotKey={slotKey}
              moveName={pokemon[slotKey]}
              species={pokemon.species ?? ""}
              format={format}
              attacker={pokemon}
              onPick={handlePick}
              slotErrors={slotErrors}
            />
          );
        })}
      </div>
    </div>
  );
}
