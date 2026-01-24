"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface RelativeTimeProps {
  date: string | Date;
  className?: string;
}

/**
 * Displays a relative time string (e.g., "5m", "2h", "3d").
 * Updates every minute for recent times.
 */
export function RelativeTime({ date, className }: RelativeTimeProps) {
  const [relativeTime, setRelativeTime] = useState(() =>
    formatRelativeTime(date)
  );

  useEffect(() => {
    // Update every minute for recent posts
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(date));
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [date]);

  const dateObj = typeof date === "string" ? new Date(date) : date;

  return (
    <time
      dateTime={dateObj.toISOString()}
      title={dateObj.toLocaleString()}
      className={cn("text-muted-foreground text-sm", className)}
    >
      {relativeTime}
    </time>
  );
}

/**
 * Format a date as a relative time string.
 */
function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return "now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks}w`;
  } else if (diffMonths < 12) {
    return `${diffMonths}mo`;
  } else {
    return `${diffYears}y`;
  }
}
