"use client";

import { ConvexProvider } from "@/components/convex-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "next-themes";
import { type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider>
      <AuthProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </AuthProvider>
    </ConvexProvider>
  );
}
