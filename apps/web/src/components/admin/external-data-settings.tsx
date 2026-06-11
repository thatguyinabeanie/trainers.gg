"use client";

import { Loader2, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

export interface ExternalDataSettingsProps {
  tab: "rk9" | "limitless";
  loading: boolean;
  backendOn: boolean;
  onToggleBackend: (checked: boolean) => void;
  // RK9 throughput
  teamsPerTick?: number;
  onTeamsPerTickChange?: (v: string) => void;
  onTeamsPerTickBlur?: () => void;
  concurrency?: number;
  onConcurrencyChange?: (v: string) => void;
  onConcurrencyBlur?: () => void;
  // Limitless throughput
  batchSize?: number;
  onBatchSizeChange?: (v: string) => void;
  onBatchSizeBlur?: () => void;
  // shared
  intervalSeconds: number;
  onIntervalChange: (v: string) => void;
  onIntervalBlur: () => void;
}

const NUM_INPUT =
  "h-7 w-16 px-1 text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** Settings popover holding the Backend auto-import toggle + throughput config. */
export function ExternalDataSettings(props: ExternalDataSettingsProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm" aria-label="Import settings">
            <Settings className="size-4" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72 space-y-3">
        <label className="flex items-center justify-between text-sm font-medium">
          <span>Backend auto-import</span>
          {props.loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Switch
              checked={props.backendOn}
              onCheckedChange={props.onToggleBackend}
            />
          )}
        </label>
        <p className="text-muted-foreground text-xs">
          Imports run automatically via the site cron (every 5 min). The
          interval setting is the minimum seconds between runs per source.
        </p>

        {props.tab === "rk9" ? (
          <>
            <SettingRow label="Teams / tick">
              <Input
                type="number"
                min={1}
                className={NUM_INPUT}
                value={props.teamsPerTick}
                onChange={(e) => props.onTeamsPerTickChange?.(e.target.value)}
                onBlur={props.onTeamsPerTickBlur}
              />
            </SettingRow>
            <SettingRow label="Concurrency">
              <Input
                type="number"
                min={1}
                max={10}
                className={NUM_INPUT}
                value={props.concurrency}
                onChange={(e) => props.onConcurrencyChange?.(e.target.value)}
                onBlur={props.onConcurrencyBlur}
              />
            </SettingRow>
          </>
        ) : (
          <SettingRow label="Tourneys / tick">
            <Input
              type="number"
              min={1}
              className={NUM_INPUT}
              value={props.batchSize}
              onChange={(e) => props.onBatchSizeChange?.(e.target.value)}
              onBlur={props.onBatchSizeBlur}
            />
          </SettingRow>
        )}

        <SettingRow label="Interval (s)">
          <Input
            type="number"
            min={10}
            step={10}
            className={NUM_INPUT}
            value={props.intervalSeconds}
            onChange={(e) => props.onIntervalChange(e.target.value)}
            onBlur={props.onIntervalBlur}
          />
        </SettingRow>
      </PopoverContent>
    </Popover>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </div>
  );
}
