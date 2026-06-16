/**
 * AT Protocol OAuth Callback Completion Page
 *
 * This page completes the sign-in flow for users who authenticated via Bluesky
 * and already have an account linked to their DID.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function AtprotoCallbackPage() {
  const cookieStore = await cookies();
  const did = cookieStore.get("atproto_did")?.value;

  if (!did) {
    // No DID cookie - redirect to sign-in
    redirect("/sign-in?error=missing_session");
  }

  // Use service-role client: the user is not authenticated yet at this point
  // (this is a pre-auth callback page), and anon SELECT on public.users is revoked.
  const supabase = createServiceRoleClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, username")
    .eq("did", did)
    .maybeSingle();

  if (!user) {
    // No user found with this DID - redirect to link page
    redirect("/auth/link-bluesky");
  }

  // Clear the DID cookie
  cookieStore.delete("atproto_did");

  // Fetch the user's email from auth.users (canonical source — email is no
  // longer stored in public.users).
  const { data: authUserData } = await supabase.auth.admin.getUserById(user.id);
  const email = authUserData?.user?.email ?? null;

  // For now, redirect to sign-in with a message that they need to use their email
  // In a future iteration, we could implement passwordless sign-in via magic link
  // or use a custom token-based approach with Supabase
  const emailParam = email ? `&email=${encodeURIComponent(email)}` : "";
  redirect(`/sign-in?message=bluesky_verified${emailParam}`);
}
