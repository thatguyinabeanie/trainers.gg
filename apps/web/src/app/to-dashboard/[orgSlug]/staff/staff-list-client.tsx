"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  listOrganizationStaffWithRoles,
  type StaffWithRole,
  type OrganizationGroup,
} from "@trainers/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Plus,
  Loader2,
  Crown,
  GripVertical,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InviteStaffDialog } from "./invite-staff-dialog";
import { RemoveStaffDialog } from "./remove-staff-dialog";
import { moveStaffToGroup } from "@/actions/staff";

// =============================================================================
// Types & Constants
// =============================================================================

interface StaffListClientProps {
  organizationId: number;
  orgSlug: string;
  initialStaff: StaffWithRole[];
  groups: OrganizationGroup[];
  isOwner: boolean;
  currentUserId?: string;
  currentUserRole?: string | null;
}

const UNASSIGNED_GROUP_ID = "unassigned";

// Role hierarchy: who can manage whom
// Owner can manage all, Admin can manage Head Judges & Judges, Head Judge can manage Judges
const ROLE_HIERARCHY: Record<string, string[]> = {
  owner: ["org_admin", "org_head_judge", "org_judge"],
  org_admin: ["org_head_judge", "org_judge"],
  org_head_judge: ["org_judge"],
  org_judge: [],
};

const GROUP_COLORS: Record<string, string> = {
  org_admin:
    "border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950",
  org_head_judge:
    "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950",
  org_judge:
    "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950",
};

// =============================================================================
// Helper Functions
// =============================================================================

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

function canManageGroup(
  userRole: string | null,
  isOwner: boolean,
  targetGroupRole: string | null
): boolean {
  if (isOwner) return true;
  if (!userRole || !targetGroupRole) return false;

  const manageableRoles = ROLE_HIERARCHY[userRole] ?? [];
  return manageableRoles.includes(targetGroupRole);
}

// =============================================================================
// Draggable Staff Card
// =============================================================================

interface DraggableStaffCardProps {
  member: StaffWithRole;
  canDrag: boolean;
  onRemove?: () => void;
}

function DraggableStaffCard({
  member,
  canDrag,
  onRemove,
}: DraggableStaffCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: member.user_id,
      disabled: !canDrag || member.isOwner,
      data: { member },
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card flex items-center gap-3 rounded-lg border p-3 transition-shadow",
        isDragging && "shadow-lg",
        canDrag && !member.isOwner && "cursor-grab active:cursor-grabbing"
      )}
    >
      {canDrag && !member.isOwner && (
        <div {...attributes} {...listeners} className="text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <Avatar className="h-8 w-8">
        {member.user?.image && (
          <AvatarImage src={member.user.image} alt={displayName} />
        )}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{displayName}</p>
          {member.isOwner && (
            <Crown className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500" />
          )}
        </div>
        {member.user?.username && (
          <p className="text-muted-foreground truncate text-xs">
            @{member.user.username}
          </p>
        )}
      </div>
      {onRemove && !member.isOwner && (
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
          title="Remove from organization"
        >
          <UserMinus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Staff Card for Overlay (while dragging)
// =============================================================================

function StaffCardOverlay({ member }: { member: StaffWithRole }) {
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

  return (
    <div className="bg-card flex items-center gap-3 rounded-lg border p-3 shadow-xl">
      <GripVertical className="text-muted-foreground h-4 w-4" />
      <Avatar className="h-8 w-8">
        {member.user?.image && (
          <AvatarImage src={member.user.image} alt={displayName} />
        )}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{displayName}</p>
        {member.user?.username && (
          <p className="text-muted-foreground truncate text-xs">
            @{member.user.username}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Droppable Group Section
// =============================================================================

interface DroppableGroupProps {
  groupId: string;
  title: string;
  description?: string;
  members: StaffWithRole[];
  canDrop: boolean;
  canDrag: boolean;
  colorClass?: string;
  onRemoveMember?: (member: StaffWithRole) => void;
}

function DroppableGroup({
  groupId,
  title,
  description,
  members,
  canDrop,
  canDrag,
  colorClass,
  onRemoveMember,
}: DroppableGroupProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: groupId,
    disabled: !canDrop,
  });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "transition-all",
        colorClass,
        isOver && canDrop && "ring-primary ring-2 ring-offset-2",
        !canDrop && "opacity-60"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <p className="text-muted-foreground text-xs">{description}</p>
            )}
          </div>
          <span className="text-muted-foreground text-sm">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {members.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border-2 border-dashed py-6 text-center text-sm">
            {canDrop ? "Drag staff here" : "No members"}
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <DraggableStaffCard
                key={member.user_id}
                member={member}
                canDrag={canDrag}
                onRemove={
                  onRemoveMember ? () => onRemoveMember(member) : undefined
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function StaffListClient({
  organizationId,
  orgSlug,
  initialStaff,
  groups,
  isOwner,
  currentUserId,
  currentUserRole,
}: StaffListClientProps) {
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [removeStaff, setRemoveStaff] = useState<StaffWithRole | null>(null);
  const [activeStaff, setActiveStaff] = useState<StaffWithRole | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  // Fetch staff data
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

  // Optimistic state for drag & drop
  // This stores temporary group assignments that haven't been confirmed by the server yet
  const [optimisticMoves, setOptimisticMoves] = useState<
    Map<string, { groupId: number; group: OrganizationGroup }>
  >(new Map());

  // Clear optimistic moves when staffMembers updates (server confirmed the change)
  useEffect(() => {
    if (staffMembers) {
      setOptimisticMoves(new Map());
    }
  }, [staffMembers]);

  // Apply optimistic moves to staff data
  const staff = useMemo(() => {
    const baseStaff = staffMembers ?? initialStaff;
    if (optimisticMoves.size === 0) return baseStaff;

    return baseStaff.map((member) => {
      const optimisticMove = optimisticMoves.get(member.user_id);
      if (optimisticMove) {
        return {
          ...member,
          group: {
            id: optimisticMove.group.id,
            name: optimisticMove.group.name,
            role: optimisticMove.group.role,
          },
        };
      }
      return member;
    });
  }, [staffMembers, initialStaff, optimisticMoves]);

  // Group staff by their group assignment
  const unassignedStaff = staff.filter((s) => !s.group && !s.isOwner);
  const ownerStaff = staff.filter((s) => s.isOwner);

  const staffByGroup = groups.reduce(
    (acc, group) => {
      acc[group.id] = staff.filter(
        (s) => s.group?.id === group.id && !s.isOwner
      );
      return acc;
    },
    {} as Record<number, StaffWithRole[]>
  );

  const handleSuccess = () => {
    refetch();
    router.refresh();
  };

  const handleDragStart = (event: DragStartEvent) => {
    const member = event.active.data.current?.member as
      | StaffWithRole
      | undefined;
    setActiveStaff(member ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveStaff(null);

    const { active, over } = event;
    if (!over || !active.data.current?.member) return;

    const member = active.data.current.member as StaffWithRole;
    const targetGroupId = over.id as string;

    // Don't move if dropping on same group
    const currentGroupId = member.group?.id?.toString() ?? UNASSIGNED_GROUP_ID;
    if (currentGroupId === targetGroupId) return;

    // Don't allow dropping to unassigned (for now)
    if (targetGroupId === UNASSIGNED_GROUP_ID) {
      toast.error("Cannot move staff to Unassigned. Remove them instead.");
      return;
    }

    // Find the target group
    const targetGroup = groups.find((g) => g.id.toString() === targetGroupId);
    if (!targetGroup) return;

    // Check permissions
    const targetRole = targetGroup.role?.name ?? null;
    if (!canManageGroup(currentUserRole ?? null, isOwner, targetRole)) {
      toast.error("You don't have permission to assign staff to this group");
      return;
    }

    // Apply optimistic update immediately
    setOptimisticMoves((prev) => {
      const next = new Map(prev);
      next.set(member.user_id, { groupId: targetGroup.id, group: targetGroup });
      return next;
    });

    setIsMoving(true);
    try {
      const result = await moveStaffToGroup(
        organizationId,
        member.user_id,
        targetGroup.id,
        orgSlug
      );

      if (result.success) {
        toast.success(
          `Moved ${getDisplayName(
            member.user?.first_name ?? null,
            member.user?.last_name ?? null,
            member.user?.username ?? null
          )} to ${targetGroup.name}`
        );
        handleSuccess();
      } else {
        // Revert optimistic update on error
        setOptimisticMoves((prev) => {
          const next = new Map(prev);
          next.delete(member.user_id);
          return next;
        });
        toast.error(result.error);
      }
    } catch {
      // Revert optimistic update on error
      setOptimisticMoves((prev) => {
        const next = new Map(prev);
        next.delete(member.user_id);
        return next;
      });
      toast.error("Failed to move staff member");
    } finally {
      setIsMoving(false);
    }
  };

  const handleDragCancel = () => {
    setActiveStaff(null);
  };

  // Check if user can drag (has any management permissions)
  const canDragAny =
    isOwner ||
    (currentUserRole && (ROLE_HIERARCHY[currentUserRole]?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff Management</h2>
          <p className="text-muted-foreground text-sm">
            {canDragAny
              ? "Drag and drop staff between groups to assign roles"
              : "View your organization's staff"}
          </p>
        </div>
        {isOwner && (
          <Button className="gap-2" onClick={() => setIsInviteOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Loading State */}
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-4">
            {/* Owner Section (not droppable) */}
            {ownerStaff.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <CardTitle className="text-base">Owner</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {ownerStaff.map((member) => (
                      <DraggableStaffCard
                        key={member.user_id}
                        member={member}
                        canDrag={false}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Group Sections */}
            {groups.map((group) => {
              const targetRole = group.role?.name ?? null;
              const canDropHere = canManageGroup(
                currentUserRole ?? null,
                isOwner,
                targetRole
              );

              return (
                <DroppableGroup
                  key={group.id}
                  groupId={group.id.toString()}
                  title={group.name}
                  description={group.role?.description ?? undefined}
                  members={staffByGroup[group.id] ?? []}
                  canDrop={canDropHere && !isMoving}
                  canDrag={!!canDragAny}
                  colorClass={GROUP_COLORS[targetRole ?? ""] ?? ""}
                  onRemoveMember={
                    isOwner ? (m) => setRemoveStaff(m) : undefined
                  }
                />
              );
            })}

            {/* Unassigned Section (at bottom) */}
            <DroppableGroup
              groupId={UNASSIGNED_GROUP_ID}
              title="Unassigned"
              description="New staff members appear here until assigned to a group"
              members={unassignedStaff}
              canDrop={false}
              canDrag={!!canDragAny}
              colorClass="border-dashed"
              onRemoveMember={isOwner ? (m) => setRemoveStaff(m) : undefined}
            />
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeStaff ? <StaffCardOverlay member={activeStaff} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Dialogs */}
      <InviteStaffDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        organizationId={organizationId}
        orgSlug={orgSlug}
        onSuccess={handleSuccess}
      />

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
