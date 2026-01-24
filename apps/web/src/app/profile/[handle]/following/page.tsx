import type { Metadata } from "next";
import { FollowingPageClient } from "./following-page-client";

interface FollowingPageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({
  params,
}: FollowingPageProps): Promise<Metadata> {
  const { handle } = await params;
  const decodedHandle = decodeURIComponent(handle);

  return {
    title: `People followed by @${decodedHandle} | trainers.gg`,
    description: `See who @${decodedHandle} follows on trainers.gg`,
  };
}

export default async function FollowingPage({ params }: FollowingPageProps) {
  const { handle } = await params;
  const decodedHandle = decodeURIComponent(handle);

  return <FollowingPageClient handle={decodedHandle} />;
}
