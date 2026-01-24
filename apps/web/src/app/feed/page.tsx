import { redirect } from "next/navigation";

// Redirect /feed to home page where the feed now lives
export default function FeedPage() {
  redirect("/");
}
