import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { SudoModeIndicator } from "@/components/sudo-mode-indicator";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";

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
  twitter: {
    card: "summary_large_image",
  },
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // No request data is read here — the impersonation flag is fetched
  // client-side by PostHogProvider so the PPR shell stays static.
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className={cn(
          geistMono.variable,
          "bg-background text-foreground flex min-h-screen flex-col antialiased"
        )}
      >
        <Providers>
          {/* Global dot-grid background pattern */}
          <div
            className="pointer-events-none fixed inset-0 -z-10 dark:hidden"
            aria-hidden="true"
            style={{
              backgroundImage:
                "radial-gradient(circle, oklch(0.5 0.08 183 / 0.35) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              maskImage:
                "linear-gradient(to bottom, black 20%, transparent 60%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 20%, transparent 60%)",
            }}
          />
          <div
            className="pointer-events-none fixed inset-0 -z-10 hidden dark:block"
            aria-hidden="true"
            style={{
              backgroundImage:
                "radial-gradient(circle, oklch(0.7 0.12 183 / 0.18) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              maskImage:
                "linear-gradient(to bottom, black 20%, transparent 60%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 20%, transparent 60%)",
            }}
          />
          {children}
          <Toaster />
          <SudoModeIndicator />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
