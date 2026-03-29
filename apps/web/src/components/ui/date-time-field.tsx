"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock } from "lucide-react";

// Common tournament start times for quick selection
const TIME_PRESETS = [
  { label: "9:00 AM", hours: 9, minutes: 0 },
  { label: "10:00 AM", hours: 10, minutes: 0 },
  { label: "11:00 AM", hours: 11, minutes: 0 },
  { label: "12:00 PM", hours: 12, minutes: 0 },
  { label: "1:00 PM", hours: 13, minutes: 0 },
  { label: "2:00 PM", hours: 14, minutes: 0 },
  { label: "3:00 PM", hours: 15, minutes: 0 },
  { label: "5:00 PM", hours: 17, minutes: 0 },
  { label: "6:00 PM", hours: 18, minutes: 0 },
  { label: "7:00 PM", hours: 19, minutes: 0 },
] as const;

/**
 * Formats a 24h value into a time string for <input type="time">.
 * e.g. (14, 30) => "14:30"
 */
function toTimeInputValue(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Formats hours/minutes into a 12h display string.
 * e.g. (14, 30) => "2:30 PM"
 */
function formatTime12h(hours: number, minutes: number): string {
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export interface DateTimeFieldProps {
  /** The label displayed above the field. */
  label: string;
  /** Helper text displayed below the field. */
  description: string;
  /** Unix timestamp in milliseconds, or undefined if no date is selected. */
  value?: number | string | null;
  /** Called when the date/time changes. Receives a timestamp (number) or ISO string depending on the variant. */
  onChange: (value: number | string | undefined) => void;
  /** Output format: "timestamp" returns epoch ms, "iso" returns ISO string. */
  outputFormat?: "timestamp" | "iso";
  /** Earliest selectable date. */
  minDate?: Date;
  /** Latest selectable date. */
  maxDate?: Date;
  /** Disables all interaction. */
  disabled?: boolean;
}

export function DateTimeField({
  label,
  description,
  value,
  onChange,
  outputFormat = "timestamp",
  minDate,
  maxDate,
  disabled,
}: DateTimeFieldProps) {
  const [open, setOpen] = React.useState(false);

  // Parse the incoming value into a Date
  const date = value ? new Date(value) : undefined;
  const hours = date ? date.getHours() : 12;
  const minutes = date ? date.getMinutes() : 0;

  // Emit value in the correct format
  const emit = (d: Date) => {
    if (outputFormat === "iso") {
      onChange(d.toISOString());
    } else {
      onChange(d.getTime());
    }
  };

  const handleDateSelect = (selected: Date | undefined) => {
    if (!selected) {
      onChange(undefined);
      return;
    }
    const newDate = new Date(selected);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    emit(newDate);
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(":").map(Number);
    if (h === undefined || m === undefined) return;
    const newDate = date ? new Date(date) : new Date();
    newDate.setHours(h);
    newDate.setMinutes(m);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    emit(newDate);
  };

  const handlePresetClick = (presetHours: number, presetMinutes: number) => {
    const newDate = date ? new Date(date) : new Date();
    newDate.setHours(presetHours);
    newDate.setMinutes(presetMinutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    emit(newDate);
  };

  const isPresetActive = (presetHours: number, presetMinutes: number) => {
    return hours === presetHours && minutes === presetMinutes;
  };

  const formatDisplay = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm leading-none font-medium select-none">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            "border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-9 w-full items-center justify-start gap-2 rounded-lg border px-3 py-2 text-sm font-normal whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px]",
            !date && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
          {date ? formatDisplay(date) : "Pick a date"}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={(d) => {
              // Compare dates only (ignore time) so same-day selection works
              const dayStart = new Date(
                d.getFullYear(),
                d.getMonth(),
                d.getDate()
              );
              if (minDate) {
                const minDay = new Date(
                  minDate.getFullYear(),
                  minDate.getMonth(),
                  minDate.getDate()
                );
                if (dayStart < minDay) return true;
              }
              if (maxDate) {
                const maxDay = new Date(
                  maxDate.getFullYear(),
                  maxDate.getMonth(),
                  maxDate.getDate()
                );
                if (dayStart > maxDay) return true;
              }
              return false;
            }}
            defaultMonth={date}
          />

          {/* Time selection */}
          <div className="border-border space-y-2.5 border-t p-3">
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground h-4 w-4 shrink-0" />
              <input
                type="time"
                value={toTimeInputValue(hours, minutes)}
                onChange={handleTimeInputChange}
                className={cn(
                  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50",
                  "h-8 rounded-lg border px-2 py-1 text-sm outline-none focus-visible:ring-[3px]"
                )}
              />
              <span className="text-muted-foreground text-xs">
                {formatTime12h(hours, minutes)}
              </span>
            </div>

            {/* Preset time slots in a compact grid */}
            <div className="grid grid-cols-5 gap-1">
              {TIME_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant={
                    isPresetActive(preset.hours, preset.minutes)
                      ? "default"
                      : "outline"
                  }
                  size="xs"
                  className="px-1 text-[11px]"
                  onClick={() =>
                    handlePresetClick(preset.hours, preset.minutes)
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="border-border flex justify-end gap-2 border-t p-2">
            {date && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                Clear
              </Button>
            )}
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
