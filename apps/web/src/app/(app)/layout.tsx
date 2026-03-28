import { TopNav } from "@/components/topnav";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import type { ReactNode } from "react";

export default function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <AnnouncementBanner />
      <TopNav />
      <main className="flex w-full flex-1 flex-col">{children}</main>
      <footer className="border-border/40 w-full border-t py-6">
        <div className="text-muted-foreground container mx-auto flex flex-col items-center justify-between px-4 text-sm md:flex-row md:px-6">
          <p className="font-semibold whitespace-nowrap">
            Built for competitors, by competitors.
          </p>
          <p className="text-xs whitespace-nowrap">
            &copy; {new Date().getFullYear()} Beanie LLC
          </p>
        </div>
      </footer>
    </>
  );
}
