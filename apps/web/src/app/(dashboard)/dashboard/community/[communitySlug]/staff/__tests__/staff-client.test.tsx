import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- next/navigation ---
const mockRouterRefresh = jest.fn();
const mockRouterPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: mockRouterRefresh }),
}));

// --- @/lib/supabase ---
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(),
}));

// --- @trainers/supabase ---
jest.mock("@trainers/supabase", () => ({
  listCommunityStaffWithRoles: jest.fn(),
}));

// --- server actions ---
const mockMoveStaffToGroup = jest.fn();
const mockUnassignStaffAction = jest.fn();
jest.mock("@/actions/staff", () => ({
  moveStaffToGroup: (...args: unknown[]) => mockMoveStaffToGroup(...args),
  unassignStaffAction: (...args: unknown[]) => mockUnassignStaffAction(...args),
  searchUsersForStaffInvite: jest.fn(),
  inviteStaffMember: jest.fn(),
  removeStaffMember: jest.fn(),
}));

// --- sonner ---
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// --- @dnd-kit/core ---
jest.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-context">{children}</div>
  ),
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(() => ({})),
  useSensors: jest.fn(() => []),
  useDraggable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  })),
  useDroppable: jest.fn(() => ({
    setNodeRef: jest.fn(),
    isOver: false,
  })),
}));

// --- @dnd-kit/utilities ---
jest.mock("@dnd-kit/utilities", () => ({
  CSS: { Translate: { toString: jest.fn(() => "") } },
}));

// --- InviteStaffDialog ---
jest.mock(
  "@/app/(app)/to-dashboard/[communitySlug]/staff/invite-staff-dialog",
  () => ({
    InviteStaffDialog: ({
      open,
      onOpenChange,
    }: {
      open: boolean;
      onOpenChange: (v: boolean) => void;
    }) =>
      open ? (
        <div data-testid="invite-dialog">
          <button onClick={() => onOpenChange(false)}>Close Invite</button>
        </div>
      ) : null,
  })
);

// --- RemoveStaffDialog ---
jest.mock(
  "@/app/(app)/to-dashboard/[communitySlug]/staff/remove-staff-dialog",
  () => ({
    RemoveStaffDialog: ({
      open,
      onOpenChange,
    }: {
      open: boolean;
      onOpenChange: (v: boolean) => void;
      staff: unknown;
      onSuccess: () => void;
    }) =>
      open ? (
        <div data-testid="remove-dialog">
          <button onClick={() => onOpenChange(false)}>Close Remove</button>
        </div>
      ) : null,
  })
);

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Plus: () => <svg data-testid="icon-plus" />,
  Loader2: () => <svg data-testid="icon-loader" />,
  Crown: () => <svg data-testid="icon-crown" />,
  GripVertical: () => <svg data-testid="icon-grip" />,
  Search: () => <svg data-testid="icon-search" />,
  Users: () => <svg data-testid="icon-users" />,
}));

import React from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import { StaffClient } from "../staff-client";
import type { StaffWithRole, CommunityGroup } from "@trainers/supabase";

const mockUseSupabaseQuery = useSupabaseQuery as jest.MockedFunction<
  typeof useSupabaseQuery
>;

// =============================================================================
// Helpers
// =============================================================================

function makeStaffMember(
  overrides: Partial<StaffWithRole> = {}
): StaffWithRole {
  return {
    user_id: "user-1",
    community_id: 10,
    isOwner: false,
    group: null,
    role: null,
    user: {
      username: "ash_ketchum",
      first_name: "Ash",
      last_name: "Ketchum",
      image: null,
    },
    ...overrides,
  } as StaffWithRole;
}

function makeGroup(overrides: Partial<CommunityGroup> = {}): CommunityGroup {
  return {
    id: 1,
    name: "Admins",
    community_id: 10,
    role_id: 1,
    role: {
      id: 1,
      name: "org_admin",
      description: "Community administrator",
    },
    ...overrides,
  } as CommunityGroup;
}

const defaultProps = {
  communityId: 10,
  communitySlug: "pallet-town",
  initialStaff: [],
  groups: [],
  isOwner: true,
  currentUserId: "user-owner",
  currentUserRole: null,
};

function setupQuery(data: StaffWithRole[] | undefined, isLoading = false) {
  mockUseSupabaseQuery.mockReturnValue({
    data,
    isLoading,
    error: null,
    refetch: jest.fn(),
  } as ReturnType<typeof useSupabaseQuery>);
}

// =============================================================================
// Tests
// =============================================================================

describe("StaffClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  describe("empty state", () => {
    it("renders empty state when no staff and not loading", () => {
      setupQuery([]);
      render(<StaffClient {...defaultProps} />);
      expect(screen.getByText("No staff members yet")).toBeInTheDocument();
    });

    it("shows Add Staff button in empty state for owners", () => {
      setupQuery([]);
      render(<StaffClient {...defaultProps} isOwner={true} />);
      expect(
        screen.getByRole("button", { name: /add staff/i })
      ).toBeInTheDocument();
    });

    it("does not show Add Staff button in empty state for non-owners", () => {
      setupQuery([]);
      render(<StaffClient {...defaultProps} isOwner={false} />);
      expect(
        screen.queryByRole("button", { name: /add staff/i })
      ).not.toBeInTheDocument();
    });

    it("opens InviteStaffDialog when Add Staff is clicked in empty state", async () => {
      setupQuery([]);
      const user = userEvent.setup();
      render(<StaffClient {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /add staff/i }));
      expect(screen.getByTestId("invite-dialog")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  describe("loading state", () => {
    it("shows loading spinner while data is loading with no initial staff", () => {
      setupQuery(undefined, true);
      render(<StaffClient {...defaultProps} initialStaff={[]} />);
      // Uses initialStaff fallback — spinner only when isLoading && staff.length === 0
      expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
    });

    it("uses initialStaff when server data is not yet available", () => {
      const initial = [makeStaffMember({ user_id: "u1" })];
      setupQuery(undefined, false);
      render(<StaffClient {...defaultProps} initialStaff={initial} />);
      expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Populated state
  // ---------------------------------------------------------------------------

  describe("with staff members", () => {
    it("renders Staff Management heading", () => {
      setupQuery([makeStaffMember()]);
      render(<StaffClient {...defaultProps} />);
      expect(screen.getByText("Staff Management")).toBeInTheDocument();
    });

    it("shows Add Staff button in heading for owners", () => {
      setupQuery([makeStaffMember()]);
      render(<StaffClient {...defaultProps} isOwner={true} />);
      expect(
        screen.getByRole("button", { name: /add staff/i })
      ).toBeInTheDocument();
    });

    it("does not show Add Staff button in heading for non-owners", () => {
      setupQuery([makeStaffMember()]);
      render(
        <StaffClient {...defaultProps} isOwner={false} currentUserRole={null} />
      );
      expect(
        screen.queryByRole("button", { name: /add staff/i })
      ).not.toBeInTheDocument();
    });

    it("shows drag hint for users with drag permissions", () => {
      setupQuery([makeStaffMember()]);
      render(<StaffClient {...defaultProps} isOwner={true} />);
      expect(
        screen.getByText("Drag staff between columns to assign roles")
      ).toBeInTheDocument();
    });

    it("does not show drag hint when user has no drag permissions", () => {
      setupQuery([makeStaffMember()]);
      render(
        <StaffClient
          {...defaultProps}
          isOwner={false}
          currentUserRole="org_judge"
        />
      );
      expect(
        screen.queryByText("Drag staff between columns to assign roles")
      ).not.toBeInTheDocument();
    });

    it("shows DnD context for staff layout", () => {
      setupQuery([makeStaffMember()]);
      render(<StaffClient {...defaultProps} />);
      expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
    });

    it("renders the Unassigned panel header", () => {
      setupQuery([makeStaffMember()]);
      render(<StaffClient {...defaultProps} />);
      expect(screen.getByText("Unassigned")).toBeInTheDocument();
    });

    it("renders staff display name in unassigned panel", () => {
      setupQuery([makeStaffMember({ user_id: "u1" })]);
      render(<StaffClient {...defaultProps} />);
      expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    });

    it("renders owner staff in owner group", () => {
      const owner = makeStaffMember({ user_id: "u-owner", isOwner: true });
      setupQuery([owner]);
      render(<StaffClient {...defaultProps} />);
      expect(screen.getByText("Owner")).toBeInTheDocument();
    });

    it("renders role group when groups provided and staff assigned", () => {
      const group = makeGroup({ id: 1, name: "Admins" });
      const staffInGroup = makeStaffMember({
        user_id: "u2",
        group: group as CommunityGroup,
        role: { id: 1, name: "org_admin", description: null },
      });
      setupQuery([staffInGroup]);
      render(<StaffClient {...defaultProps} groups={[group]} />);
      expect(screen.getByText("Admins")).toBeInTheDocument();
    });

    it("renders username-based display when first/last name absent", () => {
      const member = makeStaffMember({
        user: {
          username: "brock123",
          first_name: null,
          last_name: null,
          image: null,
        },
      });
      setupQuery([member]);
      render(<StaffClient {...defaultProps} />);
      expect(screen.getByText("brock123")).toBeInTheDocument();
    });

    it("renders initials fallback when only first name present", () => {
      const member = makeStaffMember({
        user: {
          username: null,
          first_name: "Misty",
          last_name: null,
          image: null,
        },
      });
      setupQuery([member]);
      render(<StaffClient {...defaultProps} />);
      // initials = "MI"
      expect(screen.getByText("MI")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Search filter
  // ---------------------------------------------------------------------------

  describe("search filter in unassigned panel", () => {
    it("filters staff by display name when search term is entered", async () => {
      const members = [
        makeStaffMember({
          user_id: "u1",
          user: {
            username: "ash",
            first_name: "Ash",
            last_name: "Ketchum",
            image: null,
          },
        }),
        makeStaffMember({
          user_id: "u2",
          user: {
            username: "brock",
            first_name: "Brock",
            last_name: null,
            image: null,
          },
        }),
      ];
      setupQuery(members);
      const user = userEvent.setup();
      render(<StaffClient {...defaultProps} />);

      const input = screen.getByPlaceholderText("Search staff...");
      await user.type(input, "brock");

      expect(screen.queryByText("Ash Ketchum")).not.toBeInTheDocument();
      expect(screen.getByText("Brock")).toBeInTheDocument();
    });

    it("shows 'No staff match your search' when search yields no results", async () => {
      setupQuery([makeStaffMember()]);
      const user = userEvent.setup();
      render(<StaffClient {...defaultProps} />);

      await user.type(screen.getByPlaceholderText("Search staff..."), "zzz");
      expect(
        screen.getByText("No staff match your search")
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Invite dialog
  // ---------------------------------------------------------------------------

  describe("InviteStaffDialog integration", () => {
    it("opens invite dialog when Add Staff is clicked in heading", async () => {
      setupQuery([makeStaffMember()]);
      const user = userEvent.setup();
      render(<StaffClient {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /add staff/i }));
      expect(screen.getByTestId("invite-dialog")).toBeInTheDocument();
    });

    it("closes invite dialog when onOpenChange(false) is called", async () => {
      setupQuery([makeStaffMember()]);
      const user = userEvent.setup();
      render(<StaffClient {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /add staff/i }));
      expect(screen.getByTestId("invite-dialog")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Close Invite" }));
      expect(screen.queryByTestId("invite-dialog")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Error toast
  // ---------------------------------------------------------------------------

  describe("query error handling", () => {
    it("does not crash when queryError is null", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as ReturnType<typeof useSupabaseQuery>);
      render(<StaffClient {...defaultProps} />);
      expect(screen.getByText("No staff members yet")).toBeInTheDocument();
    });

    it("shows error toast when query fails", async () => {
      const { toast } = await import("sonner");
      mockUseSupabaseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Network error"),
        refetch: jest.fn(),
      } as ReturnType<typeof useSupabaseQuery>);
      render(<StaffClient {...defaultProps} />);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to load staff members. Please try refreshing."
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // canManageGroup logic (via canDrag hint visibility)
  // ---------------------------------------------------------------------------

  describe("role-based permission rendering", () => {
    it.each([
      { role: "org_admin", label: "drag hint shown", expectHint: true },
      { role: "org_head_judge", label: "drag hint shown", expectHint: true },
      { role: "org_judge", label: "drag hint NOT shown", expectHint: false },
    ])("$label for currentUserRole=$role", ({ role, expectHint }) => {
      setupQuery([makeStaffMember()]);
      render(
        <StaffClient {...defaultProps} isOwner={false} currentUserRole={role} />
      );
      const hint = screen.queryByText(
        "Drag staff between columns to assign roles"
      );
      if (expectHint) {
        expect(hint).toBeInTheDocument();
      } else {
        expect(hint).not.toBeInTheDocument();
      }
    });
  });
});
