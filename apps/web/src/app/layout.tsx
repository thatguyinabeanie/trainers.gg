import { Providers } from "@/components/providers";
import { TopNav } from "@/components/topnav";
import { Toaster } from "@/components/ui/sonner";
import { SudoModeIndicator } from "@/components/sudo-mode-indicator";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import { isImpersonating as checkImpersonating } from "@/lib/impersonation/server";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "trainers.gg - Pokemon Community",
  description:
    "The social platform for Pokemon trainers. Build teams, compete in tournaments, and connect with the community.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "trainers.gg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1db6a5",
};

/**
 * Revalidate the layout data (announcements) every 60 seconds.
 * This enables ISR for the announcement banner while keeping pages static.
 */
export const revalidate = 60;

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  let impersonating = false;
  try {
    impersonating = await checkImpersonating();
  } catch {
    // Expected during static generation — cookies() unavailable.
    // Fail open: impersonation defaults to false.
  }
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className={cn(
          geistMono.variable,
          "bg-background text-foreground flex min-h-screen flex-col antialiased"
        )}
      >
        <Providers isImpersonating={impersonating}>
          <AnnouncementBanner />
          <TopNav />
          <main className="flex w-full flex-1 flex-col">{children}</main>

          <footer className="w-full py-6">
            <div className="text-muted-foreground container mx-auto flex flex-col items-center gap-2 px-4 text-center text-sm md:px-6">
              <p className="font-semibold">
                Built for competitors, by competitors.
              </p>
              <p>&copy; {new Date().getFullYear()} Beanie LLC</p>
              <p className="max-w-md text-[10px] leading-relaxed opacity-60">
                trainers.gg is not affiliated with, endorsed by, or connected to
                Nintendo, The Pok&eacute;mon Company, or Game Freak.
              </p>
            </div>
          </footer>

          <Toaster />
          <SudoModeIndicator />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
