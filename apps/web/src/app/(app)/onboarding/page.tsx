import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Complete Your Profile | trainers.gg",
  description: "Set up your trainer profile to get started",
};

export default async function OnboardingPage() {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in?redirect=/onboarding");
  }

  // If user already has a permanent username, redirect to dashboard
  const username = user.user_metadata?.username as string | undefined;
  if (username && !username.startsWith("temp_") && !username.startsWith("user_")) {
    redirect("/dashboard/overview");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        {/* Welcome panel */}
        <div className="hidden w-[400px] shrink-0 bg-gradient-to-br from-teal-600 to-emerald-800 p-10 lg:flex lg:flex-col lg:justify-center">
          <h1 className="text-2xl font-bold text-white">Welcome, Trainer!</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            You&apos;re almost ready. Set up your profile to get started on
            trainers.gg.
          </p>
          <ul className="mt-8 space-y-4">
            <li className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs text-white">
                ✓
              </span>
              <span className="text-sm text-white/90">
                Join competitive tournaments
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs text-white">
                ✓
              </span>
              <span className="text-sm text-white/90">
                Get your @handle.trainers.gg identity
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs text-white">
                ✓
              </span>
              <span className="text-sm text-white/90">
                Track your stats and ELO rating
              </span>
            </li>
          </ul>
        </div>

        {/* Form panel */}
        <div className="flex flex-1 flex-col justify-center p-8 lg:p-10">
          {/* Mobile-only welcome header */}
          <div className="mb-6 lg:hidden">
            <h1 className="text-xl font-bold text-zinc-100">
              Welcome, Trainer!
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Set up your profile to get started
            </p>
          </div>

          {/* Desktop header */}
          <div className="mb-6 hidden lg:block">
            <h2 className="text-lg font-semibold text-zinc-100">
              Set up your profile
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Choose your username and tell us about yourself
            </p>
          </div>

          <OnboardingForm />
        </div>
      </div>
    </div>
  );
}
