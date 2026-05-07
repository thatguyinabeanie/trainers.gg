"use client";

import { Hash, Mail, Shield, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DeliveryStats {
  channelMessages: number;
  dmsDelivered: number;
  roleSyncs: number;
  failures: number;
  period: string;
}

interface DeliveryStatsCardProps {
  stats: DeliveryStats;
}

export function DeliveryStatsCard({ stats }: DeliveryStatsCardProps) {
  const items = [
    {
      label: "Channel Messages",
      value: stats.channelMessages,
      icon: Hash,
      destructive: false,
    },
    {
      label: "DMs Delivered",
      value: stats.dmsDelivered,
      icon: Mail,
      destructive: false,
    },
    {
      label: "Role Syncs",
      value: stats.roleSyncs,
      icon: Shield,
      destructive: false,
    },
    {
      label: "Failures",
      value: stats.failures,
      icon: AlertTriangle,
      destructive: stats.failures > 0,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Delivery Stats — {stats.period}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="bg-muted/50 flex flex-col items-center gap-1 rounded-lg p-3"
            >
              <item.icon
                className={cn("size-4", item.destructive ? "text-destructive" : "text-muted-foreground")}
              />
              <span
                className={cn("text-2xl font-bold", item.destructive && "text-destructive")}
              >
                {item.value}
              </span>
              <span className="text-muted-foreground text-center text-xs">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
