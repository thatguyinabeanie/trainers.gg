"use client";

import { cn } from "@/lib/utils";

import {
  type AttackerSideState,
  type DefenderSideState,
} from "../../use-calc-state";

// =============================================================================
// Types
// =============================================================================

interface CalcFieldBlockProps {
  gameType: "Doubles" | "Singles";
  setGameType: (v: "Doubles" | "Singles") => void;
  attackerSide: AttackerSideState;
  setAttackerSide: (patch: Partial<AttackerSideState>) => void;
  defenderSide: DefenderSideState;
  setDefenderSide: (patch: Partial<DefenderSideState>) => void;
  weather: string;
  setWeather: (v: string) => void;
  terrain: string;
  setTerrain: (v: string) => void;
  gravity: boolean;
  setGravity: (v: boolean) => void;
  foesAlive: 1 | 2;
  allyAlive: boolean;
  setFoesAlive: (v: 1 | 2) => void;
  setAllyAlive: (v: boolean) => void;
}

// =============================================================================
// Constants
// =============================================================================

/** @smogon/calc weather values — capitalized. */
const WEATHER_OPTIONS: { value: string; label: string }[] = [
  { value: "Sun", label: "Sun" },
  { value: "Rain", label: "Rain" },
  { value: "Sand", label: "Sand" },
  { value: "Snow", label: "Snow" },
];

/** @smogon/calc terrain values — capitalized. */
const TERRAIN_OPTIONS: { value: string; label: string }[] = [
  { value: "Grassy", label: "Grassy" },
  { value: "Electric", label: "Electric" },
  { value: "Psychic", label: "Psychic" },
  { value: "Misty", label: "Misty" },
];

// =============================================================================
// CalcFieldBlock
// =============================================================================

/**
 * Field condition block in the Calc Drawer.
 * Surfaces game type, side effects (tailwind, screens, helping hand, rocks),
 * foes/ally alive toggles (doubles only), weather, and terrain.
 */
export function CalcFieldBlock({
  gameType,
  setGameType,
  attackerSide,
  setAttackerSide,
  defenderSide,
  setDefenderSide,
  weather,
  setWeather,
  terrain,
  setTerrain,
  gravity,
  setGravity,
  foesAlive,
  allyAlive,
  setFoesAlive,
  setAllyAlive,
}: CalcFieldBlockProps) {
  return (
    <section className="cd-block">
      <div className="cd-block-head">
        <span className="cd-eyebrow">FIELD</span>
      </div>

      {/* Top toggle row: Doubles + side effects */}
      <div className="cd-toggles">
        <ToggleBtn
          active={gameType === "Doubles"}
          onClick={() =>
            setGameType(gameType === "Doubles" ? "Singles" : "Doubles")
          }
        >
          Doubles
        </ToggleBtn>
        <ToggleBtn
          active={attackerSide.tailwind}
          onClick={() => setAttackerSide({ tailwind: !attackerSide.tailwind })}
        >
          Tailwind
        </ToggleBtn>
        <ToggleBtn
          active={
            attackerSide.reflect ||
            attackerSide.lightScreen ||
            attackerSide.auroraVeil
          }
          onClick={() => {
            // Cycle: none → reflect+lightScreen → aurora veil → none
            const hasScreens =
              attackerSide.reflect || attackerSide.lightScreen;
            const hasVeil = attackerSide.auroraVeil;
            if (hasVeil) {
              setAttackerSide({ reflect: false, lightScreen: false, auroraVeil: false });
            } else if (hasScreens) {
              setAttackerSide({ reflect: false, lightScreen: false, auroraVeil: true });
            } else {
              setAttackerSide({ reflect: true, lightScreen: true, auroraVeil: false });
            }
          }}
        >
          Screens
        </ToggleBtn>
        <ToggleBtn
          active={attackerSide.helpingHand}
          onClick={() =>
            setAttackerSide({ helpingHand: !attackerSide.helpingHand })
          }
        >
          Help. Hand
        </ToggleBtn>
        <ToggleBtn
          active={defenderSide.stealthRock}
          onClick={() =>
            setDefenderSide({ stealthRock: !defenderSide.stealthRock })
          }
        >
          Rocks
        </ToggleBtn>
        <ToggleBtn
          active={gravity}
          onClick={() => setGravity(!gravity)}
        >
          Gravity
        </ToggleBtn>
      </div>

      {/* Doubles-only: foes alive + ally alive */}
      {gameType === "Doubles" && (
        <div
          className="cd-toggles"
          title="Foes alive affects spread move damage (-25% when hitting 2 targets)"
        >
          <span className="cd-toggle-lbl">Foes alive</span>
          <ToggleBtn
            active={foesAlive === 1}
            onClick={() => setFoesAlive(1)}
          >
            1
          </ToggleBtn>
          <ToggleBtn
            active={foesAlive === 2}
            onClick={() => setFoesAlive(2)}
          >
            2
          </ToggleBtn>
          <span className="cd-toggle-sep" />
          <span className="cd-toggle-lbl">Ally</span>
          <ToggleBtn
            active={allyAlive}
            onClick={() => setAllyAlive(!allyAlive)}
          >
            {allyAlive ? "alive" : "fainted"}
          </ToggleBtn>
        </div>
      )}

      {/* Weather row — clicking active clears it */}
      <div className="cd-toggles">
        <span className="cd-toggle-lbl">Weather</span>
        {WEATHER_OPTIONS.map(({ value, label }) => (
          <ToggleBtn
            key={value}
            active={weather === value}
            onClick={() => setWeather(weather === value ? "" : value)}
          >
            {label}
          </ToggleBtn>
        ))}
      </div>

      {/* Terrain row — clicking active clears it */}
      <div className="cd-toggles">
        <span className="cd-toggle-lbl">Terrain</span>
        {TERRAIN_OPTIONS.map(({ value, label }) => (
          <ToggleBtn
            key={value}
            active={terrain === value}
            onClick={() => setTerrain(terrain === value ? "" : value)}
          >
            {label}
          </ToggleBtn>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// ToggleBtn — local primitive
// =============================================================================

interface ToggleBtnProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToggleBtn({ active, onClick, children }: ToggleBtnProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "cd-toggle",
        active && "cd-toggle--on"
      )}
    >
      {children}
    </button>
  );
}
