"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { StaffInviteMode } from "@trainers/validators";

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
import { updateCommunityPermissions } from "@/actions/communities";

// =============================================================================
// PermissionsTab
// =============================================================================

interface PermissionsTabProps {
  communityId: number;
  communitySlug: string;
  staffInviteMode: StaffInviteMode;
}

export function PermissionsTab({
  communityId,
  communitySlug,
  staffInviteMode,
}: PermissionsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [localStaffInviteMode, setLocalStaffInviteMode] =
    useState(staffInviteMode);

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateCommunityPermissions(
        communityId,
        { staffInviteMode: localStaffInviteMode },
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
      <DashboardCard label="Community Access">
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
              <SelectItem value="admins_and_above">Admins and above</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DashboardCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
