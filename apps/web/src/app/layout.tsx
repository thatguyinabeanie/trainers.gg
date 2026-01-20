import type { Metadata } from "next";
import "@/styles/globals.css";

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
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
