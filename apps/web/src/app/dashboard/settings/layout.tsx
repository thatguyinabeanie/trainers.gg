"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Shield } from "lucide-react";

const tabs = [
  { href: "/dashboard/settings/profile", label: "Profile", icon: User },
  { href: "/dashboard/settings/account", label: "Account", icon: Shield },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="border-b">
        <nav className="flex gap-0">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
