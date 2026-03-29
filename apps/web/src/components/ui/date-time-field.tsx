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

// Time slots shown as the primary time picker
const TIME_SLOTS = [
  { label: "9 AM", hours: 9, minutes: 0 },
  { label: "10 AM", hours: 10, minutes: 0 },
  { label: "11 AM", hours: 11, minutes: 0 },
  { label: "12 PM", hours: 12, minutes: 0 },
  { label: "1 PM", hours: 13, minutes: 0 },
  { label: "2 PM", hours: 14, minutes: 0 },
  { label: "3 PM", hours: 15, minutes: 0 },
  { label: "4 PM", hours: 16, minutes: 0 },
  { label: "5 PM", hours: 17, minutes: 0 },
  { label: "6 PM", hours: 18, minutes: 0 },
  { label: "7 PM", hours: 19, minutes: 0 },
  { label: "8 PM", hours: 20, minutes: 0 },
] as const;

function toTimeInputValue(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export interface DateTimeFieldProps {
  label: string;
  description: string;
  value?: number | string | null;
  onChange: (value: number | string | undefined) => void;
  outputFormat?: "timestamp" | "iso";
  minDate?: Date;
  maxDate?: Date;
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
  const [showCustomTime, setShowCustomTime] = React.useState(false);

  const date = value ? new Date(value) : undefined;
  const hours = date ? date.getHours() : 12;
  const minutes = date ? date.getMinutes() : 0;

  // Check if current time matches any preset
  const isCustomTime =
    date !== undefined &&
    !TIME_SLOTS.some((s) => s.hours === hours && s.minutes === minutes);

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

  const handleSlotClick = (slotHours: number, slotMinutes: number) => {
    const newDate = date ? new Date(date) : new Date();
    newDate.setHours(slotHours);
    newDate.setMinutes(slotMinutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    emit(newDate);
    setShowCustomTime(false);
  };

  const handleCustomTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(":").map(Number);
    if (h === undefined || m === undefined) return;
    const newDate = date ? new Date(date) : new Date();
    newDate.setHours(h);
    newDate.setMinutes(m);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    emit(newDate);
  };

  const isSlotActive = (slotHours: number, slotMinutes: number) => {
    return hours === slotHours && minutes === slotMinutes;
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
          {/* Calendar + time side by side on wider screens, stacked on narrow */}
          <div className="flex">
            {/* Left: Calendar */}
            <div>
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                disabled={(d) => {
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

              {/* Footer: clear + done */}
              <div className="flex justify-end gap-2 px-3 pb-3">
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
            </div>

            {/* Right: Time slots as a scrollable list */}
            <div className="border-border flex w-28 flex-col border-l">
              <div className="text-muted-foreground flex items-center gap-1.5 px-3 pt-3 pb-2 text-xs font-medium">
                <Clock className="h-3 w-3" />
                Time
              </div>
              <div className="flex-1 overflow-y-auto px-1.5 pb-1.5">
                <div className="flex flex-col gap-0.5">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot.label}
                      type="button"
                      onClick={() => handleSlotClick(slot.hours, slot.minutes)}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        isSlotActive(slot.hours, slot.minutes)
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      {slot.label}
                    </button>
                  ))}
                  {/* Custom time option */}
                  {!showCustomTime && !isCustomTime && (
                    <button
                      type="button"
                      onClick={() => setShowCustomTime(true)}
                      className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-2 py-1.5 text-left text-sm transition-colors"
                    >
                      Custom...
                    </button>
                  )}
                  {(showCustomTime || isCustomTime) && (
                    <div className="px-1 pt-1">
                      <input
                        type="time"
                        value={toTimeInputValue(hours, minutes)}
                        onChange={handleCustomTimeChange}
                        className={cn(
                          "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50",
                          "h-8 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-[3px]",
                          isCustomTime && "border-primary"
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
