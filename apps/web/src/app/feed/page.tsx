import { type Metadata } from "next";
import { FeedPageClient } from "./feed-page-client";

export const metadata: Metadata = {
  title: "Feed | trainers.gg",
  description: "Your Pokemon community feed from Bluesky",
};

export default function FeedPage() {
  return <FeedPageClient />;
}
