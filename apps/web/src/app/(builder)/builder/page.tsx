import { Suspense } from "react";
import { type Metadata } from "next";

import { LocalBuilderWorkspace } from "@/components/team-builder/local-builder-workspace";

export const metadata: Metadata = {
  title: "Team Builder — trainers.gg",
  description:
    "Build competitive Pokémon teams with type coverage checks, speed tiers, and damage calculations — no account required.",
};

export default function BuilderPage() {
  return (
    <div className="h-full overflow-hidden">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground text-sm">
              Loading builder...
            </div>
          </div>
        }
      >
        <LocalBuilderWorkspace />
      </Suspense>
    </div>
  );
}
