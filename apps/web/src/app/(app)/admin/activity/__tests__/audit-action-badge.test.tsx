import { render, screen } from "@testing-library/react";

jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => <span className={className}>{children}</span>,
}));

import {
  AuditActionBadge,
  getActionLabel,
  getActionPrefix,
} from "../audit-action-badge";
import type { Database } from "@trainers/supabase";

type AuditAction = Database["public"]["Enums"]["audit_action"];

describe("getActionLabel", () => {
  it.each([
    ["match.score_submitted" as AuditAction, "Score Submitted"],
    ["match.score_agreed" as AuditAction, "Score Agreed"],
    ["match.score_disputed" as AuditAction, "Score Disputed"],
    ["match.result_reported" as AuditAction, "Result Reported"],
    ["match.staff_requested" as AuditAction, "Judge Called"],
    ["match.staff_resolved" as AuditAction, "Judge Resolved"],
    ["judge.game_reset" as AuditAction, "Game Reset"],
    ["judge.match_reset" as AuditAction, "Match Reset"],
    ["judge.game_override" as AuditAction, "Game Override"],
    ["judge.match_override" as AuditAction, "Match Override"],
    ["tournament.started" as AuditAction, "Tournament Started"],
    ["tournament.round_created" as AuditAction, "Round Created"],
    ["tournament.round_started" as AuditAction, "Round Started"],
    ["tournament.round_completed" as AuditAction, "Round Completed"],
    ["tournament.phase_advanced" as AuditAction, "Phase Advanced"],
    ["tournament.completed" as AuditAction, "Tournament Completed"],
    ["team.submitted" as AuditAction, "Team Submitted"],
    ["team.locked" as AuditAction, "Team Locked"],
    ["team.unlocked" as AuditAction, "Team Unlocked"],
    ["registration.checked_in" as AuditAction, "Checked In"],
    ["registration.dropped" as AuditAction, "Player Dropped"],
    ["registration.late_checkin" as AuditAction, "Late Check-In"],
    ["admin.sudo_activated" as AuditAction, "Sudo Activated"],
    ["admin.sudo_deactivated" as AuditAction, "Sudo Deactivated"],
    ["admin.user_suspended" as AuditAction, "User Suspended"],
    ["admin.user_unsuspended" as AuditAction, "User Unsuspended"],
    ["admin.role_granted" as AuditAction, "Role Granted"],
    ["admin.role_revoked" as AuditAction, "Role Revoked"],
    ["admin.impersonation_started" as AuditAction, "Impersonation Started"],
    ["admin.impersonation_ended" as AuditAction, "Impersonation Ended"],
    ["admin.org_approved" as AuditAction, "Org Approved"],
    ["admin.org_rejected" as AuditAction, "Org Rejected"],
    ["admin.org_suspended" as AuditAction, "Org Suspended"],
    ["admin.org_unsuspended" as AuditAction, "Org Unsuspended"],
    [
      "admin.org_ownership_transferred" as AuditAction,
      "Org Ownership Transferred",
    ],
    ["admin.flag_created" as AuditAction, "Flag Created"],
    ["admin.flag_toggled" as AuditAction, "Flag Toggled"],
    ["admin.flag_deleted" as AuditAction, "Flag Deleted"],
    ["admin.announcement_created" as AuditAction, "Announcement Created"],
    ["admin.announcement_updated" as AuditAction, "Announcement Updated"],
    ["admin.announcement_deleted" as AuditAction, "Announcement Deleted"],
    ["admin.org_request_approved" as AuditAction, "Org Request Approved"],
    ["admin.org_request_rejected" as AuditAction, "Org Request Rejected"],
    ["admin.org_request_cancelled" as AuditAction, "Org Request Cancelled"],
  ])("returns '%s' for action %s", (action, expected) => {
    expect(getActionLabel(action)).toBe(expected);
  });
});

describe("getActionPrefix", () => {
  it.each([
    ["match.score_submitted" as AuditAction, "match"],
    ["judge.game_reset" as AuditAction, "judge"],
    ["tournament.started" as AuditAction, "tournament"],
    ["admin.sudo_activated" as AuditAction, "admin"],
    ["team.submitted" as AuditAction, "team"],
    ["registration.checked_in" as AuditAction, "registration"],
  ])("returns '%s' prefix for action %s", (action, expected) => {
    expect(getActionPrefix(action)).toBe(expected);
  });
});

describe("AuditActionBadge", () => {
  it("renders the human-readable label", () => {
    render(<AuditActionBadge action="match.score_submitted" />);
    expect(screen.getByText("Score Submitted")).toBeInTheDocument();
  });

  it("applies blue color class for match.* actions", () => {
    render(<AuditActionBadge action="match.score_agreed" />);
    const badge = screen.getByText("Score Agreed");
    expect(badge.className).toContain("bg-blue-500/10");
    expect(badge.className).toContain("text-blue-700");
  });

  it("applies purple color class for judge.* actions", () => {
    render(<AuditActionBadge action="judge.game_reset" />);
    const badge = screen.getByText("Game Reset");
    expect(badge.className).toContain("bg-purple-500/10");
    expect(badge.className).toContain("text-purple-700");
  });

  it("applies green color class for tournament.* actions", () => {
    render(<AuditActionBadge action="tournament.started" />);
    const badge = screen.getByText("Tournament Started");
    expect(badge.className).toContain("bg-emerald-500/10");
  });

  it("applies red color class for admin.* actions", () => {
    render(<AuditActionBadge action="admin.sudo_activated" />);
    const badge = screen.getByText("Sudo Activated");
    expect(badge.className).toContain("bg-red-500/10");
  });

  it("applies amber color class for team.* actions", () => {
    render(<AuditActionBadge action="team.submitted" />);
    const badge = screen.getByText("Team Submitted");
    expect(badge.className).toContain("bg-amber-500/10");
  });

  it("applies teal color class for registration.* actions", () => {
    render(<AuditActionBadge action="registration.checked_in" />);
    const badge = screen.getByText("Checked In");
    expect(badge.className).toContain("bg-teal-500/10");
  });

  it("merges additional className prop", () => {
    render(
      <AuditActionBadge
        action="match.score_submitted"
        className="extra-class"
      />
    );
    const badge = screen.getByText("Score Submitted");
    expect(badge.className).toContain("extra-class");
  });
});
