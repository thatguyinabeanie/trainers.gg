import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Clock } from "lucide-react";

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Staff Management</h2>
        <p className="text-muted-foreground text-sm">
          Manage your organization&apos;s staff and permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            Staff management features are currently in development
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="text-muted-foreground mb-4 h-16 w-16" />
          <h3 className="mb-2 text-lg font-semibold">
            Staff Management Coming Soon
          </h3>
          <p className="text-muted-foreground max-w-md text-center">
            Soon you&apos;ll be able to invite staff, assign roles, and manage
            permissions for your organization. Stay tuned!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
