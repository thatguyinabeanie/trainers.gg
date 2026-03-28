import { ComingSoon } from "@/components/coming-soon";

export default function ArticlesPage() {
  return (
    <ComingSoon
      emoji="📝"
      title="Articles"
      description="Publish and discover guides, team reports, and tournament recaps."
      bullets={[
        "Write guides and team reports",
        "Use as private notes or share with the community",
        "Tournament recaps and strategy breakdowns",
      ]}
    />
  );
}
