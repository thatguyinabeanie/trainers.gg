"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/coaches", label: "Coaches" },
  { href: "/admin/communities", label: "Communities" },
  { href: "/admin/data", label: "Data" },
  { href: "/admin/usage", label: "Usage" },
  { href: "/admin/config", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 border-b">
      {/* Scroll-wrapper (block) clamps to the viewport; the inner flex row can
          exceed it and scrolls horizontally on phones. overflow-x-auto must be
          on this wrapper, NOT on the flex row, or the row won't clamp. */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="-mb-px flex gap-6 overflow-hidden sm:overflow-visible">
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
      </div>
    </nav>
  );
}
