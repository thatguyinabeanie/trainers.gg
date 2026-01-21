import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "@/styles/globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "trainers.gg - Pokemon Community",
  description:
    "The social platform for Pokemon trainers, powered by Bluesky/AT Protocol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${notoSans.variable} min-h-screen font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
