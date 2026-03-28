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
      <footer className="text-muted-foreground mx-auto w-full max-w-screen-2xl px-6 py-2 text-[10px] sm:px-10">
        <div className="flex items-center justify-between">
          <p className="whitespace-nowrap font-semibold">
            Built for competitors, by competitors.
          </p>
          <p className="whitespace-nowrap">
            &copy; {new Date().getFullYear()} Beanie LLC
          </p>
        </div>
        <p className="mt-1 text-center text-[8px] opacity-40">
          trainers.gg is not affiliated with, endorsed by, or connected to
          Nintendo, The Pok&eacute;mon Company, or Game Freak.
        </p>
      </footer>
    </>
  );
}
