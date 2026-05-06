import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { UsernameRequiredModal } from "@/components/auth/username-required-modal";
import type { ReactNode } from "react";

/**
 * Builder route group layout.
 * No top nav — the workspace renders its own full-width header bar.
 */
export default function BuilderLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <AnnouncementBanner />
      <main className="flex h-dvh w-full flex-col overflow-hidden">
        {children}
      </main>
      <UsernameRequiredModal />
    </>
  );
}
