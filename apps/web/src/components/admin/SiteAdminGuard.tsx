"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteAdmin } from "@/hooks/use-site-admin";
import { ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

interface SiteAdminGuardProps {
  children: ReactNode;
}

export default function SiteAdminGuard({ children }: SiteAdminGuardProps) {
  const router = useRouter();
  const { isSiteAdmin, isLoading, user } = useSiteAdmin();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoading && !user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/sign-in");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6">
        <Skeleton className="mb-6 h-10 w-1/3" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (!isSiteAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6">
        <Alert className="mx-auto max-w-2xl">
          <ShieldOff className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don&apos;t have site administrator privileges. Please contact a
            site administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
