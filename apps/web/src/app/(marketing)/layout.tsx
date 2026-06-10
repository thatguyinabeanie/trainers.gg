import { TopNav } from "@/components/topnav";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { CopyrightYear } from "@/components/layout/copyright-year";
import Image from "next/image";
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
            Not affiliated with Nintendo, The Pok&eacute;mon Company, or Game
            Freak.
          </p>
          <p className="flex items-center gap-1 whitespace-nowrap">
            <a
              href="https://x.com/thatguyinabeani"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/icons/beanie_logo.png"
                alt="Beanie LLC"
                width={28}
                height={28}
                className="inline-block"
              />
            </a>
            &copy; <CopyrightYear /> Beanie LLC
          </p>
        </div>
      </footer>
    </>
  );
}
