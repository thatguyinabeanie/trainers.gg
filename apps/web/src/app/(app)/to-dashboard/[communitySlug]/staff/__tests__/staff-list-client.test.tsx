import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- next/navigation ---
const mockRouterRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: mockRouterRefresh }),
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
jest.mock("@/actions/staff", () => ({
  moveStaffToGroup: (...args: unknown[]) => mockMoveStaffToGroup(...args),
  searchUsersForStaffInvite: jest.fn(),
  inviteStaffMember: jest.fn(),
  removeStaffMember: jest.fn(),
  unassignStaffAction: jest.fn(),
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
jest.mock("../invite-staff-dialog", () => ({
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
}));

// --- RemoveStaffDialog ---
jest.mock("../remove-staff-dialog", () => ({
  RemoveStaffDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
  }) =>
    open ? (
      <div data-testid="remove-dialog">
        <button onClick={() => onOpenChange(false)}>Close Remove</button>
      </div>
    ) : null,
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Users: () => <svg data-testid="icon-users" />,
  Plus: () => <svg data-testid="icon-plus" />,
  Loader2: () => <svg data-testid="icon-loader" />,
  Crown: () => <svg data-testid="icon-crown" />,
  GripVertical: () => <svg data-testid="icon-grip" />,
  UserMinus: () => <svg data-testid="icon-user-minus" />,
}));

import React from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import { StaffListClient } from "../staff-list-client";
import type { StaffWithRole, CommunityGroup } from "@trainers/supabase";

const mockUseSupabaseQuery = useSupabaseQuery as jest.MockedFunction<
  typeof useSupabaseQuery
>;

// =============================================================================
// Helpers
// =============================================================================

function makeStaff(overrides: Partial<StaffWithRole> = {}): StaffWithRole {
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
    name: "Head Judges",
    community_id: 10,
    role_id: 2,
    role: {
      id: 2,
      name: "org_head_judge",
      description: "Head judge role",
    },
    ...overrides,
  } as CommunityGroup;
}

function setupQuery(data: StaffWithRole[] | undefined, isLoading = false) {
  mockUseSupabaseQuery.mockReturnValue({
    data,
    isLoading,
    error: null,
    refetch: jest.fn(),
  } as ReturnType<typeof useSupabaseQuery>);
}

const defaultProps = {
  communityId: 10,
  communitySlug: "pallet-town",
  initialStaff: [],
  groups: [],
  isOwner: true,
  currentUserId: "owner-id",
  currentUserRole: null,
};

// =============================================================================
// Tests
// =============================================================================

describe("StaffListClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  describe("loading state", () => {
    it("shows a loading spinner when loading with no staff", () => {
      setupQuery(undefined, true);
      render(<StaffListClient {...defaultProps} initialStaff={[]} />);
      expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  describe("empty state", () => {
    it("renders empty state message when no staff members", () => {
      setupQuery([]);
      render(<StaffListClient {...defaultProps} />);
      expect(screen.getByText("No staff members")).toBeInTheDocument();
    });

    it("shows Add Staff button in empty state for owners", () => {
      setupQuery([]);
      render(<StaffListClient {...defaultProps} isOwner={true} />);
      const addButtons = screen.getAllByRole("button", { name: /add staff/i });
      expect(addButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("does not show Add Staff button in empty state for non-owners", () => {
      setupQuery([]);
      render(<StaffListClient {...defaultProps} isOwner={false} />);
      expect(
        screen.queryByRole("button", { name: /add staff/i })
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Populated state
  // ---------------------------------------------------------------------------

  describe("with staff members", () => {
    it("renders the Staff Management heading", () => {
      setupQuery([makeStaff()]);
      render(<StaffListClient {...defaultProps} />);
      expect(screen.getByText("Staff Management")).toBeInTheDocument();
    });

    it("shows drag-and-drop description for users with manage permissions", () => {
      setupQuery([makeStaff()]);
      render(<StaffListClient {...defaultProps} isOwner={true} />);
      expect(
        screen.getByText("Drag and drop staff between groups to assign roles")
      ).toBeInTheDocument();
    });

    it("shows view-only description for users without manage permissions", () => {
      setupQuery([makeStaff()]);
      render(
        <StaffListClient
          {...defaultProps}
          isOwner={false}
          currentUserRole={null}
        />
      );
      expect(
        screen.getByText("View your community's staff")
      ).toBeInTheDocument();
    });

    it("renders Add Staff button in heading for owners", () => {
      setupQuery([makeStaff()]);
      render(<StaffListClient {...defaultProps} isOwner={true} />);
      expect(
        screen.getByRole("button", { name: /add staff/i })
      ).toBeInTheDocument();
    });

    it("renders Unassigned group section", () => {
      setupQuery([makeStaff({ group: null })]);
      render(<StaffListClient {...defaultProps} />);
      expect(screen.getByText("Unassigned")).toBeInTheDocument();
    });

    it("renders staff display name in unassigned section", () => {
      setupQuery([makeStaff()]);
      render(<StaffListClient {...defaultProps} />);
      expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    });

    it("renders @username for unassigned staff", () => {
      setupQuery([makeStaff()]);
      render(<StaffListClient {...defaultProps} />);
      expect(screen.getByText("@ash_ketchum")).toBeInTheDocument();
    });

    it("renders owner section when owner staff present", () => {
      const owner = makeStaff({ user_id: "owner-1", isOwner: true });
      setupQuery([owner]);
      render(<StaffListClient {...defaultProps} />);
      expect(screen.getByText("Owner")).toBeInTheDocument();
    });

    it("renders Crown icon for owner section", () => {
      const owner = makeStaff({ isOwner: true });
      setupQuery([owner]);
      render(<StaffListClient {...defaultProps} />);
      const crowns = screen.getAllByTestId("icon-crown");
      expect(crowns.length).toBeGreaterThanOrEqual(1);
    });

    it("renders assigned group section", () => {
      const group = makeGroup({ id: 2, name: "Judges" });
      const staffInGroup = makeStaff({
        user_id: "u2",
        group: group as CommunityGroup,
        role: { id: 2, name: "org_judge", description: null },
      });
      setupQuery([staffInGroup]);
      render(<StaffListClient {...defaultProps} groups={[group]} />);
      expect(screen.getByText("Judges")).toBeInTheDocument();
    });

    it("renders 'Drag staff here' in empty droppable group for owners", () => {
      const group = makeGroup({ id: 1, name: "Admins" });
      setupQuery([makeStaff()]);
      render(<StaffListClient {...defaultProps} isOwner={true} groups={[group]} />);
      expect(screen.getByText("Drag staff here")).toBeInTheDocument();
    });

    it("shows 'No members' in group that cannot be dropped into", () => {
      const group = makeGroup({ id: 1, name: "Admins" });
      setupQuery([makeStaff()]);
      render(
        <StaffListClient
          {...defaultProps}
          isOwner={false}
          currentUserRole="org_judge"
          groups={[group]}
        />
      );
      expect(screen.getByText("No members")).toBeInTheDocument();
    });

    it("uses initialStaff when server data is undefined", () => {
      const initial = [makeStaff({ user_id: "init-1" })];
      setupQuery(undefined, false);
      render(<StaffListClient {...defaultProps} initialStaff={initial} />);
      expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    });

    it("renders member count in group header", () => {
      const group = makeGroup({ id: 1, name: "Admins" });
      const staffInGroup = makeStaff({
        user_id: "u2",
        group: group as CommunityGroup,
      });
      setupQuery([staffInGroup]);
      render(<StaffListClient {...defaultProps} groups={[group]} />);
      expect(screen.getByText("1 member")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Invite dialog
  // ---------------------------------------------------------------------------

  describe("InviteStaffDialog integration", () => {
    it("opens invite dialog when Add Staff button is clicked", async () => {
      setupQuery([makeStaff()]);
      const user = userEvent.setup();
      render(<StaffListClient {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /add staff/i }));
      expect(screen.getByTestId("invite-dialog")).toBeInTheDocument();
    });

    it("closes invite dialog on dismiss", async () => {
      setupQuery([makeStaff()]);
      const user = userEvent.setup();
      render(<StaffListClient {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /add staff/i }));
      await user.click(screen.getByRole("button", { name: "Close Invite" }));
      expect(screen.queryByTestId("invite-dialog")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Query error
  // ---------------------------------------------------------------------------

  describe("query error", () => {
    it("shows error toast when query fails", async () => {
      const { toast } = await import("sonner");
      mockUseSupabaseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("DB error"),
        refetch: jest.fn(),
      } as ReturnType<typeof useSupabaseQuery>);
      render(<StaffListClient {...defaultProps} />);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to load staff members. Please try refreshing."
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Role-based permissions
  // ---------------------------------------------------------------------------

  describe("role-based permission rendering", () => {
    it.each([
      { role: "org_admin", showDragHint: true },
      { role: "org_head_judge", showDragHint: true },
      { role: "org_judge", showDragHint: false },
    ])(
      "shows drag hint=$showDragHint when currentUserRole=$role",
      ({ role, showDragHint }) => {
        setupQuery([makeStaff()]);
        render(
          <StaffListClient
            {...defaultProps}
            isOwner={false}
            currentUserRole={role}
          />
        );
        const hint = screen.queryByText(
          "Drag and drop staff between groups to assign roles"
        );
        if (showDragHint) {
          expect(hint).toBeInTheDocument();
        } else {
          expect(hint).not.toBeInTheDocument();
        }
      }
    );
  });

  // ---------------------------------------------------------------------------
  // Display name edge cases
  // ---------------------------------------------------------------------------

  describe("display name resolution", () => {
    it("shows username when first/last name are null", () => {
      setupQuery([
        makeStaff({
          user: { username: "misty99", first_name: null, last_name: null, image: null },
        }),
      ]);
      render(<StaffListClient {...defaultProps} />);
      expect(screen.getByText("misty99")).toBeInTheDocument();
    });

    it("shows only first name when last name is null", () => {
      setupQuery([
        makeStaff({
          user: { username: "brock", first_name: "Brock", last_name: null, image: null },
        }),
      ]);
      render(<StaffListClient {...defaultProps} />);
      expect(screen.getByText("Brock")).toBeInTheDocument();
    });

    it("shows Unknown when all name fields are null", () => {
      setupQuery([
        makeStaff({
          user: { username: null, first_name: null, last_name: null, image: null },
        }),
      ]);
      render(<StaffListClient {...defaultProps} />);
      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });
  });
});
