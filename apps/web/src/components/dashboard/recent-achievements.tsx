"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trophy, Award, Star } from "lucide-react";
import Link from "next/link";
import { type DashboardAchievement } from "@/lib/types/dashboard";

interface RecentAchievementsProps {
  achievements: DashboardAchievement[];
}

const iconMap = {
  Trophy,
  Award,
  Star,
} as const;

export function RecentAchievements({ achievements }: RecentAchievementsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Achievements</CardTitle>
      </CardHeader>
      <CardContent>
        {achievements.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Complete tournaments to earn achievements
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {achievements.map((achievement) => {
                const Icon = iconMap[achievement.icon] || Trophy;
                return (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className={achievement.color}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{achievement.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link
              href="/achievements"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "mt-4 w-full"
              )}
            >
              View All Achievements
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
