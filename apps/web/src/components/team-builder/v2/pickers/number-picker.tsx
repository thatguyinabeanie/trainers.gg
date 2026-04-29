"use client";

import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface NumberPickerProps {
  title: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  hint?: string;
  onChange: (val: number) => void;
  onClose: () => void;
}

// =============================================================================
// NumberPicker
// =============================================================================

/**
 * Numeric input popover body — slider + numeric input + +/- buttons + optional hint.
 * Clamps value to [min, max] on every change.
 */
export function NumberPicker({
  title,
  value,
  min,
  max,
  step = 1,
  suffix,
  hint,
  onChange,
  onClose,
}: NumberPickerProps) {
  const [local, setLocal] = useState(value);

  function clampAndEmit(raw: number) {
    if (Number.isNaN(raw)) return;
    const clamped = Math.max(min, Math.min(max, raw));
    setLocal(clamped);
    onChange(clamped);
  }

  const presets = [0, 4, 84, 132, 252].filter((p) => p >= min && p <= max);

  return (
    <div className="bg-popover text-popover-foreground flex w-60 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
          {title}
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

      {/* Value row */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <button
          type="button"
          aria-label="Decrease"
          onClick={() => clampAndEmit(local - step)}
          className="bg-muted hover:bg-muted/70 flex size-7 shrink-0 items-center justify-center rounded border text-sm font-bold"
        >
          −
        </button>
        <input
          type="number"
          value={local}
          min={min}
          max={max}
          step={step}
          onChange={(e) => clampAndEmit(Number(e.target.value))}
          className="bg-background min-w-0 flex-1 rounded border px-2 py-1 text-center font-mono text-sm outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          aria-label="Increase"
          onClick={() => clampAndEmit(local + step)}
          className="bg-muted hover:bg-muted/70 flex size-7 shrink-0 items-center justify-center rounded border text-sm font-bold"
        >
          +
        </button>
        {suffix && (
          <span className="text-muted-foreground shrink-0 text-xs">{suffix}</span>
        )}
      </div>

      {/* Slider */}
      <div className="px-3 py-2">
        <input
          type="range"
          value={local}
          min={min}
          max={max}
          step={step}
          onChange={(e) => clampAndEmit(Number(e.target.value))}
          className="accent-primary w-full"
        />
      </div>

      {/* Hint */}
      {hint && (
        <p className="text-muted-foreground px-3 pb-2 text-[10.5px]">{hint}</p>
      )}

      {/* Preset chips */}
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t px-3 py-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => clampAndEmit(p)}
              className="bg-muted hover:border-primary rounded border px-2 py-0.5 font-mono text-[10.5px] transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
