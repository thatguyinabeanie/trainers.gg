"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
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
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock, Lightbulb } from "lucide-react";
import type { TournamentFormData } from "@trainers/tournaments/types";

interface TournamentScheduleProps {
  formData: TournamentFormData;
  updateFormData: (updates: Partial<TournamentFormData>) => void;
}

interface DateTimeFieldProps {
  label: string;
  description: string;
  value?: number;
  onChange: (timestamp: number | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
}

function DateTimeField({
  label,
  description,
  value,
  onChange,
  minDate,
  maxDate,
}: DateTimeFieldProps) {
  const [open, setOpen] = React.useState(false);

  const date = value ? new Date(value) : undefined;
  const hours = date ? date.getHours() : 12;
  const minutes = date ? date.getMinutes() : 0;

  const handleDateSelect = (selected: Date | undefined) => {
    if (!selected) {
      onChange(undefined);
      return;
    }
    const newDate = new Date(selected);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    onChange(newDate.getTime());
  };

  const handleTimeChange = (type: "hours" | "minutes", val: string) => {
    const numVal = parseInt(val, 10);
    const newDate = date ? new Date(date) : new Date();

    if (type === "hours") {
      newDate.setHours(numVal);
    } else {
      newDate.setMinutes(numVal);
    }

    onChange(newDate.getTime());
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

  const hoursOptions = Array.from({ length: 24 }, (_, i) => i);
  const minutesOptions = [0, 15, 30, 45];

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-9 w-full items-center justify-start gap-2 rounded-lg border px-3 py-2 text-sm font-normal whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px]",
            !date && "text-muted-foreground"
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
              if (minDate && d < minDate) return true;
              if (maxDate && d > maxDate) return true;
              return false;
            }}
            defaultMonth={date}
          />

          <div className="border-border flex items-center gap-2 border-t p-3">
            <Clock className="text-muted-foreground h-4 w-4" />
            <Select
              value={hours.toString()}
              onValueChange={(val) => val && handleTimeChange("hours", val)}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hoursOptions.map((h) => (
                  <SelectItem key={h} value={h.toString()}>
                    {h.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select
              value={minutes.toString()}
              onValueChange={(val) => val && handleTimeChange("minutes", val)}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minutesOptions.map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {m.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
      <FieldDescription>{description}</FieldDescription>
    </Field>
  );
}

export function TournamentSchedule({
  formData,
  updateFormData,
}: TournamentScheduleProps) {
  const startDate = formData.startDate
    ? new Date(formData.startDate)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DateTimeField
          label="Start Date & Time"
          description="When the tournament begins"
          value={formData.startDate}
          onChange={(timestamp) => updateFormData({ startDate: timestamp })}
        />

        <DateTimeField
          label="End Date & Time"
          description="Expected end time (optional)"
          value={formData.endDate}
          onChange={(timestamp) => updateFormData({ endDate: timestamp })}
          minDate={startDate}
        />
      </div>

      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertTitle>Schedule Tips</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>All dates can be updated later from tournament management</li>
            <li>Registration closes when the tournament starts</li>
            <li>Consider time zones for online tournaments</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
