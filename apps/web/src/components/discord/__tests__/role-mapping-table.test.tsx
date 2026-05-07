/**
 * Tests for RoleMappingTable
 */

const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

const mockUseIsClient = jest.fn();
jest.mock("@/hooks/use-is-client", () => ({
  useIsClient: () => mockUseIsClient(),
}));

// Capture onRoleChange and onToggle so tests can invoke them directly.
// Base UI Select does not expose ARIA options in JSDOM, so we drive the mobile
// path for the freshly-upserted-row test instead of clicking the desktop Select.
let capturedOnRoleChange:
  | ((roleType: string, discordRoleId: string) => void)
  | null = null;
let capturedOnToggle: ((roleType: string, enabled: boolean) => void) | null =
  null;

jest.mock("../role-mapping-cards", () => ({
  RoleMappingCards: (props: {
    rows?: { roleType: string }[];
    onRoleChange?: (roleType: string, discordRoleId: string) => void;
    onToggle?: (roleType: string, enabled: boolean) => void;
  }) => {
    capturedOnRoleChange = props.onRoleChange ?? null;
    capturedOnToggle = props.onToggle ?? null;
    return (
      <div
        data-testid="role-mapping-cards"
        data-row-count={props.rows?.length ?? 0}
      />
    );
  },
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockToggleRoleMappingAction = jest.fn();
const mockUpsertRoleMappingAction = jest.fn();

jest.mock("@/actions/discord-integration", () => ({
  toggleRoleMappingAction: (...args: unknown[]) =>
    mockToggleRoleMappingAction(...args),
  upsertRoleMappingAction: (...args: unknown[]) =>
    mockUpsertRoleMappingAction(...args),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("../picker-refresh-button", () => ({
  PickerRefreshButton: ({ serverId }: { serverId: number }) => (
    <button data-testid={`refresh-${serverId}`} type="button">
      Refresh
    </button>
  ),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import React from "react";
import { toast } from "sonner";
import { RoleMappingTable } from "../role-mapping-table";
import type { DiscordRoleMapping } from "@trainers/supabase";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRoleMapping(
  overrides: Partial<DiscordRoleMapping> = {}
): DiscordRoleMapping {
  return {
    id: 1,
    discord_server_id: 10,
    role_type: "staff",
    discord_role_id: "role-aaa",
    enabled: true,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const guildRoles = [
  { id: "role-aaa", name: "Moderator", managed: false, position: 2 },
  { id: "role-bbb", name: "Member", managed: false, position: 1 },
] as never[];

const defaultProps = {
  roleMappings: [makeRoleMapping()],
  guildRoles,
  serverId: 10,
  communityId: 42,
  hasHierarchyViolation: false,
};

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseIsClient.mockReturnValue(true);
  mockUseIsMobile.mockReturnValue(false);
  mockToggleRoleMappingAction.mockResolvedValue({
    success: true,
    data: undefined,
  });
  mockUpsertRoleMappingAction.mockResolvedValue({
    success: true,
    data: { mappingId: 999 },
  });
});

describe("RoleMappingTable", () => {
  describe("rendering", () => {
    it("renders all 6 role type rows", () => {
      render(<RoleMappingTable {...defaultProps} />);

      expect(screen.getByText("Staff")).toBeInTheDocument();
      expect(screen.getByText("Member")).toBeInTheDocument();
      expect(screen.getByText("Participant")).toBeInTheDocument();
      expect(screen.getByText("Winner")).toBeInTheDocument();
      expect(screen.getByText("Currently playing")).toBeInTheDocument();
      expect(screen.getByText("Verified")).toBeInTheDocument();
    });

    it("shows trophy emoji for the winner role", () => {
      render(<RoleMappingTable {...defaultProps} />);

      // The winner row should contain the 🏆 emoji
      const winnerRow = screen
        .getAllByRole("row")
        .find((row) => row.textContent?.includes("Winner"));
      expect(winnerRow?.textContent).toContain("🏆");
    });

    it("shows the hierarchy violation banner when hasHierarchyViolation is true", () => {
      render(
        <RoleMappingTable {...defaultProps} hasHierarchyViolation={true} />
      );

      // The "Move Beanie Bot" copy is split across text + <strong>, so match
      // against the alert's full textContent rather than a single text node.
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(/Move\s+Beanie Bot\s+above/);
    });

    it("does not show hierarchy banner when hasHierarchyViolation is false", () => {
      render(<RoleMappingTable {...defaultProps} />);

      expect(screen.queryByText(/Move.*Beanie Bot/)).not.toBeInTheDocument();
    });

    it("shows sync status '— disabled' for rows with no mapping", () => {
      render(<RoleMappingTable {...defaultProps} roleMappings={[]} />);

      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBe(6); // one per role type
    });

    it("shows '✓ Synced' for enabled rows without hierarchy violation", () => {
      render(<RoleMappingTable {...defaultProps} />);

      expect(screen.getByText("✓ Synced")).toBeInTheDocument();
    });

    it("shows footer note about reconciliation schedule", () => {
      render(<RoleMappingTable {...defaultProps} />);

      expect(
        screen.getByText(/Reconciliation runs every 15 min/i)
      ).toBeInTheDocument();
    });
  });

  describe("toggle interaction", () => {
    it("shows error toast and rolls back when toggle action fails", async () => {
      mockToggleRoleMappingAction.mockResolvedValueOnce({
        success: false,
        error: "Permission denied",
      });

      const user = userEvent.setup();
      render(<RoleMappingTable {...defaultProps} />);

      // The staff row is enabled — toggle it off
      const switches = screen.getAllByRole("switch");
      await user.click(switches[0]!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Permission denied");
      });
    });

    it("calls toggleRoleMappingAction with correct args", async () => {
      const user = userEvent.setup();
      render(<RoleMappingTable {...defaultProps} />);

      const switches = screen.getAllByRole("switch");
      await user.click(switches[0]!);

      await waitFor(() => {
        expect(mockToggleRoleMappingAction).toHaveBeenCalledWith(1, false);
      });
    });

    it("shows error when toggling a row with no existing mapping", async () => {
      const user = userEvent.setup();
      // No mappings — so all switches have mappingId = null
      render(<RoleMappingTable {...defaultProps} roleMappings={[]} />);

      const switches = screen.getAllByRole("switch");
      await user.click(switches[0]!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Assign a Discord role before enabling."
        );
      });
    });

    it("toggle works on a freshly-upserted row (no 'Assign a Discord role' error)", async () => {
      mockUpsertRoleMappingAction.mockResolvedValueOnce({
        success: true,
        data: { mappingId: 777 },
      });
      mockToggleRoleMappingAction.mockResolvedValueOnce({
        success: true,
        data: undefined,
      });

      // Stay on the mobile path throughout: Base UI Select does not expose ARIA
      // options in JSDOM, so we drive callbacks directly via the cards stub.
      mockUseIsMobile.mockReturnValue(true);
      capturedOnRoleChange = null;
      capturedOnToggle = null;

      // Start with NO mappings — every row's mappingId is null locally.
      render(<RoleMappingTable {...defaultProps} roleMappings={[]} />);

      // The cards stub captured onRoleChange. Call it to simulate the user
      // picking "role-aaa" for the "staff" role type. This triggers
      // upsertRoleMappingAction and — on resolve — patches mappingId=777.
      expect(capturedOnRoleChange).not.toBeNull();
      capturedOnRoleChange!("staff", "role-aaa");

      // Wait for the upsert action to resolve and patch state.
      await waitFor(() => {
        expect(mockUpsertRoleMappingAction).toHaveBeenCalledWith({
          communityId: 42,
          roleType: "staff",
          discordRoleId: "role-aaa",
        });
      });

      // The cards stub is re-rendered with the updated rows, so capturedOnToggle
      // is refreshed. Call it to simulate toggling the staff row off. The
      // mappingId is now 777 (patched above), so toggleRoleMappingAction must
      // be called with 777, not trip the null guard.
      expect(capturedOnToggle).not.toBeNull();
      capturedOnToggle!("staff", false);

      await waitFor(() => {
        expect(mockToggleRoleMappingAction).toHaveBeenCalledWith(777, false);
      });
      expect(toast.error).not.toHaveBeenCalledWith(
        "Assign a Discord role before enabling."
      );
    });
  });

  describe("conditional mount", () => {
    it("renders skeleton when isClient is false", () => {
      mockUseIsClient.mockReturnValue(false);
      mockUseIsMobile.mockReturnValue(false);
      render(<RoleMappingTable {...defaultProps} />);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("role-mapping-cards")
      ).not.toBeInTheDocument();
    });

    it("renders desktop table when isClient is true and isMobile is false", () => {
      mockUseIsClient.mockReturnValue(true);
      mockUseIsMobile.mockReturnValue(false);
      render(<RoleMappingTable {...defaultProps} />);
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(
        screen.queryByTestId("role-mapping-cards")
      ).not.toBeInTheDocument();
    });

    it("renders mobile cards when isClient is true and isMobile is true", () => {
      mockUseIsClient.mockReturnValue(true);
      mockUseIsMobile.mockReturnValue(true);
      render(<RoleMappingTable {...defaultProps} />);
      expect(screen.getByTestId("role-mapping-cards")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });
});
