import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isProfileComplete } from "@/app/onboarding/actions";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");

  // Handle OAuth error
  if (error) {
    return redirect(`/sign-in?error=${encodeURIComponent(error)}`);
  }

  // Exchange code for session
  if (code) {
    const supabase = await createClient();
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

    // Check if this is a new user or returning user with incomplete profile
    const profileComplete = await isProfileComplete();

    if (!profileComplete) {
      // Redirect to onboarding to complete profile
      return redirect(`${origin}/onboarding`);
    }

    // Redirect to the intended destination
    return redirect(`${origin}${next}`);
  }

  // No code provided, redirect to sign in
  return redirect("/sign-in");
}
