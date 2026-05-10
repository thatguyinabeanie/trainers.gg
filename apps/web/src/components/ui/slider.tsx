"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

interface SliderProps extends SliderPrimitive.Root.Props {
  /**
   * When true, the thumb uses `bg-current` (inherits CSS `color` from the
   * parent), the indicator track is transparent, and the track background
   * drops to transparent. Designed for the team-builder stats slider where
   * each row sets `color` to the stat-key color so all 6 sliders auto-paint.
   */
  inheritColor?: boolean;
  /**
   * When true (and `inheritColor` true), the thumb renders as a hollow ring
   * (background: var(--card), inset ring of currentColor) instead of a solid
   * filled circle. Drives the "EV value landed on a breakpoint" visual state.
   */
  atBump?: boolean;
  /**
   * Forwarded to the underlying SliderPrimitive.Thumb (which renders the
   * actual `role="slider"` element / hidden native `<input type="range">`).
   * Putting it on the Thumb means it ends up on the focusable element where
   * accessibility tools and Testing Library's `getByRole("slider", { name })`
   * expect it.
   */
  "aria-label"?: string;
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  inheritColor = false,
  atBump = false,
  "aria-label": ariaLabel,
  ...props
}: SliderProps) {
  // Normalize to array — Base UI always expects number[] for value/defaultValue.
  // When value is a single number, wrap it; when absent, fall back to defaultValue
  // (also normalized). Avoids the previous bug where a non-array value caused
  // _values to fall back to [min, max], rendering two thumbs at the extremes.
  // React Compiler handles memoization — no useMemo.
  const _values = Array.isArray(value)
    ? value
    : value !== undefined
      ? [value]
      : Array.isArray(defaultValue)
        ? defaultValue
        : defaultValue !== undefined
          ? [defaultValue]
          : [];

  const isControlled = value !== undefined;

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      data-inherit-color={inheritColor || undefined}
      data-at-bump={atBump || undefined}
      defaultValue={
        isControlled ? undefined : _values.length > 0 ? _values : undefined
      }
      value={isControlled ? _values : undefined}
      min={min}
      max={max}
      // inheritColor consumers (team-builder rows) want the thumb center to
      // sit at the value position (matches the bespoke `<input type="range">`
      // and the breakpoint bumps overlay which is positioned by value %).
      // Default consumers keep `edge` alignment so the thumb stays visually
      // inside the track at min/max.
      thumbAlignment={inheritColor ? "center" : "edge"}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={cn(
            "bg-muted relative grow overflow-hidden rounded-full select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1",
            // inheritColor consumers (team-builder rows) paint their own track
            // underneath (the 3px muted-foreground line), so we drop the
            // primitive's track background to avoid double-stacking.
            inheritColor && "bg-transparent"
          )}
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className={cn(
              "bg-primary select-none data-horizontal:h-full data-vertical:w-full",
              // No filled indicator range in inheritColor mode — the StatVizBar
              // above the slider already shows the invested amount.
              inheritColor && "bg-transparent"
            )}
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            data-at-bump={atBump || undefined}
            key={index}
            aria-label={ariaLabel}
            className={cn(
              "border-ring ring-ring/50 relative block size-3 shrink-0 rounded-full border bg-white transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-[3px] focus-visible:ring-[3px] focus-visible:outline-hidden active:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
              // currentColor mode: thumb fills with the row's color (HP=red,
              // Atk=orange, Def=yellow, SpA=blue, SpD=green, Spe=purple) via
              // the row's `color` class flowing through `bg-current` /
              // `border-current` here.
              inheritColor &&
                !atBump &&
                "bg-current border-transparent ring-current/30",
              // hollow-ring "at breakpoint" state: card-background fill with
              // an inset ring of the row's color.
              inheritColor &&
                atBump &&
                "bg-card border-current border-2 ring-current/30"
            )}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
