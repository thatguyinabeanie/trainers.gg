"use client";

import { type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TournamentTabsProps {
  description: string | null;
  scheduleCard: ReactNode;
  formatCard: ReactNode;
}

export function TournamentTabs({
  description,
  scheduleCard,
  formatCard,
}: TournamentTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="bracket">Bracket</TabsTrigger>
        <TabsTrigger value="standings">Standings</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Description */}
        {description && (
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Schedule - passed as ReactNode from server */}
        {scheduleCard}

        {/* Format - passed as ReactNode from server */}
        {formatCard}
      </TabsContent>

      <TabsContent value="bracket">
        <Card>
          <CardHeader>
            <CardTitle>Bracket</CardTitle>
            <CardDescription>Tournament bracket visualization</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-8 text-center">
              Bracket will be available once the tournament begins
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="standings">
        <Card>
          <CardHeader>
            <CardTitle>Standings</CardTitle>
            <CardDescription>Current tournament standings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-8 text-center">
              Standings will appear once the tournament begins
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
