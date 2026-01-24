import type { Metadata } from "next";
import { ProfilePageClient } from "./profile-page-client";

interface ProfilePageProps {
  params: Promise<{ handle: string }>;
}

/**
 * Generate metadata for the profile page
 */
export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;

  return {
    title: `@${handle} | trainers.gg`,
    description: `View @${handle}'s profile on trainers.gg`,
  };
}

/**
 * Profile page - displays a Bluesky user's profile with their posts.
 *
 * This route handles:
 * - /profile/user.bsky.social (Bluesky handle)
 * - /profile/did:plc:xxxxx (DID)
 */
export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      <ProfilePageClient handle={handle} />
    </main>
  );
}
