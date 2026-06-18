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

  // Clear the DID cookie. cookies().delete() can throw in a Server Component
  // render context (Next.js only allows cookie mutations in Server Actions /
  // route handlers) — swallow so a successful callback isn't turned into a 500.
  // The cookie is short-lived; if the write is refused here it expires on its own.
  try {
    cookieStore.delete("atproto_did");
  } catch {
    // Non-fatal — cookie mutation not permitted in this render context.
  }

  // Redirect to sign-in — let the user type their own email.
  // We intentionally do NOT emit the email in the redirect URL: it would
  // disclose the linked account's address to anyone who can observe the
  // redirect (browser history, referrer headers, proxy logs), and the
  // atproto_did cookie that gates this lookup is forgeable.
  redirect(`/sign-in?message=bluesky_verified`);
}
