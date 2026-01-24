/**
 * Link Bluesky Account Page
 *
 * This page is shown when a user authenticates via Bluesky but doesn't have
 * an existing account linked to their DID. They can either:
 * 1. Create a new account
 * 2. Link to an existing account by signing in
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LinkBlueskyClient } from "./link-bluesky-client";

interface LinkBlueskyPageProps {
  searchParams: Promise<{
    returnUrl?: string;
  }>;
}

export default async function LinkBlueskyPage({
  searchParams,
}: LinkBlueskyPageProps) {
  const cookieStore = await cookies();
  const did = cookieStore.get("atproto_did")?.value;
  const { returnUrl } = await searchParams;

  if (!did) {
    // No DID cookie - redirect to sign-in
    redirect("/sign-in?error=missing_bluesky_session");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <LinkBlueskyClient did={did} returnUrl={returnUrl} />
    </div>
  );
}
