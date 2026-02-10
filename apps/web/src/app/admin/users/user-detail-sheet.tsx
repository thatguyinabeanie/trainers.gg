"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getUserAdminDetails,
  getSiteRoles as fetchSiteRoles,
} from "@trainers/supabase";
import {
  ShieldAlert,
  ShieldCheck,
  UserCog,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { startImpersonationAction } from "@/lib/impersonation/actions";
import {
  suspendUserAction,
  unsuspendUserAction,
  grantSiteRoleAction,
  revokeSiteRoleAction,
} from "./actions";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface UserDetail {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  is_locked: boolean | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  alts: Array<{
    id: number;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    in_game_name: string | null;
    tier: string | null;
    created_at: string | null;
  }> | null;
  user_roles: Array<{
    id: number;
    created_at: string | null;
    role: {
      id: number;
      name: string;
      description: string | null;
      scope: string;
    } | null;
  }> | null;
}

interface SiteRole {
  id: number;
  name: string;
  description: string | null;
  scope: string;
}

interface UserDetailSheetProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

const roleLabels: Record<string, string> = {
  site_admin: "Site Admin",
  site_moderator: "Moderator",
};

function getRoleLabel(name: string): string {
  return roleLabels[name] ?? name;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function UserDetailSheet({
  userId,
  open,
  onOpenChange,
  onUserUpdated,
}: UserDetailSheetProps) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [siteRoles, setSiteRoles] = useState<SiteRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
    variant?: "default" | "destructive";
  } | null>(null);

  // Impersonation reason input
  const [showImpersonateInput, setShowImpersonateInput] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState("");

  // Suspend reason input
  const [suspendReason, setSuspendReason] = useState("");

  // Add role selection
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const supabase = useMemo(() => createClient(), []);

  // Fetch user details when userId changes
  const fetchUser = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    setActionError(null);
    setShowImpersonateInput(false);
    setImpersonateReason("");
    setSuspendReason("");
    setSelectedRoleId("");

    try {
      const [userData, rolesData] = await Promise.all([
        getUserAdminDetails(supabase, userId),
        fetchSiteRoles(supabase),
      ]);
      setUser(userData as UserDetail | null);
      setSiteRoles(rolesData as SiteRole[]);
    } catch (err) {
      console.error("Error fetching user details:", err);
      setError("Failed to load user details");
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (open && userId) {
      fetchUser();
    }
    if (!open) {
      setUser(null);
      setError(null);
      setActionError(null);
    }
  }, [open, userId, fetchUser]);

  // Get the user's current site roles
  const userSiteRoles = useMemo(() => {
    if (!user?.user_roles) return [];
    return user.user_roles
      .filter(
        (ur) =>
          ur.role &&
          typeof ur.role === "object" &&
          "scope" in ur.role &&
          ur.role.scope === "site"
      )
      .map((ur) => ({
        userRoleId: ur.id,
        roleId: ur.role!.id,
        name: ur.role!.name,
        description: ur.role!.description,
      }));
  }, [user]);

  // Roles available to add (not yet assigned)
  const availableRoles = useMemo(() => {
    const assignedIds = new Set(userSiteRoles.map((r) => r.roleId));
    return siteRoles.filter((r) => !assignedIds.has(r.id));
  }, [siteRoles, userSiteRoles]);

  // ----------------------------------------------------------------
  // Action handlers
  // ----------------------------------------------------------------

  const handleSuspend = () => {
    if (!user) return;
    setConfirmDialog({
      title: "Suspend User",
      description: `This will suspend @${user.username ?? "this user"}. They will no longer be able to sign in or use the platform.`,
      variant: "destructive",
      action: async () => {
        setActionLoading(true);
        setActionError(null);
        const result = await suspendUserAction(
          user.id,
          suspendReason || undefined
        );
        if (!result.success) {
          setActionError(result.error ?? "Failed to suspend user");
        } else {
          setSuspendReason("");
          await fetchUser();
          onUserUpdated();
        }
        setActionLoading(false);
      },
    });
  };

  const handleUnsuspend = () => {
    if (!user) return;
    setConfirmDialog({
      title: "Unsuspend User",
      description: `This will restore access for @${user.username ?? "this user"}. They will be able to sign in again.`,
      action: async () => {
        setActionLoading(true);
        setActionError(null);
        const result = await unsuspendUserAction(user.id);
        if (!result.success) {
          setActionError(result.error ?? "Failed to unsuspend user");
        } else {
          await fetchUser();
          onUserUpdated();
        }
        setActionLoading(false);
      },
    });
  };

  const handleImpersonate = () => {
    if (!user) return;
    setConfirmDialog({
      title: "Impersonate User",
      description: `You will view the platform as @${user.username ?? "this user"}. This action is logged and auditable.`,
      action: async () => {
        setActionLoading(true);
        setActionError(null);
        const result = await startImpersonationAction(
          user.id,
          impersonateReason || undefined
        );
        if (!result.success) {
          setActionError(result.error ?? "Failed to start impersonation");
        } else {
          // Impersonation started — reload to switch context
          window.location.href = "/dashboard";
        }
        setActionLoading(false);
      },
    });
  };

  const handleGrantRole = async () => {
    if (!user || !selectedRoleId) return;

    setActionLoading(true);
    setActionError(null);
    const result = await grantSiteRoleAction(user.id, Number(selectedRoleId));
    if (!result.success) {
      setActionError(result.error ?? "Failed to grant role");
    } else {
      setSelectedRoleId("");
      await fetchUser();
      onUserUpdated();
    }
    setActionLoading(false);
  };

  const handleRevokeRole = (roleId: number, roleName: string) => {
    if (!user) return;
    setConfirmDialog({
      title: "Remove Role",
      description: `Remove the "${getRoleLabel(roleName)}" role from @${user.username ?? "this user"}?`,
      variant: "destructive",
      action: async () => {
        setActionLoading(true);
        setActionError(null);
        const result = await revokeSiteRoleAction(user.id, roleId);
        if (!result.success) {
          setActionError(result.error ?? "Failed to revoke role");
        } else {
          await fetchUser();
          onUserUpdated();
        }
        setActionLoading(false);
      },
    });
  };

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>User Details</SheetTitle>
            <SheetDescription>
              View and manage user account settings.
            </SheetDescription>
          </SheetHeader>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          )}

          {error && (
            <div className="mx-4">
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                {error}
              </div>
            </div>
          )}

          {!loading && !error && user && (
            <div className="flex flex-col gap-6 px-4 pb-6">
              {/* Action error banner */}
              {actionError && (
                <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                  {actionError}
                </div>
              )}

              {/* User Info */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="text-lg">
                      {user.username?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-medium">
                      {user.first_name || user.last_name
                        ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                        : (user.username ?? "Unknown")}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      @{user.username ?? "—"}
                    </div>
                  </div>
                  {user.is_locked ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-red-500/25 bg-red-500/15 text-red-600",
                        "dark:text-red-400"
                      )}
                    >
                      Suspended
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-emerald-500/25 bg-emerald-500/15 text-emerald-600",
                        "dark:text-emerald-400"
                      )}
                    >
                      Active
                    </Badge>
                  )}
                </div>

                <dl className="text-sm">
                  <div className="flex justify-between py-1.5">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="truncate pl-4 text-right">
                      {user.email ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt className="text-muted-foreground">User ID</dt>
                    <dd className="truncate pl-4 font-mono text-xs">
                      {user.id}
                    </dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt className="text-muted-foreground">Created</dt>
                    <dd>
                      {user.created_at ? formatDateTime(user.created_at) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt className="text-muted-foreground">Last Sign In</dt>
                    <dd>
                      {user.last_sign_in_at
                        ? formatDateTime(user.last_sign_in_at)
                        : "Never"}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Alts */}
              <section>
                <h3 className="mb-2 text-sm font-medium">
                  Alts ({user.alts?.length ?? 0})
                </h3>
                {user.alts && user.alts.length > 0 ? (
                  <div className="space-y-2">
                    {user.alts.map((alt) => (
                      <div
                        key={alt.id}
                        className="bg-muted/50 flex items-center gap-3 rounded-lg p-2.5"
                      >
                        <Avatar className="size-7">
                          <AvatarImage src={alt.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {alt.username?.charAt(0).toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {alt.display_name ?? alt.username ?? "—"}
                          </div>
                          {alt.in_game_name && (
                            <div className="text-muted-foreground truncate text-xs">
                              IGN: {alt.in_game_name}
                            </div>
                          )}
                        </div>
                        {alt.tier && (
                          <Badge variant="outline" className="text-xs">
                            {alt.tier}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No alts created
                  </p>
                )}
              </section>

              {/* Site Roles */}
              <section>
                <h3 className="mb-2 text-sm font-medium">Site Roles</h3>
                {userSiteRoles.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {userSiteRoles.map((role) => (
                      <Badge
                        key={role.userRoleId}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        {getRoleLabel(role.name)}
                        <button
                          type="button"
                          onClick={() =>
                            handleRevokeRole(role.roleId, role.name)
                          }
                          disabled={actionLoading}
                          className="hover:bg-muted-foreground/20 ml-0.5 rounded-full p-0.5"
                          aria-label={`Remove ${getRoleLabel(role.name)} role`}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground mb-3 text-sm">
                    No site roles assigned
                  </p>
                )}

                {/* Add role control */}
                {availableRoles.length > 0 && (
                  <div className="flex gap-2">
                    <Select
                      value={selectedRoleId}
                      onValueChange={(value) => setSelectedRoleId(value ?? "")}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.id} value={String(role.id)}>
                            {getRoleLabel(role.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="default"
                      variant="outline"
                      onClick={handleGrantRole}
                      disabled={!selectedRoleId || actionLoading}
                    >
                      <Plus className="size-4" />
                      Add
                    </Button>
                  </div>
                )}
              </section>

              {/* Actions */}
              <section className="border-t pt-4">
                <h3 className="mb-3 text-sm font-medium">Actions</h3>
                <div className="flex flex-col gap-3">
                  {/* Suspend / Unsuspend */}
                  {user.is_locked ? (
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={handleUnsuspend}
                      disabled={actionLoading}
                    >
                      <ShieldCheck className="size-4" />
                      Unsuspend Account
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Input
                        placeholder="Reason for suspension (optional)"
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        disabled={actionLoading}
                      />
                      <Button
                        variant="destructive"
                        className="justify-start"
                        onClick={handleSuspend}
                        disabled={actionLoading}
                      >
                        <ShieldAlert className="size-4" />
                        Suspend Account
                      </Button>
                    </div>
                  )}

                  {/* Impersonate */}
                  {!showImpersonateInput ? (
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => setShowImpersonateInput(true)}
                      disabled={actionLoading}
                    >
                      <UserCog className="size-4" />
                      Impersonate User
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Input
                        placeholder="Reason for impersonation (optional)"
                        value={impersonateReason}
                        onChange={(e) => setImpersonateReason(e.target.value)}
                        disabled={actionLoading}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 justify-start"
                          onClick={handleImpersonate}
                          disabled={actionLoading}
                        >
                          <UserCog className="size-4" />
                          Start Impersonation
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setShowImpersonateInput(false);
                            setImpersonateReason("");
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {!loading && !error && !user && (
            <div className="text-muted-foreground py-12 text-center text-sm">
              User not found
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmDialog?.variant ?? "default"}
              disabled={actionLoading}
              onClick={async (e) => {
                // Prevent default close so we control the flow
                e.preventDefault();
                if (confirmDialog?.action) {
                  await confirmDialog.action();
                }
                setConfirmDialog(null);
              }}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
