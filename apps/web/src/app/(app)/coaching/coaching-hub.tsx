import { PageContainer } from "@/components/layout/page-container";

/** Coaching hub landing — shown when the coaching feature flag is enabled. */
export function CoachingHub() {
  return (
    <PageContainer>
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Coaching</h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Find experienced coaches who know the meta and get personalized
          guidance to level up your game.
        </p>
      </div>
    </PageContainer>
  );
}
