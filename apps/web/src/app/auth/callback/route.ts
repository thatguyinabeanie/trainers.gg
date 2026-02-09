import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // Prefer explicit site URL for tunnel/proxy scenarios where request.url
  // may combine forwarded protocol (https) with internal host (localhost)
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");

  // Handle OAuth error
  if (error) {
    return redirect(`/sign-in?error=${encodeURIComponent(error)}`);
  }

  const supabase = await createClient();

  // Handle magic link verification (from Bluesky OAuth flow)
  if (tokenHash && type === "magiclink") {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });

    if (verifyError) {
      console.error("Magic link verification failed:", verifyError);
      return redirect(
        `/sign-in?error=${encodeURIComponent("Authentication failed")}`
      );
    }

    // Get the user after verification
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return redirect(
        `/sign-in?error=${encodeURIComponent("Authentication failed")}`
      );
    }

    return redirect(`${origin}${next}`);
  }

  // Handle OAuth code exchange (Google, Discord, etc.)
  if (code) {
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return redirect(
        `/sign-in?error=${encodeURIComponent("Authentication failed")}`
      );
    }

    // Verify user was created
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return redirect(
        `/sign-in?error=${encodeURIComponent("Authentication failed")}`
      );
    }

    // Redirect to the intended destination
    return redirect(`${origin}${next}`);
  }

  // No code or token provided, redirect to sign in
  return redirect("/sign-in");
}
