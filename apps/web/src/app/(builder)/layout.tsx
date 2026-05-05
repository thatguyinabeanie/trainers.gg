import { TopNav } from "@/components/topnav";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { UsernameRequiredModal } from "@/components/auth/username-required-modal";
import type { ReactNode } from "react";

/**
 * Builder route group layout.
 * Full-viewport app layout — sticky TopNav, no footer, no page-level scroll.
 */
export default function BuilderLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <AnnouncementBanner />
      <TopNav />
      <main className="flex w-full flex-1 flex-col overflow-hidden">
        {children}
      </main>
      <UsernameRequiredModal />
    </>
  );
}
