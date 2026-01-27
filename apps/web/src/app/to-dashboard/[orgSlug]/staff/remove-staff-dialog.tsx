"use client";

import { useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserMinus, AlertTriangle } from "lucide-react";
import { removeStaffAction } from "@/actions/staff";
import type { StaffWithRole } from "@trainers/supabase";

interface RemoveStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
  orgSlug: string;
  staff: StaffWithRole;
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

export function RemoveStaffDialog({
  open,
  onOpenChange,
  organizationId,
  orgSlug,
  staff,
  onSuccess,
}: RemoveStaffDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRemove = async () => {
    setIsSubmitting(true);
    try {
      const result = await removeStaffAction(
        organizationId,
        staff.user_id,
        orgSlug
      );

      if (result.success) {
        toast.success(`${getDisplayName(staff)} has been removed`);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive h-5 w-5" />
            Remove Staff Member
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this staff member? They will lose
            all permissions in your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Staff Member Info */}
          <div className="bg-muted flex items-center gap-3 rounded-lg p-4">
            <Avatar>
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
              {staff.group && (
                <p className="text-muted-foreground text-sm">
                  Role: {staff.group.name}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserMinus className="h-4 w-4" />
            )}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
