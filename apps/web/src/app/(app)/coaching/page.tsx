import { getUserId } from "@/lib/supabase/server";
import {
  checkFeatureAccess,
  isCoachingPublic,
} from "@/lib/feature-flags/check-flag";
import { ComingSoon } from "@/components/coming-soon";
import { CoachingHub } from "./coaching-hub";

export default async function CoachingPage() {
  const userId = await getUserId();
  const allowed = userId
    ? await checkFeatureAccess("coaching", userId)
    : await isCoachingPublic();
  if (!allowed) {
    return (
      <ComingSoon
        emoji="🎓"
        title="Coaching"
        description="Find and connect with coaches who know the meta."
        bullets={[
          "Coaches identified by badge in the player directory",
          "Book sessions and share teams for prep",
          "Personalized guidance from experienced players",
        ]}
      />
    );
  }
  return <CoachingHub />;
}
