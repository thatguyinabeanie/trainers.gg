/**
 * AT Protocol OAuth Callback Completion Page
 *
 * This page completes the sign-in flow for users who authenticated via Bluesky
 * and already have an account linked to their DID.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AtprotoCallbackPage() {
  const cookieStore = await cookies();
  const did = cookieStore.get("atproto_did")?.value;

  if (!did) {
    // No DID cookie - redirect to sign-in
    redirect("/sign-in?error=missing_session");
  }

  // Look up the user by DID
  const supabase = await createClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, email, username")
    .eq("did", did)
    .maybeSingle();

  if (!user) {
    // No user found with this DID - redirect to link page
    redirect("/auth/link-bluesky");
  }

  // Clear the DID cookie
  cookieStore.delete("atproto_did");

  // For now, redirect to sign-in with a message that they need to use their email
  // In a future iteration, we could implement passwordless sign-in via magic link
  // or use a custom token-based approach with Supabase
  const emailParam = user.email
    ? `&email=${encodeURIComponent(user.email)}`
    : "";
  redirect(`/sign-in?message=bluesky_verified${emailParam}`);
}
