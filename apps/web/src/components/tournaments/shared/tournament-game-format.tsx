"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TournamentGameFormatProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}

const formatOptions = [
  "VGC 2025",
  "VGC 2024 Regulation H",
  "VGC 2024 Regulation G",
  "Custom Format",
];

export function TournamentGameFormat({
  value,
  onChange,
  disabled = false,
}: TournamentGameFormatProps) {
  return (
    <Field>
      <FieldLabel htmlFor="format">Game Format</FieldLabel>
      <Select
        value={value}
        onValueChange={(v) => onChange(v || undefined)}
        disabled={disabled}
      >
        <SelectTrigger id="format" className="w-full max-w-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {formatOptions.map((format) => (
            <SelectItem key={format} value={format}>
              {format}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
