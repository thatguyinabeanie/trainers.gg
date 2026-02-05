"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoundTimerProps {
  startTime: string; // ISO timestamp
  durationMinutes: number;
  variant?: "compact" | "full";
  className?: string;
}

export function RoundTimer({
  startTime,
  durationMinutes,
  variant = "full",
  className,
}: RoundTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    const calculateRemaining = () => {
      const start = new Date(startTime).getTime();
      const end = start + durationMinutes * 60 * 1000;
      const now = Date.now();
      const remaining = Math.max(0, end - now);
      setTimeRemaining(remaining);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [startTime, durationMinutes]);

  if (timeRemaining === null) return null;

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  const isExpired = timeRemaining === 0;
  const isWarning = minutes < 5 && !isExpired;

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        isExpired && "text-red-600",
        isWarning && "animate-pulse text-amber-600",
        className
      )}
    >
      <Clock className="h-4 w-4" />
      {variant === "full" ? (
        <span className="font-medium">
          {isExpired ? (
            "Time Expired"
          ) : (
            <>
              {minutes}:{seconds.toString().padStart(2, "0")} remaining
            </>
          )}
        </span>
      ) : (
        <span className="text-sm">
          {isExpired ? "Expired" : `${minutes}m ${seconds}s`}
        </span>
      )}
    </div>
  );
}
