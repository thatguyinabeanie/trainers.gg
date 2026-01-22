"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseQuery } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSiteAdmins, getSiteRoles } from "@trainers/supabase";

export default function SiteRolesPage() {
  const { data: siteRoles, isLoading: rolesLoading } = useSupabaseQuery(
    async (supabase) => getSiteRoles(supabase),
    []
  );

  const { data: siteAdmins, isLoading: adminsLoading } = useSupabaseQuery(
    async (supabase) => getSiteAdmins(supabase),
    []
  );

  const isLoading = rolesLoading || adminsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Site Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Site Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Scope</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {siteRoles?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {role.description ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{role.scope}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {siteRoles?.length === 0 && (
            <div className="text-muted-foreground py-8 text-center">
              No site roles defined
            </div>
          )}
        </CardContent>
      </Card>

      {/* Site Admins */}
      <Card>
        <CardHeader>
          <CardTitle>Site Administrators</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Granted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {siteAdmins?.map((admin) => {
                // Handle the user relationship
                const user =
                  admin.user && typeof admin.user === "object"
                    ? (admin.user as {
                        id: string;
                        email: string | null;
                        username: string | null;
                        first_name: string | null;
                        last_name: string | null;
                        image: string | null;
                      })
                    : null;
                const role =
                  admin.role && typeof admin.role === "object"
                    ? (admin.role as {
                        id: number;
                        name: string;
                        scope: string;
                      })
                    : null;

                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.image ?? undefined} />
                          <AvatarFallback>
                            {user?.username?.charAt(0).toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user?.first_name} {user?.last_name}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            @{user?.username}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user?.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{role?.name}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {admin.created_at
                        ? new Date(admin.created_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {siteAdmins?.length === 0 && (
            <div className="text-muted-foreground py-8 text-center">
              No site administrators assigned
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
