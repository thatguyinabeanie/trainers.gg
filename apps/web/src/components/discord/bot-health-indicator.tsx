"use client";

import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BotHealthIndicatorProps {
  lastDeliveryAt: string | null;
  recentFailureCount: number;
  totalDeliveries24h: number;
}

function getHealthColor(lastDeliveryAt: string | null): string {
  if (!lastDeliveryAt) return "bg-red-500";

  const lastDelivery = new Date(lastDeliveryAt);
  const now = new Date();
  const diffMs = now.getTime() - lastDelivery.getTime();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  if (diffMs < oneHour) return "bg-green-500";
  if (diffMs < oneDay) return "bg-yellow-500";
  return "bg-red-500";
}

export function BotHealthIndicator({
  lastDeliveryAt,
  recentFailureCount,
  totalDeliveries24h,
}: BotHealthIndicatorProps) {
  const dotColor = getHealthColor(lastDeliveryAt);

  const timeText = lastDeliveryAt
    ? `Last active ${formatDistanceToNow(new Date(lastDeliveryAt), { addSuffix: true })}`
    : "No recent activity";

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className={cn("size-2.5 rounded-full", dotColor)} />
        <span className="text-muted-foreground text-sm">{timeText}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant="secondary">{totalDeliveries24h} delivered</Badge>
        {recentFailureCount > 0 && (
          <Badge variant="destructive">{recentFailureCount} failed</Badge>
        )}
      </div>
    </div>
  );
}
