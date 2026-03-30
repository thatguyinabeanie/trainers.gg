import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  getNotifications,
  getUnreadNotificationCount,
  getNotificationCount,
} from "@trainers/supabase";
import { NotificationCenter } from "../notifications/notification-center";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata = {
  title: "Inbox — trainers.gg",
};

export default async function InboxPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in?redirect=/dashboard/inbox");
  }

  const supabase = await createClient();

  // Load initial data for the default "All" tab
  const [notifications, totalCount, unreadCount] = await Promise.all([
    getNotifications(supabase, { limit: 20, offset: 0 }).catch(() => []),
    getNotificationCount(supabase).catch(() => 0),
    getUnreadNotificationCount(supabase).catch(() => 0),
  ]);

  return (
    <>
      <PageHeader title="Inbox" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <NotificationCenter
          initialNotifications={notifications}
          initialTotalCount={totalCount}
          initialUnreadCount={unreadCount}
        />
      </div>
    </>
  );
}
