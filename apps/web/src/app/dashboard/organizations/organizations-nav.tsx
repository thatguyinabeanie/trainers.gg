"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const subTabs = [
  { href: "/dashboard/organizations/active", label: "Active" },
  { href: "/dashboard/organizations/requests", label: "Requests" },
  { href: "/dashboard/organizations/invitations", label: "Invitations" },
  { href: "/dashboard/organizations/info", label: "Info" },
];

export function OrganizationsNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 border-b bg-transparent p-0">
      <div className="flex gap-0">
        {subTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-4 py-2 text-sm transition-colors",
                isActive
                  ? "text-foreground border-amber-500"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
