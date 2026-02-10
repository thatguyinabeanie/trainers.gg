import { type LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  /** Card heading */
  title: string;
  /** Primary metric value (number or pre-formatted string) */
  value: string | number;
  /** Optional secondary description shown below the value */
  description?: string;
  /** Optional Lucide icon rendered in the card header */
  icon?: LucideIcon;
  /** Optional trend indicator */
  trend?: {
    direction: "up" | "down";
    value: string;
  };
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="text-muted-foreground h-4 w-4" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="mt-1 flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.direction === "up" ? "text-emerald-600" : "text-red-600"
                )}
              >
                {trend.direction === "up" ? "\u2191" : "\u2193"} {trend.value}
              </span>
            )}
            {description && (
              <CardDescription className="text-xs">
                {description}
              </CardDescription>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
