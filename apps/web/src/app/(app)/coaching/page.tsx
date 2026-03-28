import { ComingSoon } from "@/components/coming-soon";

export default function CoachingPage() {
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
