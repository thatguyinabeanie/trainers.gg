"use client";

import { getMoveData } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { type CalcOutput, getVerdict } from "../../use-calc-state";
import { TypeDot } from "../type-dot";

// =============================================================================
// Types
// =============================================================================

interface CalcResultsBlockProps {
  moves: readonly (string | null)[];
  moveCalcOutputs: readonly (CalcOutput | null)[];
  defenderHp: number;
  gameType: "Doubles" | "Singles";
  foesAlive: 1 | 2;
}

// =============================================================================
// Spread move detection
// =============================================================================

/**
 * Returns true when the move hits multiple targets in Doubles.
 * Uses the @pkmn/dex target field available via getMoveData's underlying dex.
 * Spread moves are reduced 25% when hitting 2 targets.
 *
 * Note: getMoveData returns a simplified MoveData shape that doesn't expose
 * target. We fall back to a known-spread-move list for Phase 3.
 * TODO Phase 4: expose `target` in MoveData so this is data-driven.
 */
const KNOWN_SPREAD_MOVES = new Set([
  "Earthquake",
  "Magnitude",
  "Surf",
  "Discharge",
  "Blizzard",
  "Hyper Voice",
  "Explosion",
  "Self-Destruct",
  "Heat Wave",
  "Sludge Wave",
  "Muddy Water",
  "Glacial Lance",
  "Astral Barrage",
  "Tera Blast", // can be spread in some contexts — conservative inclusion
  "Dazzling Gleam",
  "Pollen Puff",
  "Snarl",
  "Boomburst",
  "Swift",
  "Razor Wind",
  "Twister",
  "Whirlpool",
  "Rock Slide",
  "Lava Plume",
  "Bubble",
  "Bubble Beam",
  "Icy Wind",
  "Electroweb",
  "Mudshot",
  "Venom Drench",
  "Fairy Wind",
  "Round",
  "Overdrive",
]);

function isSpreadMove(moveName: string): boolean {
  return KNOWN_SPREAD_MOVES.has(moveName);
}

// =============================================================================
// CalcResultsBlock
// =============================================================================

/**
 * Per-move damage result rows with min–max % bars, spread badge,
 * and OHKO/roll color coding.
 */
export function CalcResultsBlock({
  moves,
  moveCalcOutputs,
  defenderHp,
  gameType,
  foesAlive,
}: CalcResultsBlockProps) {
  const filled = moves
    .map((name, idx) => ({ name, idx }))
    .filter((m): m is { name: string; idx: number } => Boolean(m.name));

  // Count damage-dealing moves that have outputs
  const dmgMoves = filled.filter(({ idx }) => (moveCalcOutputs[idx] ?? null) !== null).length;
  const ohkoCount = filled.filter(({ idx }) => {
    const out = moveCalcOutputs[idx] ?? null;
    return out !== null && out.minPercent >= 100;
  }).length;

  return (
    <section className="cd-block cd-block-results">
      <div className="cd-block-head">
        <span className="cd-eyebrow">RESULTS</span>
        <span className="cd-results-summary">
          <b className={cn("font-mono text-xs", ohkoCount > 0 ? "text-emerald-500" : "text-muted-foreground")}>
            {ohkoCount}
          </b>
          <span className="text-muted-foreground font-mono text-xs">
            /{dmgMoves} OHKO
          </span>
        </span>
      </div>

      <div className="cd-results">
        {filled.map(({ name, idx }) => {
          const output = moveCalcOutputs[idx] ?? null;
          const moveData = getMoveData(name);
          const isStatus = moveData?.category === "Status";
          const spread = isSpreadMove(name);
          const spreadApplied =
            spread && gameType === "Doubles" && foesAlive >= 2;

          // Apply spread reduction to displayed percentages
          const rawMin = output?.minPercent ?? 0;
          const rawMax = output?.maxPercent ?? 0;
          const displayMin = spreadApplied ? rawMin * 0.75 : rawMin;
          const displayMax = spreadApplied ? rawMax * 0.75 : rawMax;

          const isOhko = displayMin >= 100;
          const isRoll = !isOhko && displayMax >= 100;
          const verdict = output ? getVerdict(displayMin, displayMax) : null;

          // Raw damage range from rolls array
          const rollsArr = output?.rolls ?? [];
          const dmgMin = rollsArr.length > 0 ? (rollsArr[0] ?? 0) : 0;
          const dmgMax = rollsArr.length > 0 ? (rollsArr[rollsArr.length - 1] ?? 0) : 0;

          return (
            <div
              key={idx}
              className={cn(
                "cd-result",
                isOhko && "cd-result--ohko",
                isRoll && "cd-result--roll"
              )}
            >
              {/* Left: type dot + name + BP + spread badge */}
              <div className="cd-result-l">
                <TypeDot t={moveData?.type ?? "Normal"} size={8} />
                <span className="cd-result-name">{name}</span>
                {!isStatus && (
                  <span className="cd-result-bp">
                    {moveData?.basePower || "—"}
                  </span>
                )}
                {spread && !isStatus && (
                  <span
                    className={cn(
                      "cd-spread-badge",
                      spreadApplied ? "cd-spread-badge--on" : "cd-spread-badge--off"
                    )}
                    title={
                      spreadApplied
                        ? "Spread move hitting 2 targets — damage reduced 25%."
                        : "Spread move, but only 1 target — damage at full power."
                    }
                  >
                    spread
                    <span className="cd-spread-mult">
                      {spreadApplied ? "−25%" : "full"}
                    </span>
                  </span>
                )}
              </div>

              {/* Bar + right readout — or status label */}
              {isStatus || !output ? (
                <div className="cd-result-status">status</div>
              ) : (
                <>
                  <div className="cd-result-bar">
                    <div
                      className="cd-result-fill"
                      style={{ width: `${Math.min(100, displayMax)}%` }}
                    />
                    <div
                      className="cd-result-fill-min"
                      style={{ width: `${Math.min(100, displayMin)}%` }}
                    />
                  </div>
                  <div className="cd-result-r">
                    <span className="cd-result-pct">
                      {displayMin.toFixed(1)}
                      <span className="text-muted-foreground">–</span>
                      {displayMax.toFixed(1)}
                      <span className="text-muted-foreground">%</span>
                    </span>
                    {defenderHp > 0 && (
                      <span className="cd-result-ko">
                        {dmgMin}–{dmgMax} / {defenderHp}
                      </span>
                    )}
                    {verdict && (
                      <span
                        className={cn(
                          "cd-verdict",
                          verdict === "OHKO" && "cd-verdict--ohko",
                          verdict === "2HKO" && "cd-verdict--2hko"
                        )}
                      >
                        {verdict}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {filled.length === 0 && (
          <p className="text-muted-foreground px-1 py-2 text-xs">
            No moves on this Pokémon yet.
          </p>
        )}
      </div>
    </section>
  );
}
