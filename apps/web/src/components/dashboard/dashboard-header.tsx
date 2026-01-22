"use client";

import { useAuth } from "@/components/auth/auth-provider";

export function DashboardHeader() {
  const { user } = useAuth();

  return (
    <div className="mb-8">
      <h1 className="mb-2 text-3xl font-bold">
        Welcome back,{" "}
        {user?.profile?.displayName ||
          (user?.user_metadata?.full_name as string | undefined) ||
          (user?.user_metadata?.name as string | undefined) ||
          "Trainer"}
        !
      </h1>
      <p className="text-muted-foreground">
        Here&apos;s what&apos;s happening on trainers.gg
      </p>
    </div>
  );
}
