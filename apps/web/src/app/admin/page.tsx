import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, Activity, Mail } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/admin/users">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                User Management
              </CardTitle>
              <Users className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                View and manage all registered users
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/site-roles">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Site Roles</CardTitle>
              <Shield className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                Manage site-wide roles and permissions
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/invites">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Beta Invites
              </CardTitle>
              <Mail className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                Send invites and manage the waitlist
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              System Activity
            </CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              View system logs and activity (coming soon)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
