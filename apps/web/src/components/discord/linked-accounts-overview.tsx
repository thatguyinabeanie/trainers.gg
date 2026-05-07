"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface LinkedAccountsOverviewProps {
  totalMembers: number | null;
  linkedCount: number;
  communitySlug: string;
}

export function LinkedAccountsOverview({
  totalMembers,
  linkedCount,
}: LinkedAccountsOverviewProps) {
  const percentage =
    totalMembers && totalMembers > 0
      ? Math.round((linkedCount / totalMembers) * 100)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5" />
          Account Linking
        </CardTitle>
        <CardDescription>
          Members who linked their Discord to trainers.gg.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              {linkedCount} of {totalMembers ?? "?"} members linked
            </span>
            {percentage !== null && (
              <Badge variant="secondary">{percentage}%</Badge>
            )}
          </div>
          <div className="bg-muted h-2 w-full rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${percentage ?? 0}%` }}
            />
          </div>
        </div>

        {/* Hint when no one has linked */}
        {linkedCount === 0 && (
          <p className="text-muted-foreground text-sm">
            Encourage members to run{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">/link</code>{" "}
            in your server to connect their accounts.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
