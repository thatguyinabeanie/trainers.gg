import { redirect } from "next/navigation";

import {
  getNotificationPreferences,
  listDmPreferences,
  getPublicDiscordHandle,
  ALL_DM_EVENT_TYPES,
  type DiscordDmEventType,
} from "@trainers/supabase";

import { createClient, getUser } from "@/lib/supabase/server";
import { DiscordDmPreferencesSection } from "@/components/settings/discord-dm-preferences-section";
import { NotificationPreferencesForm } from "./notification-preferences-form";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

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

  if (error) {
    console.error("[checkIsStaff] Failed to check staff status:", error);
    return false;
  }
  return (count ?? 0) > 0;
}

export default async function NotificationSettingsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in?redirect=/dashboard/settings/notifications");
  }

  const supabase = await createClient();

  const [preferences, isStaff, dmPreferenceRows, discordHandle, userRow] =
    await Promise.all([
      getNotificationPreferences(supabase, user.id).catch((err) => {
        console.error(
          "[NotificationSettings] Failed to load preferences:",
          err
        );
        return null;
      }),
      checkIsStaff(supabase, user.id),
      listDmPreferences(supabase, user.id).catch((err) => {
        console.error(
          "[NotificationSettings] Failed to load DM preferences:",
          err
        );
        return [];
      }),
      getPublicDiscordHandle(supabase, user.id).catch((err) => {
        console.error(
          "[NotificationSettings] Failed to load Discord handle:",
          err
        );
        return null;
      }),
      supabase
        .from("users")
        .select("discord_dm_warn_until")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error(
              "[NotificationSettings] Failed to load Discord DM warning state:",
              error
            );
            return null;
          }
          return data;
        }),
    ]);

  // Build a full preferences map with all 11 keys, defaulting missing rows to false
  const dmPreferences = Object.fromEntries(
    ALL_DM_EVENT_TYPES.map((eventType) => {
      const row = dmPreferenceRows.find((r) => r.event_type === eventType);
      return [eventType, row?.enabled ?? false];
    })
  ) as Record<DiscordDmEventType, boolean>;

  return (
    <DashboardContent>
      <div className="space-y-10">
      <NotificationPreferencesForm
        initialPreferences={preferences}
        isStaff={isStaff}
      />

      <div id="discord-dms" className="scroll-mt-20">
        <DiscordDmPreferencesSection
          discordHandle={discordHandle}
          initialPreferences={dmPreferences}
          discordDmWarnUntil={userRow?.discord_dm_warn_until ?? null}
        />
      </div>
      </div>
    </DashboardContent>
  );
}
