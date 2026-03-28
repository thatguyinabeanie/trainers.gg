import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getNotificationPreferences } from "@trainers/supabase";
import { NotificationPreferencesForm } from "./notification-preferences-form";

export const metadata = {
  title: "Notification Settings — trainers.gg",
};

/**
 * Check if a user has any staff roles by looking at organization_staff membership.
 */
async function checkIsStaff(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("community_staff")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return false;
  return (count ?? 0) > 0;
}

export default async function NotificationSettingsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in?redirect=/dashboard/settings/notifications");
  }

  const supabase = await createClient();

  const [preferences, isStaff] = await Promise.all([
    getNotificationPreferences(supabase, user.id).catch(() => null),
    checkIsStaff(supabase, user.id),
  ]);

  return (
    <NotificationPreferencesForm
      initialPreferences={preferences}
      isStaff={isStaff}
    />
  );
}
