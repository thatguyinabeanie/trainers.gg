"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Shield } from "lucide-react";
import { changeStaffRoleAction } from "@/actions/staff";
import type { StaffWithRole, OrganizationGroup } from "@trainers/supabase";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
  orgSlug: string;
  staff: StaffWithRole;
  groups: OrganizationGroup[];
  onSuccess: () => void;
}

function getDisplayName(staff: StaffWithRole): string {
  if (staff.user?.first_name && staff.user?.last_name) {
    return `${staff.user.first_name} ${staff.user.last_name}`;
  }
  if (staff.user?.first_name) {
    return staff.user.first_name;
  }
  return staff.user?.username ?? "Unknown";
}

function getInitials(staff: StaffWithRole): string {
  if (staff.user?.first_name && staff.user?.last_name) {
    return `${staff.user.first_name[0]}${staff.user.last_name[0]}`.toUpperCase();
  }
  if (staff.user?.first_name) {
    return staff.user.first_name.slice(0, 2).toUpperCase();
  }
  if (staff.user?.username) {
    return staff.user.username.slice(0, 2).toUpperCase();
  }
  return "??";
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  organizationId,
  orgSlug,
  staff,
  groups,
  onSuccess,
}: ChangeRoleDialogProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set initial value to current group
  useEffect(() => {
    if (open && staff.group) {
      setSelectedGroupId(String(staff.group.id));
    } else if (!open) {
      setSelectedGroupId("");
    }
  }, [open, staff.group]);

  const handleSubmit = async () => {
    if (!selectedGroupId) return;

    setIsSubmitting(true);
    try {
      const result = await changeStaffRoleAction(
        organizationId,
        staff.user_id,
        parseInt(selectedGroupId, 10),
        orgSlug
      );

      if (result.success) {
        toast.success(`Role updated for ${getDisplayName(staff)}`);
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanged = staff.group
    ? selectedGroupId !== String(staff.group.id)
    : !!selectedGroupId;

  const canSubmit = selectedGroupId && hasChanged && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Group</DialogTitle>
          <DialogDescription>
            Move this staff member to a different group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Staff Member Info */}
          <div className="space-y-2">
            <Label>Staff Member</Label>
            <div className="bg-muted flex items-center gap-3 rounded-lg p-3">
              <Avatar className="h-8 w-8">
                {staff.user?.image && (
                  <AvatarImage
                    src={staff.user.image}
                    alt={getDisplayName(staff)}
                  />
                )}
                <AvatarFallback>{getInitials(staff)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{getDisplayName(staff)}</p>
                {staff.user?.username && (
                  <p className="text-muted-foreground text-sm">
                    @{staff.user.username}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">New Role</Label>
            <Select
              value={selectedGroupId}
              onValueChange={(value) => setSelectedGroupId(value ?? "")}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                    {group.role?.description && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        - {group.role.description}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Update Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
