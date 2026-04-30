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
 * Numeric input popover body — slider-primary layout.
 * Large value readout + full-width slider as the primary control.
 * Optional hint text and preset chips below.
 * Clamps value to [min, max] on every change.
 */
export function NumberPicker({
  title,
  value,
  min,
  max,
  step = 1,
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
    <div className="bg-popover text-popover-foreground flex w-[320px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border shadow-md">
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

      {/* Value readout */}
      <div className="flex items-baseline justify-center gap-1 px-3 pt-4 pb-2">
        <span className="font-mono text-2xl font-semibold tabular-nums">
          {local}
        </span>
        <span className="text-muted-foreground font-mono text-sm tabular-nums">
          / {max}
        </span>
      </div>

      {/* Slider — primary control */}
      <div className="px-3 pb-3">
        <input
          type="range"
          value={local}
          min={min}
          max={max}
          step={step}
          onChange={(e) => clampAndEmit(Number(e.target.value))}
          className="accent-primary h-2 w-full cursor-pointer"
          style={{ height: "8px" }}
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
