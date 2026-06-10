import { cacheLife, cacheTag } from "next/cache";

import { getActiveAnnouncements } from "@trainers/supabase";
import { getErrorMessage } from "@trainers/utils";

import { CacheTags } from "@/lib/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Info, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";

const typeConfig = {
  info: {
    bg: "bg-blue-500/10 border-blue-500/20",
    text: "text-blue-700 dark:text-blue-300",
    icon: Info,
  },
  warning: {
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
    icon: AlertTriangle,
  },
  error: {
    bg: "bg-red-500/10 border-red-500/20",
    text: "text-red-700 dark:text-red-300",
    icon: XCircle,
  },
  success: {
    bg: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
} as const;

async function getCachedAnnouncements() {
  "use cache";
  cacheTag(CacheTags.ANNOUNCEMENTS);
  cacheLife("minutes");

  const supabase = createStaticClient();
  return getActiveAnnouncements(supabase);
}

/**
 * Server component that fetches and displays active announcements.
 * Placed in the root layout, above the main content.
 *
 * Uses 'use cache' with cacheTag(CacheTags.ANNOUNCEMENTS) + cacheLife("minutes")
 * for on-demand invalidation via invalidateAnnouncementCaches().
 */
export async function AnnouncementBanner() {
  let announcements: Awaited<ReturnType<typeof getActiveAnnouncements>> = [];

  try {
    announcements = await getCachedAnnouncements();
  } catch (err) {
    console.error(
      "[announcement-banner] Failed to fetch announcements:",
      getErrorMessage(err, "Unknown error")
    );
    return null;
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-0">
      {announcements.map((announcement) => {
        const config =
          typeConfig[announcement.type as keyof typeof typeConfig] ??
          typeConfig.info;
        const Icon = config.icon;

        return (
          <div
            key={announcement.id}
            className={cn(
              "flex items-center justify-center gap-2 border-b px-4 py-2 text-sm",
              config.bg,
              config.text
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="font-medium">{announcement.title}</span>
            {announcement.message && (
              <span className="hidden sm:inline">
                &mdash; {announcement.message}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
