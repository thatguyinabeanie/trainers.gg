"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS, type PermissionKey } from "@/lib/constants/permissions";
import { ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

interface AdminGuardProps {
  children: ReactNode;
  requiredPermissions?: PermissionKey[];
}

export default function AdminGuard({
  children,
  requiredPermissions = [],
}: AdminGuardProps) {
  const router = useRouter();

  // Get admin permissions to check
  const adminPermissions: PermissionKey[] = [
    PERMISSIONS.ORG_MANAGE_REQUESTS,
    PERMISSIONS.ROLE_CREATE,
    PERMISSIONS.ROLE_VIEW_ALL,
    PERMISSIONS.ROLE_UPDATE,
    PERMISSIONS.PERMISSION_CREATE,
    PERMISSIONS.PERMISSION_VIEW_ALL,
    PERMISSIONS.ADMIN_MANAGE_TEMPLATES,
    PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS,
    ...requiredPermissions,
  ];

  const { permissions, isLoading, user } = usePermissions(adminPermissions);

  // Check if user has admin permissions
  const hasAdminAccess =
    permissions[PERMISSIONS.ORG_MANAGE_REQUESTS] ||
    permissions[PERMISSIONS.ROLE_CREATE] ||
    permissions[PERMISSIONS.ROLE_VIEW_ALL] ||
    permissions[PERMISSIONS.ROLE_UPDATE] ||
    permissions[PERMISSIONS.PERMISSION_CREATE] ||
    permissions[PERMISSIONS.PERMISSION_VIEW_ALL] ||
    permissions[PERMISSIONS.ADMIN_MANAGE_TEMPLATES] ||
    permissions[PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS];

  // Check specific required permissions if provided
  const hasRequiredPermissions =
    requiredPermissions.length === 0 ||
    requiredPermissions.every((perm) => permissions[perm]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/sign-in");
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

  if (!user.alt) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6">
        <Alert className="mx-auto max-w-2xl">
          <ShieldOff className="h-4 w-4" />
          <AlertTitle>Profile Required</AlertTitle>
          <AlertDescription>
            Please complete your profile setup to access admin features.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasAdminAccess || !hasRequiredPermissions) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6">
        <Alert className="mx-auto max-w-2xl">
          <ShieldOff className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don&apos;t have permission to access this admin area. Please
            contact a system administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
