import type { Metadata } from "next";
import { FollowersPageClient } from "./followers-page-client";

interface FollowersPageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({
  params,
}: FollowersPageProps): Promise<Metadata> {
  const { handle } = await params;
  const decodedHandle = decodeURIComponent(handle);

  return {
    title: `People following @${decodedHandle} | trainers.gg`,
    description: `See who follows @${decodedHandle} on trainers.gg`,
  };
}

export default async function FollowersPage({ params }: FollowersPageProps) {
  const { handle } = await params;
  const decodedHandle = decodeURIComponent(handle);

  return <FollowersPageClient handle={decodedHandle} />;
}
