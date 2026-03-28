import { ComingSoon } from "@/components/coming-soon";

export default function ComingSoonPage() {
  return (
    <ComingSoon
      emoji="🚧"
      title="Coming Soon"
      description="This feature is currently under development."
      bullets={[
        "We're working on something new",
        "Check back soon for updates",
        "Follow us for announcements",
      ]}
    />
  );
}
