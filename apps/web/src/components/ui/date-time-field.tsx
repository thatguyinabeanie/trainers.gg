"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock } from "lucide-react";

/** Convert 24h hours to 12h display hour (1-12). */
function to12Hour(h: number): number {
  return h % 12 || 12;
}

/** Convert 12h hour + period back to 24h. */
function to24Hour(h12: number, period: "AM" | "PM"): number {
  if (period === "AM") return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 15, 30, 45];

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

  const date = value ? new Date(value) : undefined;
  const hours24 = date ? date.getHours() : 12;
  const minutes = date ? date.getMinutes() : 0;
  const hour12 = to12Hour(hours24);
  const period: "AM" | "PM" = hours24 >= 12 ? "PM" : "AM";

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
    newDate.setHours(hours24);
    newDate.setMinutes(minutes);
    emit(newDate);
  };

  const handleHourChange = (val: string | null) => {
    if (!val) return;
    const h12 = parseInt(val, 10);
    const newDate = date ? new Date(date) : new Date();
    newDate.setHours(to24Hour(h12, period));
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    emit(newDate);
  };

  const handleMinuteChange = (val: string | null) => {
    if (!val) return;
    const m = parseInt(val, 10);
    const newDate = date ? new Date(date) : new Date();
    newDate.setHours(hours24);
    newDate.setMinutes(m);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    emit(newDate);
  };

  const handlePeriodChange = (newPeriod: "AM" | "PM") => {
    if (newPeriod === period) return;
    const newDate = date ? new Date(date) : new Date();
    newDate.setHours(to24Hour(hour12, newPeriod));
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    emit(newDate);
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

          {/* Time: hour (1-12) + minute + AM/PM */}
          <div className="border-border flex items-center justify-center gap-2 border-t p-3">
            <Clock className="text-muted-foreground h-4 w-4 shrink-0" />
            <Select value={hour12.toString()} onValueChange={handleHourChange}>
              <SelectTrigger size="sm" className="w-[52px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS_12.map((h) => (
                  <SelectItem key={h} value={h.toString()}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-sm">:</span>
            <Select
              value={minutes.toString()}
              onValueChange={handleMinuteChange}
            >
              <SelectTrigger size="sm" className="w-[52px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINUTES.map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {m.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ButtonGroup>
              <Button
                type="button"
                size="xs"
                variant={period === "AM" ? "default" : "outline"}
                onClick={() => handlePeriodChange("AM")}
              >
                AM
              </Button>
              <Button
                type="button"
                size="xs"
                variant={period === "PM" ? "default" : "outline"}
                onClick={() => handlePeriodChange("PM")}
              >
                PM
              </Button>
            </ButtonGroup>
          </div>

          {/* Actions */}
          <div className="border-border flex justify-center gap-2 border-t p-2">
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
