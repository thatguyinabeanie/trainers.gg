"use client";

import { useCallback } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useSupabaseQuery } from "@/lib/supabase";
import { listMyOrganizations } from "@trainers/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trophy } from "lucide-react";
import Link from "next/link";

export function ActiveOrganizationsClient() {
  const { user } = useAuth();
  const profileId = user?.profile?.id;

  const queryFn = useCallback(
    (supabase: Parameters<typeof listMyOrganizations>[0]) =>
      profileId ? listMyOrganizations(supabase, profileId) : Promise.resolve([]),
    [profileId]
  );

  const { data: myOrganizations } = useSupabaseQuery(queryFn, [profileId]);

  const ownedOrgs = myOrganizations?.filter((org) => org.isOwner) || [];
  const staffOrgs = myOrganizations?.filter((org) => !org.isOwner) || [];

  return (
    <div className="space-y-4">
      {ownedOrgs.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="size-6" />
            <h3 className="text-sm font-medium">Organizations You Own</h3>
          </div>
          <div className="space-y-4">
            {ownedOrgs.map((org) => (
              <Card key={org.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="bg-muted flex size-12 items-center justify-center rounded-lg text-lg font-bold">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <h4 className="font-semibold">{org.name}</h4>
                          <Badge className="bg-amber-500 text-white hover:bg-amber-600">
                            Owner
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3 text-sm">
                          {org.description ||
                            "Premier community for competitive Pokemon"}
                        </p>
                        <div className="text-muted-foreground flex gap-6 text-xs">
                          <div className="flex items-center gap-1">
                            <Users className="size-3" />
                            <span>Members</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="size-3" />
                            <span>Tournaments</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Link href={`/${org.slug}`}>
                    <Button variant="ghost" size="sm" className="mt-4">
                      Manage
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {staffOrgs.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="size-6" />
            <h3 className="text-sm font-medium">
              Organizations Where You&apos;re Staff
            </h3>
          </div>
          <div className="space-y-4">
            {staffOrgs.map((org) => (
              <Card key={org.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="bg-muted flex size-12 items-center justify-center rounded-lg text-lg font-bold">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <h4 className="font-semibold">{org.name}</h4>
                          <Badge className="bg-blue-500 text-white hover:bg-blue-600">
                            Staff
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3 text-sm">
                          {org.description ||
                            "Elite VGC tournament organization"}
                        </p>
                        <div className="text-muted-foreground flex gap-6 text-xs">
                          <div className="flex items-center gap-1">
                            <Users className="size-3" />
                            <span>Members</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="size-3" />
                            <span>Tournaments</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Link href={`/${org.slug}`}>
                    <Button variant="ghost" size="sm" className="mt-4">
                      View
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {ownedOrgs.length === 0 && staffOrgs.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No organizations yet</p>
        </div>
      )}
    </div>
  );
}
