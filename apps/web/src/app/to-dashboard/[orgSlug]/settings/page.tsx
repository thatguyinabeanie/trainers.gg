import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, Clock } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Organization Settings</h2>
        <p className="text-muted-foreground text-sm">
          Configure your organization&apos;s settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            Organization settings are currently in development
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Settings className="text-muted-foreground mb-4 h-16 w-16" />
          <h3 className="mb-2 text-lg font-semibold">Settings Coming Soon</h3>
          <p className="text-muted-foreground max-w-md text-center">
            Soon you&apos;ll be able to customize your organization&apos;s
            profile, branding, notification preferences, and more. Stay tuned!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
