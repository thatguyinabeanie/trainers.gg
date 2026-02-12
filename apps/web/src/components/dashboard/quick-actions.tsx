"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, UserPlus, BarChart3, Swords, Plus } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  const actions = [
    {
      label: "Join Tournament",
      description: "Find your next battle",
      href: "/tournaments",
      icon: Swords,
      variant: "default" as const,
      className: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    {
      label: "Create Alt",
      description: "New profile identity",
      href: "/dashboard/alts",
      icon: UserPlus,
      variant: "outline" as const,
    },
    {
      label: "Team Builder",
      description: "Build your roster",
      href: "/teams",
      icon: Plus,
      variant: "outline" as const,
    },
    {
      label: "Leaderboards",
      description: "Global rankings",
      href: "/leaderboards",
      icon: BarChart3,
      variant: "outline" as const,
    },
  ];

  return (
    <Card className="relative overflow-hidden">
      <div className="from-primary/5 absolute inset-0 bg-gradient-to-r via-transparent to-transparent" />
      <CardContent className="relative p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
            <Trophy className="text-primary size-4" />
          </div>
          <h3 className="font-semibold">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {actions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button
                variant={action.variant}
                className={`group h-auto w-full flex-col items-start gap-2 p-4 ${action.className || ""}`}
              >
                <div className="flex w-full items-center justify-between">
                  <action.icon className="size-5 transition-transform group-hover:scale-110" />
                </div>
                <div className="w-full text-left">
                  <p className="font-semibold">{action.label}</p>
                  <p className="text-xs opacity-80">{action.description}</p>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
