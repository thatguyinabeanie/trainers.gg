import { notFound, redirect } from "next/navigation";
import { type Metadata } from "next";

import { getUser, createServiceRoleClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

import { CoachProfileForm } from "./coach-profile-form";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Coach Profile — trainers.gg",
  description: "Edit your coaching profile",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CoachingDashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // createServiceRoleClient() — bypasses RLS/grants for the coach_profiles and
  // users base-table reads, which survive the upcoming REVOKE SELECT … FROM anon,
  // authenticated (Phase 2 Task 9, §0.2). Auth is already verified above via
  // getUser(); the queries are scoped to user.id so no cross-user data leaks.
  const supabase = createServiceRoleClient();

  // Fetch user's is_coach flag and their coach profile in parallel
  const [userRow, profileRow] = await Promise.all([
    supabase
      .from("users")
      .select("is_coach")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("coach_profiles")
      .select("headline, bio, formats, links, service_types")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  // Surface real DB/RLS failures (e.g. transient outage, RLS denial) so they
  // show up in observability tooling rather than silently 404'ing.
  if (userRow.error) {
    throw userRow.error;
  }
  if (profileRow.error) {
    throw profileRow.error;
  }

  if (!userRow.data?.is_coach) {
    notFound();
  }

  const profile = profileRow.data;

  // Coerce DB shape into CoachProfileInput defaults
  const initialValues = {
    headline: profile?.headline ?? "",
    bio: profile?.bio ?? "",
    formats: profile?.formats ?? [],
    links:
      (profile?.links as { label: string; url: string }[] | null) ?? [],
    serviceTypes:
      (profile?.service_types as
        | ("live" | "replay_review" | "team_review" | "mentorship")[]
        | null) ?? [],
  };

  return (
    <>
      <PageHeader title="Coach Profile" />
      <DashboardContent>
        <CoachProfileForm initial={initialValues} />
      </DashboardContent>
    </>
  );
}
