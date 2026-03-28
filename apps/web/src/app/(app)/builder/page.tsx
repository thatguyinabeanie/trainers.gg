import { ComingSoon } from "@/components/coming-soon";

export default function BuilderPage() {
  return (
    <ComingSoon
      emoji="⚔️"
      title="Builder"
      description="Build and share teams with current meta analytics at your fingertips."
      bullets={[
        "Type coverage checks and spread analysis",
        "Usage rates and win rates from public tournament data",
        "Popular cores and team archetypes",
      ]}
    />
  );
}
