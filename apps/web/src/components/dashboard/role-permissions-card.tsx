import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

const ROLE_PERMISSIONS = [
  { label: "Create tournaments", admin: true, headJudge: false, judge: false },
  {
    label: "Manage tournament settings",
    admin: true,
    headJudge: true,
    judge: false,
  },
  {
    label: "Start/advance rounds",
    admin: true,
    headJudge: true,
    judge: false,
  },
  {
    label: "Report match results",
    admin: true,
    headJudge: true,
    judge: true,
  },
  { label: "Invite staff", admin: true, headJudge: false, judge: false },
  { label: "Manage staff roles", admin: true, headJudge: false, judge: false },
  { label: "View team sheets", admin: true, headJudge: true, judge: true },
] as const;

function PermissionCell({ allowed }: { allowed: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        allowed ? "text-primary" : "text-muted-foreground"
      )}
    >
      {allowed ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
    </span>
  );
}

export function RolePermissionsCard() {
  return (
    <DashboardCard label="Role Permissions">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="pb-2 text-left font-medium">Permission</th>
              <th className="text-muted-foreground w-16 pb-2 text-center text-xs font-medium">
                Admin
              </th>
              <th className="text-muted-foreground w-20 pb-2 text-center text-xs font-medium">
                Head Judge
              </th>
              <th className="text-muted-foreground w-14 pb-2 text-center text-xs font-medium">
                Judge
              </th>
            </tr>
          </thead>
          <tbody>
            {ROLE_PERMISSIONS.map((row) => (
              <tr
                key={row.label}
                className="border-border border-b last:border-0"
              >
                <td className="py-2 pr-4 text-sm">{row.label}</td>
                <td className="py-2 text-center">
                  <PermissionCell allowed={row.admin} />
                </td>
                <td className="py-2 text-center">
                  <PermissionCell allowed={row.headJudge} />
                </td>
                <td className="py-2 text-center">
                  <PermissionCell allowed={row.judge} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground mt-3 text-sm">
        Owner has full access to all permissions.
      </p>
    </DashboardCard>
  );
}
