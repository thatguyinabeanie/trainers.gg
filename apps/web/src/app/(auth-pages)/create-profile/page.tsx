"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { ensureAlt } from "@trainers/supabase";
import { useSupabaseMutation } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function CreateProfileForm() {
  const router = useRouter();
  const { user, loading, refetchUser } = useAuth();
  const { mutateAsync: ensureAltMutation, isLoading: isSubmitting } =
    useSupabaseMutation((supabase, _args: Record<string, never>) =>
      ensureAlt(supabase)
    );

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
      return;
    }

    if (user?.profile) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleCreateProfile = async () => {
    setError(null);

    try {
      await ensureAltMutation({});
      await refetchUser();
      router.push("/");
    } catch (err) {
      console.error("Profile creation error:", err);
      setError(err instanceof Error ? err.message : "Failed to create profile");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2" />
          <p className="text-muted-foreground mt-2 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="text-foreground mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Complete Your Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          We&apos;ll set up your trainer profile using your account information.
        </p>
      </div>

      <div className="bg-card mt-4 rounded-lg border p-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email ?? "Not provided"}</span>
          </div>
          {(user.user_metadata?.full_name || user.user_metadata?.name) && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">
                {(user.user_metadata?.full_name as string) ||
                  (user.user_metadata?.name as string)}
              </span>
            </div>
          )}
        </div>
        <p className="text-muted-foreground mt-4 text-xs">
          Your username will be generated automatically. You can change it later
          in settings.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <Button
        onClick={handleCreateProfile}
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Creating Profile..." : "Create Profile"}
      </Button>
    </div>
  );
}

function CreateProfileLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="bg-card w-full max-w-md space-y-6 rounded-lg border p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
          <p className="text-muted-foreground">Setting up your profile</p>
        </div>
      </div>
    </div>
  );
}

export default function CreateProfilePage() {
  return (
    <Suspense fallback={<CreateProfileLoading />}>
      <CreateProfileForm />
    </Suspense>
  );
}
