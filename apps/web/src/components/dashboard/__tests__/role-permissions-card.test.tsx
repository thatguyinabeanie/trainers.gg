import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";

// lucide-react icons used inside PermissionCell
jest.mock("lucide-react", () => ({
  Check: ({ className }: { className?: string }) => (
    <svg data-testid="icon-check" className={className} />
  ),
  Minus: ({ className }: { className?: string }) => (
    <svg data-testid="icon-minus" className={className} />
  ),
}));

import { RolePermissionsCard } from "../role-permissions-card";

// The 6 permission labels defined in ROLE_PERMISSIONS
const PERMISSION_LABELS = [
  "Create tournaments",
  "Manage tournament settings",
  "Start/advance rounds",
  "Report match results",
  "Invite staff",
  "Manage staff roles",
] as const;

describe("RolePermissionsCard", () => {
  describe("column headers", () => {
    it("renders the Admin column header", () => {
      render(<RolePermissionsCard />);
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("renders the Head Judge column header", () => {
      render(<RolePermissionsCard />);
      expect(screen.getByText("Head Judge")).toBeInTheDocument();
    });

    it("renders the Judge column header", () => {
      render(<RolePermissionsCard />);
      expect(screen.getByText("Judge")).toBeInTheDocument();
    });

    it("renders the Permission column header", () => {
      render(<RolePermissionsCard />);
      expect(screen.getByText("Permission")).toBeInTheDocument();
    });
  });

  describe("permission rows", () => {
    it.each(PERMISSION_LABELS)("renders the '%s' permission row", (label) => {
      render(<RolePermissionsCard />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it("renders exactly 6 permission rows", () => {
      render(<RolePermissionsCard />);
      // getAllByRole("row") includes the header row and 6 data rows = 7 total
      const rows = screen.getAllByRole("row");
      // Subtract 1 for the header row
      expect(rows).toHaveLength(7);
    });
  });

  describe("checkmarks for allowed permissions", () => {
    it("shows a check icon for Admin on every permission row", () => {
      render(<RolePermissionsCard />);
      // Admin has access to all 6 permissions
      const checkIcons = screen.getAllByTestId("icon-check");
      expect(checkIcons.length).toBeGreaterThanOrEqual(6);
    });

    it("shows a check icon for Head Judge on 'Report match results'", () => {
      render(<RolePermissionsCard />);
      const row = screen.getByText("Report match results").closest("tr");
      expect(row).not.toBeNull();
      const checks = within(row!).getAllByTestId("icon-check");
      // Admin + Head Judge + Judge all have this permission
      expect(checks).toHaveLength(3);
    });

    it("shows a check for Head Judge on 'Manage tournament settings'", () => {
      render(<RolePermissionsCard />);
      const row = screen.getByText("Manage tournament settings").closest("tr");
      const checks = within(row!).getAllByTestId("icon-check");
      // Admin + Head Judge
      expect(checks).toHaveLength(2);
    });
  });

  describe("dashes for disallowed permissions", () => {
    it("shows a minus icon for Judge on 'Create tournaments'", () => {
      render(<RolePermissionsCard />);
      const row = screen.getByText("Create tournaments").closest("tr");
      const minusIcons = within(row!).getAllByTestId("icon-minus");
      // Head Judge + Judge both cannot create tournaments
      expect(minusIcons).toHaveLength(2);
    });

    it("shows a minus icon for Judge on 'Invite staff'", () => {
      render(<RolePermissionsCard />);
      const row = screen.getByText("Invite staff").closest("tr");
      const minusIcons = within(row!).getAllByTestId("icon-minus");
      // Head Judge + Judge cannot invite staff
      expect(minusIcons).toHaveLength(2);
    });

    it("shows a minus icon for Judge on 'Manage staff roles'", () => {
      render(<RolePermissionsCard />);
      const row = screen.getByText("Manage staff roles").closest("tr");
      const minusIcons = within(row!).getAllByTestId("icon-minus");
      // Head Judge + Judge cannot manage staff roles
      expect(minusIcons).toHaveLength(2);
    });
  });

  describe("footer", () => {
    it("renders the owner full access note", () => {
      render(<RolePermissionsCard />);
      expect(
        screen.getByText("Owner has full access to all permissions.")
      ).toBeInTheDocument();
    });
  });

  describe("card label", () => {
    it("renders the Role Permissions card label", () => {
      render(<RolePermissionsCard />);
      expect(screen.getByText("Role Permissions")).toBeInTheDocument();
    });
  });
});
