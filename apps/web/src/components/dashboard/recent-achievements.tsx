"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Award, Star, Medal } from "lucide-react";
import Link from "next/link";

interface RecentAchievementsProps {
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
  }>;
}

export function RecentAchievements({ achievements }: RecentAchievementsProps) {
  const iconMap = {
    Trophy,
    Award,
    Star,
    Medal,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="size-5 text-amber-500" />
          <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Achievements
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {achievements.length === 0 ? (
          <div className="bg-muted/30 flex flex-col items-center justify-center rounded-lg py-12">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
              <Award className="text-muted-foreground size-6" />
            </div>
            <p className="text-muted-foreground mt-3 text-sm font-medium">
              No achievements yet
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Win battles to earn rewards
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {achievements.map((achievement) => {
                const Icon =
                  iconMap[achievement.icon as keyof typeof iconMap] || Trophy;
                return (
                  <div
                    key={achievement.id}
                    className="group bg-card hover:bg-accent/50 relative overflow-hidden rounded-lg p-3 transition-all"
                  >
                    {/* Shimmer effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                    <div className="relative flex items-center gap-3">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${achievement.color} bg-opacity-10`}
                      >
                        <Icon className={`size-5 ${achievement.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {achievement.title}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/achievements" className="mt-4 block">
              <Button
                variant="outline"
                size="sm"
                className="hover:border-primary hover:text-primary w-full font-semibold transition-all"
              >
                View All Achievements
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
