"use client";

import { useState, useEffect } from "react";
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
  listCommunityStaffWithRoles,
  type StaffWithRole,
  type CommunityGroup,
} from "@trainers/supabase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Loader2,
  Crown,
  GripVertical,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InviteStaffDialog } from "@/app/(app)/to-dashboard/[communitySlug]/staff/invite-staff-dialog";
import { RemoveStaffDialog } from "@/app/(app)/to-dashboard/[communitySlug]/staff/remove-staff-dialog";
import { moveStaffToGroup, unassignStaffAction } from "@/actions/staff";

// =============================================================================
// Types & Constants
// =============================================================================

interface StaffClientProps {
  communityId: number;
  communitySlug: string;
  initialStaff: StaffWithRole[];
  groups: CommunityGroup[];
  isOwner: boolean;
  currentUserId?: string;
  currentUserRole?: string | null;
}

const UNASSIGNED_GROUP_ID = "unassigned";

// Role hierarchy: who can manage whom
const ROLE_HIERARCHY: Record<string, string[]> = {
  owner: ["org_admin", "org_head_judge", "org_judge"],
  org_admin: ["org_head_judge", "org_judge"],
  org_head_judge: ["org_judge"],
  org_judge: [],
};

// Color dot class per role
const ROLE_DOT_COLORS: Record<string, string> = {
  org_admin: "bg-purple-500",
  org_head_judge: "bg-blue-500",
  org_judge: "bg-emerald-500",
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
// Draggable Staff Row (compact, for both panels)
// =============================================================================

interface DraggableStaffRowProps {
  member: StaffWithRole;
  canDrag: boolean;
  showRemoveTooltip?: string;
  onRemove?: () => void;
}

function DraggableStaffRow({
  member,
  canDrag,
  showRemoveTooltip = "Remove from community",
  onRemove,
}: DraggableStaffRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: member.user_id,
      disabled: !canDrag || member.isOwner,
      data: { member },
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
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
        "group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        "hover:bg-muted/60",
        isDragging && "opacity-40",
        canDrag && !member.isOwner && "cursor-grab active:cursor-grabbing"
      )}
    >
      {/* Drag handle */}
      {canDrag && !member.isOwner ? (
        <div
          {...attributes}
          {...listeners}
          className="text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0 cursor-grab"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      ) : (
        <div className="w-3.5 flex-shrink-0" />
      )}

      {/* Avatar */}
      <Avatar className="h-6 w-6 flex-shrink-0">
        {member.user?.image && (
          <AvatarImage src={member.user.image} alt={displayName} />
        )}
        <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
      </Avatar>

      {/* Name */}
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
        {displayName}
      </span>

      {/* Remove button — appears on row hover */}
      {onRemove && !member.isOwner && (
        <button
          onClick={onRemove}
          title={showRemoveTooltip}
          className={cn(
            "flex-shrink-0 rounded px-1 py-0.5",
            "text-muted-foreground/0 group-hover:text-muted-foreground/60",
            "hover:!text-destructive text-[11px] font-medium transition-colors"
          )}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Drag Overlay Card
// =============================================================================

function StaffDragOverlay({ member }: { member: StaffWithRole }) {
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
    <div className="bg-background flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm shadow-lg">
      <GripVertical className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
      <Avatar className="h-6 w-6 flex-shrink-0">
        {member.user?.image && (
          <AvatarImage src={member.user.image} alt={displayName} />
        )}
        <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-[13px] font-medium">{displayName}</span>
    </div>
  );
}

// =============================================================================
// Left Panel — Unassigned Pool
// =============================================================================

interface UnassignedPanelProps {
  members: StaffWithRole[];
  canDrag: boolean;
  isOwner: boolean;
  onRemoveMember?: (member: StaffWithRole) => void;
}

function UnassignedPanel({
  members,
  canDrag,
  isOwner,
  onRemoveMember,
}: UnassignedPanelProps) {
  const [search, setSearch] = useState("");

  const { setNodeRef, isOver } = useDroppable({
    id: UNASSIGNED_GROUP_ID,
  });

  const filtered =
    search.trim().length === 0
      ? members
      : members.filter((m) => {
          const name = getDisplayName(
            m.user?.first_name ?? null,
            m.user?.last_name ?? null,
            m.user?.username ?? null
          ).toLowerCase();
          const username = (m.user?.username ?? "").toLowerCase();
          const q = search.toLowerCase();
          return name.includes(q) || username.includes(q);
        });

  return (
    <div
      className={cn(
        "bg-card flex flex-col overflow-hidden rounded-lg shadow-sm transition-colors",
        isOver && "ring-primary ring-2 ring-offset-2"
      )}
    >
      {/* Panel header */}
      <div className="bg-muted/40 flex items-center justify-between border-b px-3 py-2">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          Unassigned
        </span>
        <span className="text-muted-foreground text-[11px]">
          {members.length} {members.length === 1 ? "staff" : "staff"}
        </span>
      </div>

      {/* Search */}
      <div className="border-b px-2 py-1.5">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "bg-background w-full rounded-md border py-1 pr-2 pl-6 text-[12px]",
              "placeholder:text-muted-foreground outline-none",
              "focus:ring-ring focus:ring-1"
            )}
          />
        </div>
      </div>

      {/* Scrollable list — drop target */}
      <div
        ref={setNodeRef}
        className="min-h-[120px] flex-1 overflow-y-auto p-1"
      >
        {filtered.length === 0 ? (
          <p className="text-muted-foreground px-2 py-4 text-center text-[11px]">
            {members.length === 0
              ? "No unassigned staff"
              : "No staff match your search"}
          </p>
        ) : (
          filtered.map((member) => (
            <DraggableStaffRow
              key={member.user_id}
              member={member}
              canDrag={canDrag}
              showRemoveTooltip="Remove from community"
              onRemove={isOwner ? () => onRemoveMember?.(member) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Right Panel — Role Groups
// =============================================================================

interface RoleGroupProps {
  group: CommunityGroup;
  members: StaffWithRole[];
  canDrop: boolean;
  canDrag: boolean;
  onRemoveMember?: (member: StaffWithRole) => void;
  onUnassignMember?: (member: StaffWithRole) => void;
}

function RoleGroup({
  group,
  members,
  canDrop,
  canDrag,
  onRemoveMember,
  onUnassignMember,
}: RoleGroupProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: group.id.toString(),
    disabled: !canDrop,
  });

  const roleName = group.role?.name ?? "";
  const dotColor = ROLE_DOT_COLORS[roleName] ?? "bg-muted-foreground";

  return (
    <div
      className={cn(
        "bg-card overflow-hidden rounded-lg shadow-sm transition-colors",
        isOver && canDrop && "ring-primary ring-2 ring-offset-2",
        !canDrop && "opacity-60"
      )}
    >
      {/* Group header */}
      <div className="bg-muted/40 flex items-center justify-between border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn("h-2 w-2 flex-shrink-0 rounded-full", dotColor)}
          />
          <span className="text-muted-foreground truncate text-[10px] font-semibold tracking-wide uppercase">
            {group.name}
          </span>
          {group.role?.description && (
            <span className="text-muted-foreground hidden truncate text-[10px] sm:inline">
              {group.role.description}
            </span>
          )}
        </div>
        <span className="text-muted-foreground ml-2 flex-shrink-0 text-[11px]">
          {members.length}
        </span>
      </div>

      {/* Members drop zone */}
      <div ref={setNodeRef} className="min-h-[36px] p-1">
        {members.length === 0 ? (
          <div className="text-muted-foreground/60 mx-1 my-1 rounded border border-dashed py-1.5 text-center text-[10px]">
            Drop here
          </div>
        ) : (
          members.map((member) => (
            <DraggableStaffRow
              key={member.user_id}
              member={member}
              canDrag={canDrag}
              showRemoveTooltip="Unassign (move to pool)"
              onRemove={
                onUnassignMember
                  ? () => onUnassignMember(member)
                  : onRemoveMember
                    ? () => onRemoveMember(member)
                    : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Owner Group (non-droppable, non-draggable)
// =============================================================================

function OwnerGroup({ members }: { members: StaffWithRole[] }) {
  if (members.length === 0) return null;

  return (
    <div className="bg-card overflow-hidden rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
        <Crown className="h-3 w-3 flex-shrink-0 text-amber-500" />
        <span className="text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-300">
          Owner
        </span>
      </div>

      {/* Members */}
      <div className="p-1">
        {members.map((member) => (
          <DraggableStaffRow
            key={member.user_id}
            member={member}
            canDrag={false}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function StaffClient({
  communityId,
  communitySlug,
  initialStaff,
  groups,
  isOwner,
  currentUserId: _currentUserId,
  currentUserRole,
}: StaffClientProps) {
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
  const queryFn = (
    supabase: Parameters<typeof listCommunityStaffWithRoles>[0]
  ) => listCommunityStaffWithRoles(supabase, communityId);

  const {
    data: staffMembers,
    isLoading,
    error: queryError,
    refetch,
  } = useSupabaseQuery(queryFn, [communityId]);

  useEffect(() => {
    if (queryError) {
      toast.error("Failed to load staff members. Please try refreshing.");
    }
  }, [queryError]);

  // Optimistic state for drag & drop
  const [optimisticMoves, setOptimisticMoves] = useState<
    Map<string, { group: CommunityGroup | null }>
  >(new Map());

  // Clear optimistic moves when server confirms
  useEffect(() => {
    if (staffMembers) {
      setOptimisticMoves(new Map());
    }
  }, [staffMembers]);

  // Apply optimistic moves to staff data
  const baseStaff = staffMembers ?? initialStaff;
  const staff =
    optimisticMoves.size === 0
      ? baseStaff
      : baseStaff.map((member) => {
          const optimisticMove = optimisticMoves.get(member.user_id);
          if (optimisticMove !== undefined) {
            return { ...member, group: optimisticMove.group };
          }
          return member;
        });

  // Partition staff
  const ownerStaff = staff.filter((s) => s.isOwner);
  const unassignedStaff = staff.filter((s) => !s.group && !s.isOwner);
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

    // Dropping onto the unassigned panel → unassign
    if (targetGroupId === UNASSIGNED_GROUP_ID) {
      // Only allow unassign if user can manage the member's current group
      const currentRole = member.role?.name ?? null;
      if (!canManageGroup(currentUserRole ?? null, isOwner, currentRole)) {
        toast.error("You don't have permission to unassign this staff member");
        return;
      }

      // Optimistic update
      setOptimisticMoves((prev) => {
        const next = new Map(prev);
        next.set(member.user_id, { group: null });
        return next;
      });

      setIsMoving(true);
      try {
        const result = await unassignStaffAction(
          communityId,
          member.user_id,
          communitySlug
        );

        if (result.success) {
          const name = getDisplayName(
            member.user?.first_name ?? null,
            member.user?.last_name ?? null,
            member.user?.username ?? null
          );
          toast.success(`${name} moved to unassigned`);
          handleSuccess();
        } else {
          setOptimisticMoves((prev) => {
            const next = new Map(prev);
            next.delete(member.user_id);
            return next;
          });
          toast.error(result.error);
        }
      } catch {
        setOptimisticMoves((prev) => {
          const next = new Map(prev);
          next.delete(member.user_id);
          return next;
        });
        toast.error("Failed to unassign staff member");
      } finally {
        setIsMoving(false);
      }
      return;
    }

    // Dropping onto a role group → assign
    const targetGroup = groups.find((g) => g.id.toString() === targetGroupId);
    if (!targetGroup) return;

    const targetRole = targetGroup.role?.name ?? null;
    if (!canManageGroup(currentUserRole ?? null, isOwner, targetRole)) {
      toast.error("You don't have permission to assign staff to this group");
      return;
    }

    // Optimistic update
    setOptimisticMoves((prev) => {
      const next = new Map(prev);
      next.set(member.user_id, { group: targetGroup });
      return next;
    });

    setIsMoving(true);
    try {
      const result = await moveStaffToGroup(
        communityId,
        member.user_id,
        targetGroup.id,
        communitySlug
      );

      if (result.success) {
        const name = getDisplayName(
          member.user?.first_name ?? null,
          member.user?.last_name ?? null,
          member.user?.username ?? null
        );
        toast.success(`${name} moved to ${targetGroup.name}`);
        handleSuccess();
      } else {
        setOptimisticMoves((prev) => {
          const next = new Map(prev);
          next.delete(member.user_id);
          return next;
        });
        toast.error(result.error);
      }
    } catch {
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

  // Handle unassign via ✕ button in a role group
  const handleUnassignMember = async (member: StaffWithRole) => {
    setOptimisticMoves((prev) => {
      const next = new Map(prev);
      next.set(member.user_id, { group: null });
      return next;
    });

    try {
      const result = await unassignStaffAction(
        communityId,
        member.user_id,
        communitySlug
      );

      if (result.success) {
        const name = getDisplayName(
          member.user?.first_name ?? null,
          member.user?.last_name ?? null,
          member.user?.username ?? null
        );
        toast.success(`${name} moved to unassigned`);
        handleSuccess();
      } else {
        setOptimisticMoves((prev) => {
          const next = new Map(prev);
          next.delete(member.user_id);
          return next;
        });
        toast.error(result.error);
      }
    } catch {
      setOptimisticMoves((prev) => {
        const next = new Map(prev);
        next.delete(member.user_id);
        return next;
      });
      toast.error("Failed to unassign staff member");
    }
  };

  const canDragAny =
    isOwner ||
    (currentUserRole !== null &&
      currentUserRole !== undefined &&
      (ROLE_HIERARCHY[currentUserRole]?.length ?? 0) > 0);

  // Empty state
  if (!isLoading && staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Users className="text-muted-foreground h-10 w-10" />
        <div>
          <p className="font-semibold">No staff members yet</p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Add staff to help manage your community
          </p>
        </div>
        {isOwner && (
          <Button size="sm" onClick={() => setIsInviteOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Staff
          </Button>
        )}

        <InviteStaffDialog
          open={isInviteOpen}
          onOpenChange={setIsInviteOpen}
          communityId={communityId}
          communitySlug={communitySlug}
          onSuccess={handleSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Staff Management</h2>
          {canDragAny && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              Drag staff between columns to assign roles
            </p>
          )}
        </div>
        {isOwner && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setIsInviteOpen(true)}
            disabled={isMoving}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Loading spinner */}
      {isLoading && staff.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      )}

      {/* Two-column drag-drop layout */}
      {staff.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {/* Grid: stacks on mobile, side-by-side on md+ */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
            {/* Left: Unassigned pool */}
            <UnassignedPanel
              members={unassignedStaff}
              canDrag={!!canDragAny}
              isOwner={isOwner}
              onRemoveMember={(m) => setRemoveStaff(m)}
            />

            {/* Right: Role groups */}
            <div className="flex flex-col gap-3">
              {/* Owner (always first, non-droppable) */}
              <OwnerGroup members={ownerStaff} />

              {/* Role groups */}
              {groups.map((group) => {
                const targetRole = group.role?.name ?? null;
                const canDropHere = canManageGroup(
                  currentUserRole ?? null,
                  isOwner,
                  targetRole
                );

                return (
                  <RoleGroup
                    key={group.id}
                    group={group}
                    members={staffByGroup[group.id] ?? []}
                    canDrop={canDropHere && !isMoving}
                    canDrag={!!canDragAny}
                    onRemoveMember={
                      isOwner ? (m) => setRemoveStaff(m) : undefined
                    }
                    onUnassignMember={
                      canDropHere ? handleUnassignMember : undefined
                    }
                  />
                );
              })}
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeStaff ? <StaffDragOverlay member={activeStaff} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Dialogs */}
      <InviteStaffDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        communityId={communityId}
        communitySlug={communitySlug}
        onSuccess={handleSuccess}
      />

      {removeStaff && (
        <RemoveStaffDialog
          open={!!removeStaff}
          onOpenChange={(open: boolean) => !open && setRemoveStaff(null)}
          communityId={communityId}
          communitySlug={communitySlug}
          staff={removeStaff}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
