"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Minus } from "lucide-react";
import { toast } from "sonner";

import type {
  RegistrationMode,
  StaffInviteMode,
  TeamSheetVisibility,
} from "@trainers/validators";

import { cn } from "@/lib/utils";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateCommunityPermissions } from "@/actions/communities";

// =============================================================================
// Role Permissions Table Data
// =============================================================================

const ROLE_PERMISSIONS = [
  {
    label: "Create tournaments",
    admin: true,
    headJudge: false,
    judge: false,
  },
  {
    label: "Manage tournament settings",
    admin: true,
    headJudge: true,
    judge: false,
  },
  {
    label: "Start/advance rounds",
    admin: true,
    headJudge: true,
    judge: false,
  },
  {
    label: "Report match results",
    admin: true,
    headJudge: true,
    judge: true,
  },
  {
    label: "Invite staff",
    admin: true,
    headJudge: false,
    judge: false,
  },
  {
    label: "Manage staff roles",
    admin: true,
    headJudge: false,
    judge: false,
  },
  {
    label: "View team sheets",
    admin: true,
    headJudge: true,
    judge: true,
  },
] as const;

// =============================================================================
// PermissionsTab
// =============================================================================

interface PermissionsTabProps {
  communityId: number;
  communitySlug: string;
  isPublic: boolean;
  registrationMode: RegistrationMode;
  staffInviteMode: StaffInviteMode;
  teamSheetVisibility: TeamSheetVisibility;
}

export function PermissionsTab({
  communityId,
  communitySlug,
  isPublic,
  registrationMode,
  staffInviteMode,
  teamSheetVisibility,
}: PermissionsTabProps) {
  const [isPending, startTransition] = useTransition();

  const [localIsPublic, setLocalIsPublic] = useState(isPublic);
  const [localRegistrationMode, setLocalRegistrationMode] =
    useState(registrationMode);
  const [localStaffInviteMode, setLocalStaffInviteMode] =
    useState(staffInviteMode);
  const [localTeamSheetVisibility, setLocalTeamSheetVisibility] =
    useState(teamSheetVisibility);

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateCommunityPermissions(
        communityId,
        {
          isPublic: localIsPublic,
          registrationMode: localRegistrationMode,
          staffInviteMode: localStaffInviteMode,
          teamSheetVisibility: localTeamSheetVisibility,
        },
        communitySlug
      );

      if (result.success) {
        toast.success("Permissions updated");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Card 1: Community Access */}
      <DashboardCard label="Community Access">
        <div className="space-y-4">
          {/* Public listing */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Label htmlFor="publicListing" className="text-sm font-medium">
                Public listing
              </Label>
              <p className="text-muted-foreground text-xs">
                Show this community on the public communities page
              </p>
            </div>
            <Switch
              id="publicListing"
              checked={localIsPublic}
              onCheckedChange={setLocalIsPublic}
            />
          </div>

          {/* Tournament registration */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Label htmlFor="registrationMode" className="text-sm font-medium">
                Tournament registration
              </Label>
              <p className="text-muted-foreground text-xs">
                Who can register for tournaments in this community
              </p>
            </div>
            <Select
              value={localRegistrationMode}
              onValueChange={(val) =>
                setLocalRegistrationMode(val as RegistrationMode)
              }
            >
              <SelectTrigger id="registrationMode" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anyone">Anyone</SelectItem>
                <SelectItem value="invite_only">Invite only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Staff invitations */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Label htmlFor="staffInviteMode" className="text-sm font-medium">
                Staff invitations
              </Label>
              <p className="text-muted-foreground text-xs">
                Who can invite new staff members
              </p>
            </div>
            <Select
              value={localStaffInviteMode}
              onValueChange={(val) =>
                setLocalStaffInviteMode(val as StaffInviteMode)
              }
            >
              <SelectTrigger id="staffInviteMode" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner_only">Owner only</SelectItem>
                <SelectItem value="admins_and_above">
                  Admins and above
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Team sheet visibility */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Label
                htmlFor="teamSheetVisibility"
                className="text-sm font-medium"
              >
                Team sheet visibility
              </Label>
              <p className="text-muted-foreground text-xs">
                When players&apos; team sheets become publicly visible
              </p>
            </div>
            <Select
              value={localTeamSheetVisibility}
              onValueChange={(val) =>
                setLocalTeamSheetVisibility(val as TeamSheetVisibility)
              }
            >
              <SelectTrigger id="teamSheetVisibility" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="after_tournament">
                  After tournament ends
                </SelectItem>
                <SelectItem value="after_round">After each round</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DashboardCard>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>

      {/* Card 2: Role Permissions (read-only) */}
      <DashboardCard label="Role Permissions">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="pb-2 text-left font-medium">Permission</th>
                <th className="text-muted-foreground w-16 pb-2 text-center text-xs font-medium">
                  Admin
                </th>
                <th className="text-muted-foreground w-20 pb-2 text-center text-xs font-medium">
                  Head Judge
                </th>
                <th className="text-muted-foreground w-14 pb-2 text-center text-xs font-medium">
                  Judge
                </th>
              </tr>
            </thead>
            <tbody>
              {ROLE_PERMISSIONS.map((row) => (
                <tr
                  key={row.label}
                  className="border-border border-b last:border-0"
                >
                  <td className="py-2 pr-4 text-sm">{row.label}</td>
                  <td className="py-2 text-center">
                    <PermissionCell allowed={row.admin} />
                  </td>
                  <td className="py-2 text-center">
                    <PermissionCell allowed={row.headJudge} />
                  </td>
                  <td className="py-2 text-center">
                    <PermissionCell allowed={row.judge} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground mt-3 text-sm">
          Owner has full access to all permissions.
        </p>
      </DashboardCard>
    </div>
  );
}

// =============================================================================
// PermissionCell
// =============================================================================

interface PermissionCellProps {
  allowed: boolean;
}

function PermissionCell({ allowed }: PermissionCellProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        allowed ? "text-primary" : "text-muted-foreground"
      )}
    >
      {allowed ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
    </span>
  );
}
