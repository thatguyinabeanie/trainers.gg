import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";
import { isProfileComplete } from "./actions";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to sign-in if not authenticated
  if (!user) {
    redirect("/sign-in?redirect=/onboarding");
  }

  // Redirect to home if profile is already complete
  const profileComplete = await isProfileComplete();
  if (profileComplete) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <OnboardingForm />
    </div>
  );
}
