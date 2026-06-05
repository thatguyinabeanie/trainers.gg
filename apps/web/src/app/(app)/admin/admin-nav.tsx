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
      {/* Wrap to multiple rows on phones (7 tabs don't fit a 390px row);
          single row on sm+ where they fit. Wrapping is the robust fix —
          horizontal-scroll wrappers didn't reliably clamp the page width here. */}
      <div className="-mb-px flex flex-wrap gap-x-6 gap-y-1 sm:flex-nowrap">
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
