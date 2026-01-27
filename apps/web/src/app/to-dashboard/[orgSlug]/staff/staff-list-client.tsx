"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  listOrganizationStaffWithRoles,
  type StaffWithRole,
  type OrganizationGroup,
} from "@trainers/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Plus,
  Loader2,
  MoreHorizontal,
  UserMinus,
  Shield,
  Crown,
} from "lucide-react";
import { InviteStaffDialog } from "./invite-staff-dialog";
import { ChangeRoleDialog } from "./change-role-dialog";
import { RemoveStaffDialog } from "./remove-staff-dialog";

interface StaffListClientProps {
  organizationId: number;
  orgSlug: string;
  initialStaff: StaffWithRole[];
  groups: OrganizationGroup[];
  isOwner: boolean;
  currentUserId?: string;
}

const roleLabels: Record<string, { label: string; color: string }> = {
  org_admin: { label: "Admin", color: "bg-purple-100 text-purple-800" },
  org_head_judge: { label: "Head Judge", color: "bg-blue-100 text-blue-800" },
  org_judge: { label: "Judge", color: "bg-green-100 text-green-800" },
};

function getInitials(
  firstName: string | null,
  lastName: string | null,
  username: string | null
): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  if (username) {
    return username.slice(0, 2).toUpperCase();
  }
  return "??";
}

function getDisplayName(
  firstName: string | null,
  lastName: string | null,
  username: string | null
): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  return username ?? "Unknown";
}

export function StaffListClient({
  organizationId,
  orgSlug,
  initialStaff,
  groups,
  isOwner,
  currentUserId,
}: StaffListClientProps) {
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [changeRoleStaff, setChangeRoleStaff] = useState<StaffWithRole | null>(
    null
  );
  const [removeStaff, setRemoveStaff] = useState<StaffWithRole | null>(null);

  // Use server data initially, refetch on changes
  const queryFn = useCallback(
    (supabase: Parameters<typeof listOrganizationStaffWithRoles>[0]) =>
      listOrganizationStaffWithRoles(supabase, organizationId),
    [organizationId]
  );

  const {
    data: staffMembers,
    isLoading,
    refetch,
  } = useSupabaseQuery(queryFn, [organizationId]);

  // Use initial data while loading
  const staff = staffMembers ?? initialStaff;

  const handleSuccess = () => {
    refetch();
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff Management</h2>
          <p className="text-muted-foreground text-sm">
            Manage your organization&apos;s staff and permissions
          </p>
        </div>
        {isOwner && (
          <Button className="gap-2" onClick={() => setIsInviteOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-3">
        {groups.map((group) => {
          const roleConfig = group.role
            ? roleLabels[group.role.name]
            : undefined;
          return (
            <div key={group.id} className="flex items-center gap-2 text-sm">
              <Badge className={roleConfig?.color ?? "bg-muted"}>
                {group.name}
              </Badge>
              <span className="text-muted-foreground">
                ({group.memberCount})
              </span>
            </div>
          );
        })}
      </div>

      {/* Staff List */}
      {isLoading && staff.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No staff members</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Add staff members to help manage your organization
            </p>
            {isOwner && (
              <Button onClick={() => setIsInviteOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {staff.map((member) => {
              const displayName = getDisplayName(
                member.user?.first_name ?? null,
                member.user?.last_name ?? null,
                member.user?.username ?? null
              );
              const initials = getInitials(
                member.user?.first_name ?? null,
                member.user?.last_name ?? null,
                member.user?.username ?? null
              );
              const roleConfig = member.role
                ? roleLabels[member.role.name]
                : undefined;

              const canModify =
                isOwner && !member.isOwner && member.user_id !== currentUserId;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {member.user?.image && (
                        <AvatarImage
                          src={member.user.image}
                          alt={displayName}
                        />
                      )}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{displayName}</p>
                        {member.isOwner && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      {member.user?.username && (
                        <p className="text-muted-foreground text-sm">
                          @{member.user.username}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {member.isOwner ? (
                      <Badge variant="outline" className="gap-1">
                        <Crown className="h-3 w-3" />
                        Owner
                      </Badge>
                    ) : member.group ? (
                      <Badge className={roleConfig?.color ?? "bg-muted"}>
                        {member.group.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No Role</Badge>
                    )}

                    {canModify && (
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setChangeRoleStaff(member)}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setRemoveStaff(member)}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <InviteStaffDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        organizationId={organizationId}
        orgSlug={orgSlug}
        groups={groups}
        onSuccess={handleSuccess}
      />

      {changeRoleStaff && (
        <ChangeRoleDialog
          open={!!changeRoleStaff}
          onOpenChange={(open: boolean) => !open && setChangeRoleStaff(null)}
          organizationId={organizationId}
          orgSlug={orgSlug}
          staff={changeRoleStaff}
          groups={groups}
          onSuccess={handleSuccess}
        />
      )}

      {removeStaff && (
        <RemoveStaffDialog
          open={!!removeStaff}
          onOpenChange={(open: boolean) => !open && setRemoveStaff(null)}
          organizationId={organizationId}
          orgSlug={orgSlug}
          staff={removeStaff}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
