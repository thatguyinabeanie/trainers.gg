"use client";

import {
  type GameFormat,
  type MetaSpeedEntry,
  ALL_TYPES,
  getAllItems,
  getLegalAbilities,
  getLegalItems,
  getLegalTeraTypes,
  getMetaSpeedTiers,
  getValidAbilities,
  getValidNatures,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import {
  type DefenderBoosts,
  type DefenderEvs,
  STATUS_MAP,
} from "./use-calc-state";

// =============================================================================
// Types
// =============================================================================

interface CalcDefenderFormProps {
  species: string;
  ability: string;
  item: string;
  nature: string;
  teraType: string;
  evs: DefenderEvs;
  boosts: DefenderBoosts;
  status: string;
  hpPercent: number;
  format: GameFormat | undefined;
  /** The user's team — surfaced as quick targets in the picker. */
  teammates: Tables<"pokemon">[];
  onSpeciesChange: (species: string) => void;
  onAbilityChange: (v: string) => void;
  onItemChange: (v: string) => void;
  onNatureChange: (v: string) => void;
  onTeraChange: (v: string) => void;
  onEvChange: (stat: keyof DefenderEvs, v: number) => void;
  onBoostChange: (stat: keyof DefenderBoosts, v: number) => void;
  onStatusChange: (v: string) => void;
  onHpPercentChange: (v: number) => void;
  /** Apply a "Meta default" preset for the given species. */
  onPresetMeta?: () => void;
  /** Apply a "Custom" preset (clears defender stats). */
  onPresetCustom?: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_OPTIONS = Object.keys(STATUS_MAP);
const ALL_ITEMS = getAllItems();
const STAT_ORDER: (keyof DefenderEvs)[] = [
  "hp",
  "atk",
  "def",
  "spa",
  "spd",
  "spe",
];
const STAT_LABELS: Record<keyof DefenderEvs, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Defender accordion content for the new CalcPanel — a compact form that fits
 * inside a 460px-wide rail.
 */
export function CalcDefenderForm({
  species,
  ability,
  item,
  nature,
  teraType,
  evs,
  boosts,
  status,
  hpPercent,
  format,
  teammates,
  onSpeciesChange,
  onAbilityChange,
  onItemChange,
  onNatureChange,
  onTeraChange,
  onEvChange,
  onBoostChange,
  onStatusChange,
  onHpPercentChange,
  onPresetMeta,
  onPresetCustom,
}: CalcDefenderFormProps) {
  // Build the target dropdown: Custom | Meta opponents | Team mates
  const meta: MetaSpeedEntry[] = format ? getMetaSpeedTiers(format.id) : [];

  const formatId = format?.id;
  const abilities = formatId
    ? Array.from(
        getLegalAbilities(species, formatId) ?? getValidAbilities(species)
      )
    : getValidAbilities(species);
  const natures = getValidNatures();

  const legalTera = formatId ? getLegalTeraTypes(formatId) : undefined;
  const teraOptions = legalTera
    ? ALL_TYPES.filter((t) => legalTera.has(t))
    : ALL_TYPES;
  const teraDisabled = legalTera !== undefined && legalTera.size === 0;

  const legalItemSet = formatId ? getLegalItems(formatId) : undefined;
  const itemOptions = legalItemSet
    ? ALL_ITEMS.filter((i) => legalItemSet.has(i))
    : ALL_ITEMS;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Target picker */}
      <Field label="Target">
        <select
          value={species}
          onChange={(e) => onSpeciesChange(e.target.value)}
          data-testid="calc-defender-target"
          className={selectClass}
        >
          <option value={species}>{species || "Custom"}</option>
          {meta.length > 0 && (
            <optgroup label="Meta">
              {meta.map((m) => (
                <option key={`meta-${m.species}`} value={m.displayName}>
                  {m.displayName}
                </option>
              ))}
            </optgroup>
          )}
          {teammates.length > 0 && (
            <optgroup label="Your team">
              {teammates.map((p) => (
                <option key={`team-${p.id}`} value={p.species}>
                  {p.species}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </Field>

      {/* Ability + Item */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Ability">
          <select
            value={ability}
            onChange={(e) => onAbilityChange(e.target.value)}
            className={selectClass}
          >
            <option value="">—</option>
            {abilities.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Item">
          <select
            value={item}
            onChange={(e) => onItemChange(e.target.value)}
            className={selectClass}
          >
            <option value="">—</option>
            {itemOptions.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Nature + Tera */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Nature">
          <select
            value={nature}
            onChange={(e) => onNatureChange(e.target.value)}
            className={selectClass}
          >
            {natures.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tera">
          {teraDisabled ? (
            <span className="text-muted-foreground px-1 py-1 text-xs">
              Not allowed
            </span>
          ) : (
            <select
              value={teraType}
              onChange={(e) => onTeraChange(e.target.value)}
              className={selectClass}
            >
              <option value="">None</option>
              {teraOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      {/* EVs grid */}
      <div>
        <CaptionLabel>EVs</CaptionLabel>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {STAT_ORDER.map((stat) => (
            <div key={stat} className="flex flex-col gap-0.5">
              <label className="text-muted-foreground text-[10px]">
                {STAT_LABELS[stat]}
              </label>
              <input
                type="number"
                min={0}
                max={252}
                value={evs[stat]}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v))
                    onEvChange(stat, Math.max(0, Math.min(252, v)));
                }}
                aria-label={`${STAT_LABELS[stat]} EV`}
                className={cn(
                  "border-border bg-background h-7 rounded border px-1 text-center text-xs tabular-nums",
                  "focus:ring-1 focus:ring-teal-500 focus:outline-none"
                )}
              />
            </div>
          ))}
        </div>
      </div>

      {/* HP slider */}
      <div>
        <div className="flex items-baseline justify-between">
          <CaptionLabel>HP</CaptionLabel>
          <span className="font-mono text-xs tabular-nums">{hpPercent}%</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          step={1}
          value={hpPercent}
          onChange={(e) => onHpPercentChange(Number(e.target.value))}
          aria-label="Defender HP percent"
          className="bg-muted mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full accent-emerald-500"
        />
      </div>

      {/* Status pills */}
      <div>
        <CaptionLabel>Status</CaptionLabel>
        <div className="mt-1 flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onStatusChange(s)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[10px] font-medium transition-colors duration-150",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {s.replace("Badly Poisoned", "Toxic")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Defender boost stages — Def + SpD steppers */}
      <div>
        <CaptionLabel>Boosts</CaptionLabel>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <Stepper
            label="Def"
            value={boosts.def}
            onChange={(v) => onBoostChange("def", v)}
          />
          <Stepper
            label="SpD"
            value={boosts.spd}
            onChange={(v) => onBoostChange("spd", v)}
          />
        </div>
      </div>

      {/* Presets */}
      {(onPresetMeta || onPresetCustom) && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {onPresetMeta && (
            <PresetButton onClick={onPresetMeta}>Meta default</PresetButton>
          )}
          {onPresetCustom && (
            <PresetButton onClick={onPresetCustom}>Custom</PresetButton>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Local primitives
// =============================================================================

const selectClass = cn(
  "border-border bg-background h-7 w-full rounded border px-1 text-xs",
  "focus:ring-1 focus:ring-teal-500 focus:outline-none"
);

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <CaptionLabel>{label}</CaptionLabel>
      {children}
    </div>
  );
}

function CaptionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {children}
    </span>
  );
}

interface StepperProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function Stepper({ label, value, onChange }: StepperProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground w-6 text-[11px] font-medium">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.max(-6, value - 1))}
        aria-label={`Decrease ${label} boost`}
        className="border-border hover:bg-muted size-6 rounded border text-xs"
      >
        −
      </button>
      <span
        className={cn(
          "min-w-[28px] text-center font-mono text-xs tabular-nums",
          value > 0 && "font-semibold text-emerald-600",
          value < 0 && "text-destructive font-semibold"
        )}
      >
        {value > 0 ? `+${value}` : value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(6, value + 1))}
        aria-label={`Increase ${label} boost`}
        className="border-border hover:bg-muted size-6 rounded border text-xs"
      >
        +
      </button>
    </div>
  );
}

interface PresetButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

function PresetButton({ children, onClick }: PresetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border hover:border-primary hover:text-primary bg-background rounded border px-2 py-1 text-[11px] font-medium transition-colors duration-150"
    >
      {children}
    </button>
  );
}
