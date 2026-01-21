import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationsNav } from "./organizations-nav";

export default function OrganizationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Organizations</h2>
        <Link href="/organizations/create">
          <Button size="sm">
            <Plus className="mr-2 size-4" />
            Request Organization
          </Button>
        </Link>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Manage your tournament organizations and staff roles
      </p>
      <OrganizationsNav />
      {children}
    </div>
  );
}
