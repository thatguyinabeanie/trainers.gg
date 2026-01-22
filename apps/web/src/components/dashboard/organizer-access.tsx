"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import Link from "next/link";

interface OrganizerAccessProps {
  organizations: Array<{
    id: number;
    name: string;
    role: string;
  }>;
}

export function OrganizerAccess({ organizations }: OrganizerAccessProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5" />
          Tournament Organizer Access
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Your roles and permissions within organizations
        </p>
      </CardHeader>
      <CardContent>
        {organizations.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4 text-sm">
              Need tournament hosting permissions?
            </p>
            <Link href="/organizations/create">
              <Button variant="outline" size="sm">
                Request Organizer Role
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{org.name}</p>
                  <Badge variant="secondary" className="mt-1">
                    {org.role}
                  </Badge>
                </div>
                <Badge className="bg-green-500 text-white hover:bg-green-600">
                  Active
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
