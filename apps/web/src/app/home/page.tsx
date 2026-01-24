import { redirect } from "next/navigation";

// Redirect /home to root where the feed now lives
export default function HomeLegacyPage() {
  redirect("/");
}
