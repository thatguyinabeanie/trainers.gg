"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Search, Building2 } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Link href="/tournaments/create">
        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Create Tournament
            </CardTitle>
            <Trophy className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">New</div>
            <p className="text-muted-foreground text-xs">
              Host your own tournament
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/tournaments">
        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Browse Tournaments
            </CardTitle>
            <Search className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Explore</div>
            <p className="text-muted-foreground text-xs">
              Find tournaments to join
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/teams">
        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manage Teams</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Teams</div>
            <p className="text-muted-foreground text-xs">
              Create and manage your teams
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/organizations">
        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Groups</div>
            <p className="text-muted-foreground text-xs">
              Join or create organizations
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
