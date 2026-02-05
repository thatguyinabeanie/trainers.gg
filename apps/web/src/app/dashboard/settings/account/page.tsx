"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Lock } from "lucide-react";

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const email = user?.email ?? "";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>Your account email address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="text-muted-foreground h-5 w-5" />
            <span className="text-sm">{email}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Password</p>
                <p className="text-muted-foreground text-xs">
                  Change your account password
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
