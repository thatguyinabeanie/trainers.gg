import { Suspense } from "react";
import { redirect } from "next/navigation";
import { type Metadata } from "next";

import { LocalBuilderWorkspace } from "@/components/team-builder/local-builder-workspace";

export const metadata: Metadata = {
  title: "Team Builder — trainers.gg",
  description:
    "Build competitive Pokémon teams with type coverage checks, speed tiers, and damage calculations — no account required.",
};

export default async function BuilderTeamEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Phase 1 only handles local drafts. Numeric or account-team IDs are out of
  // scope and still live in the dashboard — redirect to the builder root.
  if (!id.startsWith("local-")) {
    redirect("/builder");
  }

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
        {/* key={id} forces a fresh mount per draft so useLocalDraft hydrates cleanly */}
        <LocalBuilderWorkspace draftId={id} key={id} />
      </Suspense>
    </div>
  );
}
