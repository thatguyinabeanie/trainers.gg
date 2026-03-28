import { ComingSoon } from "@/components/coming-soon";

export default function AnalyticsPage() {
  return (
    <ComingSoon
      emoji="📊"
      title="Meta Analytics"
      description="Track what's winning and what's trending across tournaments."
      bullets={[
        "Usage rates, win rates, and popular cores",
        "Format-specific meta snapshots",
        "Data from publicly played tournament teams",
      ]}
    />
  );
}
