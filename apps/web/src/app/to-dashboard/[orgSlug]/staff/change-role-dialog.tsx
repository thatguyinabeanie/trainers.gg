"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

const changeRoleSchema = z.object({
  groupId: z.string().min(1, "Please select a role"),
});

type ChangeRoleFormData = z.infer<typeof changeRoleSchema>;

export function ChangeRoleDialog({
  open,
  onOpenChange,
  organizationId,
  orgSlug,
  staff,
  groups,
  onSuccess,
}: ChangeRoleDialogProps) {
  const form = useForm<ChangeRoleFormData>({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: {
      groupId: "",
    },
  });

  const { isSubmitting } = form.formState;
  const selectedGroupId = form.watch("groupId");

  // Set initial value to current group when dialog opens
  useEffect(() => {
    if (open && staff.group) {
      form.reset({ groupId: String(staff.group.id) });
    } else if (!open) {
      form.reset({ groupId: "" });
    }
  }, [open, staff.group, form]);

  const onSubmit = async (data: ChangeRoleFormData) => {
    try {
      const result = await changeStaffRoleAction(
        organizationId,
        staff.user_id,
        parseInt(data.groupId, 10),
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
    }
  };

  const hasChanged = staff.group
    ? selectedGroupId !== String(staff.group.id)
    : !!selectedGroupId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Group</DialogTitle>
          <DialogDescription>
            Move this staff member to a different group.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="py-4">
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
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>New Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role..." />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={!hasChanged || isSubmitting}
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
