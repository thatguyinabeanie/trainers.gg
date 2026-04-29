/**
 * Tests for RoleMappingCards
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("../picker-refresh-button", () => ({
  PickerRefreshButton: ({ serverId }: { serverId: number }) => (
    <button data-testid={`refresh-${serverId}`} type="button">
      Refresh
    </button>
  ),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) =>
    args
      .filter((a) => typeof a === "string")
      .join(" ")
      .trim(),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { RoleMappingCards } from "../role-mapping-cards";
import { type RoleMappingInnerProps, type RoleRowState } from "../role-mapping-table";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<RoleRowState> = {}): RoleRowState {
  return {
    roleType: "staff",
    mappingId: 1,
    enabled: true,
    discordRoleId: "role-aaa",
    ...overrides,
  };
}

const guildRoles = [
  { id: "role-aaa", name: "Moderator", managed: false, position: 2 },
  { id: "role-bbb", name: "Member", managed: false, position: 1 },
] as never[];

function makeProps(
  overrides: Partial<RoleMappingInnerProps> = {}
): RoleMappingInnerProps {
  return {
    rows: [makeRow()],
    guildRoles,
    serverId: 10,
    hasHierarchyViolation: false,
    onToggle: jest.fn(),
    onRoleChange: jest.fn(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("RoleMappingCards", () => {
  it("renders one card per row with the role label", () => {
    render(<RoleMappingCards {...makeProps()} />);
    expect(screen.getByText("Staff")).toBeInTheDocument();
    expect(
      screen.getByText("Community leaders + event staff")
    ).toBeInTheDocument();
  });

  it("renders all 5 role types when all rows are provided", () => {
    const rows: RoleRowState[] = [
      makeRow({ roleType: "staff" }),
      makeRow({ roleType: "member", mappingId: 2, discordRoleId: "role-bbb" }),
      makeRow({ roleType: "participant", mappingId: null, enabled: false, discordRoleId: "" }),
      makeRow({ roleType: "winner", mappingId: null, enabled: false, discordRoleId: "" }),
      makeRow({ roleType: "currently_playing", mappingId: null, enabled: false, discordRoleId: "" }),
    ];
    render(<RoleMappingCards {...makeProps({ rows })} />);
    expect(screen.getByText("Staff")).toBeInTheDocument();
    expect(screen.getByText("Member")).toBeInTheDocument();
    expect(screen.getByText("Participant")).toBeInTheDocument();
    expect(screen.getByText("Winner")).toBeInTheDocument();
    expect(screen.getByText("Currently playing")).toBeInTheDocument();
  });

  it("renders 🏆 emoji for the winner role", () => {
    render(
      <RoleMappingCards
        {...makeProps({
          rows: [
            makeRow({
              roleType: "winner",
              mappingId: 5,
              enabled: false,
              discordRoleId: "",
            }),
          ],
        })}
      />
    );
    const card = screen.getByText("Winner").closest("div")!;
    expect(card.textContent).toContain("🏆");
  });

  it("renders a Switch for each row", () => {
    render(
      <RoleMappingCards
        {...makeProps({
          rows: [makeRow(), makeRow({ roleType: "member", mappingId: 2, discordRoleId: "role-bbb" })],
        })}
      />
    );
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBe(2);
  });

  it("calls onToggle with roleType and new value when Switch is clicked", () => {
    const onToggle = jest.fn();
    render(<RoleMappingCards {...makeProps({ onToggle })} />);
    const sw = screen.getByRole("switch");
    fireEvent.click(sw);
    expect(onToggle).toHaveBeenCalledWith("staff", false);
  });

  it("renders sync status — for disabled rows", () => {
    render(
      <RoleMappingCards
        {...makeProps({
          rows: [makeRow({ enabled: false, discordRoleId: "" })],
        })}
      />
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders ✓ Synced for enabled rows with no hierarchy violation", () => {
    render(<RoleMappingCards {...makeProps()} />);
    expect(screen.getByText("✓ Synced")).toBeInTheDocument();
  });

  it("renders ⚠ Hierarchy when hasHierarchyViolation is true", () => {
    render(
      <RoleMappingCards {...makeProps({ hasHierarchyViolation: true })} />
    );
    expect(screen.getByText("⚠ Hierarchy")).toBeInTheDocument();
  });

  it("renders PickerRefreshButton for each row", () => {
    render(
      <RoleMappingCards
        {...makeProps({
          rows: [makeRow(), makeRow({ roleType: "member", mappingId: 2, discordRoleId: "role-bbb" })],
        })}
      />
    );
    const refreshBtns = screen.getAllByTestId("refresh-10");
    expect(refreshBtns.length).toBe(2);
  });
});
