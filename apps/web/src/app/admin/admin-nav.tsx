"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/config", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 border-b">
      <div className="-mb-px flex gap-6 overflow-x-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground border-transparent"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
