import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Shield,
  Activity,
  Mail,
  Building2,
  Settings,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

const adminCards = [
  {
    href: "/admin/users",
    title: "User Management",
    description: "Search, suspend, impersonate, and manage user roles",
    icon: Users,
  },
  {
    href: "/admin/organizations",
    title: "Organizations",
    description: "Approve, reject, suspend, and manage organizations",
    icon: Building2,
  },
  {
    href: "/admin/activity",
    title: "System Activity",
    description: "View audit logs, sudo sessions, and platform events",
    icon: Activity,
  },
  {
    href: "/admin/config",
    title: "Platform Config",
    description: "Feature flags, announcements, and maintenance mode",
    icon: Settings,
  },
  {
    href: "/admin/analytics",
    title: "Analytics",
    description: "User growth, tournament stats, and invite metrics",
    icon: BarChart3,
  },
  {
    href: "/admin/site-roles",
    title: "Site Roles",
    description: "Manage site-wide roles and permissions",
    icon: Shield,
  },
  {
    href: "/admin/invites",
    title: "Beta Invites",
    description: "Send invites and manage the waitlist",
    icon: Mail,
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        {adminCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="hover:border-primary/50 h-full transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <card.icon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-xs">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
