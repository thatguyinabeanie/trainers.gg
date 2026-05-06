import { TopNav } from "@/components/topnav";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import type { ReactNode } from "react";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <AnnouncementBanner />
      <TopNav />
      <main className="flex w-full flex-1 flex-col">{children}</main>
      <footer className="text-muted-foreground border-border/40 w-full border-t py-3 text-[10px]">
        <div className="flex items-center justify-between px-6 sm:px-10">
          <p className="text-[8px] opacity-40">
            trainers.gg is not affiliated with, endorsed by, or connected to
            Nintendo, The Pok&eacute;mon Company, or Game Freak.
          </p>
          <p className="whitespace-nowrap">
            &copy; {new Date().getFullYear()} Beanie LLC
          </p>
        </div>
      </footer>
    </>
  );
}
