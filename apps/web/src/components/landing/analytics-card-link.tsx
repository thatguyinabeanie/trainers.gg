"use client";

import { useAuthContext } from "@/components/auth/auth-provider";
import Link from "next/link";

export function AnalyticsCardLink() {
  const { isAuthenticated } = useAuthContext();

  return isAuthenticated ? (
    <Link
      href="/analytics"
      className="text-primary hover:text-primary/80 text-sm font-medium"
    >
      View Analytics
    </Link>
  ) : (
    <Link
      href="/sign-up"
      className="text-primary hover:text-primary/80 text-sm font-medium"
    >
      Sign up to track your stats
    </Link>
  );
}
