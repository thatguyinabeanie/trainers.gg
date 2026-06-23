import { Suspense } from "react";
import { type Metadata } from "next";

import { TeamsLandingClient } from "@/components/team-builder/landing/teams-landing-client";

export const metadata: Metadata = {
  title: "Team Builder — trainers.gg",
  description:
    "Build competitive Pokémon teams with type coverage checks, speed tiers, and damage calculations — no account required.",
};

export default function BuilderPage() {
  return (
    <div className="h-full overflow-auto">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground text-sm">
              Loading teams...
            </div>
          </div>
        }
      >
        <TeamsLandingClient />
      </Suspense>
    </div>
  );
}
