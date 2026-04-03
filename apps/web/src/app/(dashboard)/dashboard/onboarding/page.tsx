import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { needsOnboarding } from "@/lib/proxy-routes";
import { getUser } from "@/lib/supabase/server";

import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Complete Your Profile | trainers.gg",
  description: "Set up your trainer profile to get started",
};

export default async function DashboardOnboardingPage() {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in?redirect=/dashboard/onboarding");
  }

  // If user already has a permanent username, redirect to dashboard
  if (!needsOnboarding(user.user_metadata?.username)) {
    redirect("/dashboard/overview");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Welcome header */}
        <div className="mb-6 text-center">
          <div className="mb-3 text-3xl">👋</div>
          <h1 className="text-xl font-bold">Welcome, Trainer!</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Set up your profile to unlock the full experience
          </p>
        </div>

        {/* Benefit cards */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <div className="mb-1 text-lg">🏆</div>
            <div className="text-muted-foreground text-[11px]">
              Join tournaments
            </div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="mb-1 text-lg">🌐</div>
            <div className="text-muted-foreground text-[11px]">
              @you.trainers.gg
            </div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="mb-1 text-lg">📊</div>
            <div className="text-muted-foreground text-[11px]">
              Track stats &amp; ELO
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-xl border p-6">
          <h2 className="mb-1 text-base font-semibold">Set up your profile</h2>
          <p className="text-muted-foreground mb-5 text-sm">
            Choose your username and tell us about yourself
          </p>
          <OnboardingForm />
        </div>
      </div>
    </div>
  );
}
